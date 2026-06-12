'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getFcmMessaging } from '@/lib/firebase/client';
import { getToken } from 'firebase/messaging';
import TopBar from '@/components/TopBar';
import { Settings as SettingsIcon, BellRing, Smartphone, Check, User, Link as LinkIcon, HardDrive, Cpu, MemoryStick, Clock } from 'lucide-react';

interface AlertSettings {
  cpu_threshold: number;
  ram_threshold: number;
  disk_threshold: number;
  offline_timeout_sec: number;
  notifications_enabled: boolean;
  discord_webhook_url?: string;
  telegram_webhook_url?: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [profileName, setProfileName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const [settings, setSettings] = useState<AlertSettings>({
    cpu_threshold: 90,
    ram_threshold: 90,
    disk_threshold: 95,
    offline_timeout_sec: 300,
    notifications_enabled: true,
    discord_webhook_url: '',
    telegram_webhook_url: '',
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
      if (profileData) {
        setProfile(profileData);
        setProfileName(profileData.full_name || '');
      }

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
          discord_webhook_url: settings.discord_webhook_url || null,
          telegram_webhook_url: settings.telegram_webhook_url || null,
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      // Update name if changed
      if (profileName !== profile?.full_name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: profileName })
          .eq('id', session.user.id);
        
        if (profileError) throw profileError;
        setProfile({ full_name: profileName });
      }

      // Update password if provided
      if (newPassword) {
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (authError) throw authError;
        setNewPassword(''); // clear password field after success
      }

      setProfileMsg({ type: 'success', text: 'Account updated successfully!' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update account' });
    } finally {
      setUpdatingProfile(false);
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

      // 3. Register service worker explicitly and get token
      const apiKey = encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '');
      const projectId = encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '');
      const messagingSenderId = encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '');
      const appId = encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '');
      
      const swUrl = `/firebase-messaging-sw.js?apiKey=${apiKey}&projectId=${projectId}&messagingSenderId=${messagingSenderId}&appId=${appId}`;
      const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      await navigator.serviceWorker.ready;
      
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
        alert('Success! Mobile Push notifications activated on this device.');
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

      <div className="page-container">
        {loading ? (
          <div className="text-[15px] font-medium text-texts animate-pulse py-10">
            Querying configuration profiles...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left side: Alert thresholds and settings form */}
            <form onSubmit={handleSaveSettings} className="lg:col-span-2 glass-card p-8 flex flex-col gap-6">
              <div className="border-b border-borderg pb-4 mb-2">
                <h3 className="text-[17px] font-semibold text-textp flex items-center gap-2 tracking-tight">
                  <SettingsIcon size={18} className="text-texts" /> Alert Threshold Configuration
                </h3>
                <p className="text-[13px] text-texts mt-1 leading-relaxed">
                  Define metrics thresholds that will trigger critical alerts and mobile push events.
                </p>
              </div>
              
              {saveSuccess && (
                <div className="bg-online/10 border border-online/20 text-online px-4 py-3 rounded-lg text-[13px] flex items-center gap-2">
                  <Check size={16} /> Settings updated successfully!
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-texts uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={14} /> CPU Utilization Threshold (%)
                  </label>
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

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-texts uppercase tracking-wider flex items-center gap-1.5">
                    <MemoryStick size={14} /> Memory Utilization Threshold (%)
                  </label>
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

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-texts uppercase tracking-wider flex items-center gap-1.5">
                    <HardDrive size={14} /> Disk Capacity Threshold (%)
                  </label>
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

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-texts uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} /> Offline Grace Timeout (Sec)
                  </label>
                  <input
                    type="number"
                    className="glass-input"
                    min="30"
                    value={settings.offline_timeout_sec}
                    onChange={(e) => setSettings({ ...settings, offline_timeout_sec: Number(e.target.value) })}
                    required
                  />
                  <span className="text-[11px] text-textm">Amount of time of missing telemetry before declaring the server offline.</span>
                </div>
              </div>

              <div className="mt-4 border-t border-borderg pt-6">
                <h4 className="text-[14px] font-semibold text-textp mb-4 flex items-center gap-2">
                  <LinkIcon size={16} /> Webhook Integrations
                </h4>
                
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-texts uppercase tracking-wider">Discord Webhook URL</label>
                    <input
                      type="url"
                      className="glass-input"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={settings.discord_webhook_url || ''}
                      onChange={(e) => setSettings({ ...settings, discord_webhook_url: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-texts uppercase tracking-wider">Telegram Webhook URL</label>
                    <input
                      type="url"
                      className="glass-input"
                      placeholder="https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>"
                      value={settings.telegram_webhook_url || ''}
                      onChange={(e) => setSettings({ ...settings, telegram_webhook_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3 bg-hover p-4 rounded-lg border border-borderg">
                <input
                  type="checkbox"
                  id="notifications_enabled"
                  checked={settings.notifications_enabled}
                  onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                  className="w-4 h-4 cursor-pointer rounded border-borderg text-online focus:ring-online"
                />
                <label htmlFor="notifications_enabled" className="text-[14px] font-medium text-textp cursor-pointer select-none">
                  Enable Alert Notifications globally
                </label>
              </div>

              <button type="submit" className="btn-primary self-start mt-2" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </form>

            {/* Right side: Push Notification Registration and profile info */}
            <div className="flex flex-col gap-8">
              <div className="glass-card p-6 flex flex-col gap-5">
                <div>
                  <h3 className="text-[15px] font-semibold text-textp flex items-center gap-2 mb-1 tracking-tight">
                    <Smartphone size={16} className="text-texts" /> Mobile Push Alerts
                  </h3>
                  <p className="text-[13px] text-texts leading-relaxed">
                    Connect this device to receive instant FCM notifications whenever thresholds are breached.
                  </p>
                </div>
                
                <div className="bg-hover border border-borderg rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[12px] font-medium">
                    <span className="text-texts">Browser Permission:</span>
                    <strong className={
                      fcmStatus === 'granted' ? 'text-online' : fcmStatus === 'denied' ? 'text-critical' : 'text-warning'
                    }>
                      {fcmStatus.toUpperCase()}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[12px] font-medium border-t border-borderg pt-3">
                    <span className="text-texts">Registration Status:</span>
                    <strong className={registeredToken ? 'text-online' : 'text-textm'}>
                      {registeredToken ? 'CONNECTED' : 'NOT CONNECTED'}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={enablePushNotifications}
                  disabled={fcmLoading || fcmStatus === 'denied'}
                  className="btn-secondary w-full"
                >
                  <BellRing size={16} />
                  {fcmLoading ? 'Connecting...' : registeredToken ? 'Refresh Connection' : 'Enable Device'}
                </button>

                {fcmStatus === 'denied' && (
                  <p className="text-[12px] text-critical leading-relaxed text-center bg-critical/10 p-3 rounded-lg border border-critical/20">
                    Push notifications are blocked. Please reset site permissions in your browser address bar to allow alerts.
                  </p>
                )}
              </div>

              <form onSubmit={handleUpdateProfile} className="glass-card p-6 flex flex-col gap-5">
                <h3 className="text-[15px] font-semibold text-textp flex items-center gap-2 mb-1 tracking-tight">
                  <User size={16} className="text-texts" /> Account & Security
                </h3>
                
                <p className="text-[13px] text-texts leading-relaxed -mt-3">
                  Update your display name or change your password.
                </p>

                {profileMsg && (
                  <div className={`px-4 py-3 rounded-lg text-[13px] flex items-center gap-2 ${profileMsg.type === 'success' ? 'bg-online/10 text-online border border-online/20' : 'bg-critical/10 text-critical border border-critical/20'}`}>
                    {profileMsg.type === 'success' && <Check size={16} />}
                    {profileMsg.text}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-texts uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-texts uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    className="glass-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </div>

                <button type="submit" className="btn-secondary w-full mt-2" disabled={updatingProfile}>
                  {updatingProfile ? 'Updating...' : 'Update Account'}
                </button>
              </form>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
