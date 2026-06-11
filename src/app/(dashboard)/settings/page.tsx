'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getFcmMessaging } from '@/lib/firebase/client';
import { getToken } from 'firebase/messaging';
import TopBar from '@/components/TopBar';

interface AlertSettings {
  cpu_threshold: number;
  ram_threshold: number;
  disk_threshold: number;
  offline_timeout_sec: number;
  notifications_enabled: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [settings, setSettings] = useState<AlertSettings>({
    cpu_threshold: 90,
    ram_threshold: 90,
    disk_threshold: 95,
    offline_timeout_sec: 300,
    notifications_enabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Notification states
  const [fcmLoading, setFcmLoading] = useState(false);
  const [fcmStatus, setFcmStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [registeredToken, setRegisteredToken] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      if (profileData) setProfile(profileData);

      // 2. Fetch Alert Settings
      const { data: settingsData } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (settingsData) setSettings(settingsData);
    } catch (err) {
      console.error('Failed to load user settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (typeof window !== 'undefined') {
      if (!('Notification' in window)) {
        setFcmStatus('unsupported');
      } else {
        setFcmStatus(Notification.permission as any);
      }
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('alert_settings')
        .update({
          cpu_threshold: Number(settings.cpu_threshold),
          ram_threshold: Number(settings.ram_threshold),
          disk_threshold: Number(settings.disk_threshold),
          offline_timeout_sec: Number(settings.offline_timeout_sec),
          notifications_enabled: settings.notifications_enabled,
        })
        .eq('user_id', session.user.id);

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save settings: ' + (err as any).message);
    } finally {
      setSaving(false);
    }
  };

  const enablePushNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Notifications are not supported in this browser.');
      return;
    }

    setFcmLoading(true);

    try {
      // 1. Request Permission
      const permission = await Notification.requestPermission();
      setFcmStatus(permission);

      if (permission !== 'granted') {
        alert('Permission was denied. Please allow notifications in your browser settings.');
        setFcmLoading(false);
        return;
      }

      // 2. Get Firebase messaging instance
      const messaging = await getFcmMessaging();
      if (!messaging) {
        throw new Error('FCM is not supported or configuration is invalid.');
      }

      // 3. Register service worker and get token
      const registration = await navigator.serviceWorker.ready;
      
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        throw new Error('NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing in configuration.');
      }

      const token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey,
      });

      if (!token) {
        throw new Error('Failed to retrieve FCM push token.');
      }

      // 4. Save token to Supabase via backend API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          token,
          deviceInfo: `${navigator.userAgent} (${window.innerWidth}x${window.innerHeight})`,
        }),
      });

      if (res.ok) {
        setRegisteredToken(token);
        alert('🔔 Success! Mobile Push notifications activated on this device.');
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'API token registration failed');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error setting up push notifications: ' + err.message);
    } finally {
      setFcmLoading(false);
    }
  };

  return (
    <>
      <TopBar title="Account & Alert Settings" />

      <div className="page-container" style={styles.container}>
        {loading ? (
          <div style={styles.loadingPulse}>Querying configuration profiles...</div>
        ) : (
          <div style={styles.layoutGrid}>
            
            {/* Left side: Alert thresholds and settings form */}
            <form onSubmit={handleSaveSettings} className="glass-card" style={styles.formCard}>
              <h3 style={styles.sectionTitle}>⚙️ Alert Threshold Configuration</h3>
              <p style={styles.sectionSubtitle}>Define metrics thresholds that will trigger critical alerts and mobile push events.</p>
              
              {saveSuccess && (
                <div style={styles.successAlert}>✓ Settings updated successfully!</div>
              )}

              <div style={styles.fieldGroup}>
                <label style={styles.label}>CPU Utilization Alert Threshold (%)</label>
                <input
                  type="number"
                  className="glass-input"
                  min="1"
                  max="100"
                  value={settings.cpu_threshold}
                  onChange={(e) => setSettings({ ...settings, cpu_threshold: Number(e.target.value) })}
                  required
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Memory Utilization Alert Threshold (%)</label>
                <input
                  type="number"
                  className="glass-input"
                  min="1"
                  max="100"
                  value={settings.ram_threshold}
                  onChange={(e) => setSettings({ ...settings, ram_threshold: Number(e.target.value) })}
                  required
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Disk Capacity Alert Threshold (%)</label>
                <input
                  type="number"
                  className="glass-input"
                  min="1"
                  max="100"
                  value={settings.disk_threshold}
                  onChange={(e) => setSettings({ ...settings, disk_threshold: Number(e.target.value) })}
                  required
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Offline Grace Timeout (Seconds)</label>
                <input
                  type="number"
                  className="glass-input"
                  min="30"
                  value={settings.offline_timeout_sec}
                  onChange={(e) => setSettings({ ...settings, offline_timeout_sec: Number(e.target.value) })}
                  required
                />
                <span style={styles.inputHelp}>Amount of time of missing telemetry before declaring the server offline.</span>
              </div>

              <div style={styles.toggleGroup}>
                <input
                  type="checkbox"
                  id="notifications_enabled"
                  checked={settings.notifications_enabled}
                  onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                  style={styles.checkbox}
                />
                <label htmlFor="notifications_enabled" style={styles.checkboxLabel}>
                  Enable Alert Notifications
                </label>
              </div>

              <button type="submit" className="btn-primary" disabled={saving} style={styles.saveBtn}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </form>

            {/* Right side: Push Notification Registration and profile info */}
            <div style={styles.rightColumn}>
              <div className="glass-card" style={styles.fcmCard}>
                <h3 style={styles.sectionTitle}>🔔 Mobile Push Notifications</h3>
                <p style={styles.sectionSubtitle}>Connect this phone or browser to receive instant FCM notifications whenever thresholds are breached.</p>
                
                <div style={styles.statusBox}>
                  <div style={styles.statusRow}>
                    <span>Browser Permission:</span>
                    <strong style={{
                      color: fcmStatus === 'granted' ? 'var(--color-online)' : fcmStatus === 'denied' ? 'var(--color-critical)' : 'var(--color-warning)'
                    }}>
                      {fcmStatus.toUpperCase()}
                    </strong>
                  </div>
                  <div style={styles.statusRow}>
                    <span>Registration Status:</span>
                    <strong style={{ color: registeredToken ? 'var(--color-online)' : 'var(--text-muted)' }}>
                      {registeredToken ? 'CONNECTED' : 'NOT CONNECTED'}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={enablePushNotifications}
                  disabled={fcmLoading || fcmStatus === 'denied'}
                  className="btn-primary"
                  style={styles.notifyBtn}
                >
                  {fcmLoading ? 'Connecting...' : registeredToken ? 'Refresh Connection' : 'Enable Mobile Notifications'}
                </button>

                {fcmStatus === 'denied' && (
                  <p style={styles.deniedNotice}>
                    Push notifications are blocked. Please reset site permissions in your browser address bar to allow alerts.
                  </p>
                )}
              </div>

              <div className="glass-card" style={styles.profileCard}>
                <h4 style={styles.profileTitle}>User Identity</h4>
                <p style={styles.profileName}>{profile?.full_name || 'Administrator'}</p>
                <div style={styles.profileLabel}>Role: Owner</div>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: '32px',
  },
  formCard: {
    padding: '32px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
  },
  sectionSubtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginTop: '-12px',
    marginBottom: '8px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  inputHelp: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  toggleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '8px 0',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#fff',
    fontWeight: '500',
    cursor: 'pointer',
  },
  saveBtn: {
    alignSelf: 'flex-start',
    padding: '12px 28px',
  },
  successAlert: {
    background: 'rgba(0, 230, 118, 0.1)',
    border: '1px solid rgba(0, 230, 118, 0.2)',
    color: 'var(--color-online)',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '32px',
  },
  fcmCard: {
    padding: '32px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  statusBox: {
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border-glass)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  notifyBtn: {
    width: '100%',
  },
  deniedNotice: {
    fontSize: '12px',
    color: 'var(--color-critical)',
    lineHeight: '1.4',
    textAlign: 'center' as const,
  },
  profileCard: {
    padding: '24px',
    textAlign: 'center' as const,
  },
  profileTitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  profileName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
  },
  profileLabel: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-glass)',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '12px',
  },
  loadingPulse: {
    fontSize: '16px',
    color: 'var(--accent-cyan)',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
    padding: '40px 0',
  },
};

// Handle responsive resizing using media query in JS context for settings grid
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(max-width: 900px)');
  const handleTabletChange = (e: MediaQueryListEvent | MediaQueryList) => {
    if (e.matches) {
      styles.layoutGrid.gridTemplateColumns = '1fr';
    } else {
      styles.layoutGrid.gridTemplateColumns = '1.5fr 1fr';
    }
  };
  mediaQuery.addEventListener('change', handleTabletChange);
  handleTabletChange(mediaQuery);
}
