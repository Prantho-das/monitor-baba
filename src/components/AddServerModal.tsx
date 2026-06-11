'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function AddServerModal({
  isOpen,
  onClose,
  onServerAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  onServerAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name) {
      setError('Server name is required');
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, hostname }),
      });

      const data = await res.json();
      if (res.ok) {
        onServerAdded();
        setName('');
        setHostname('');
        onClose();
      } else {
        setError(data.error || 'Failed to add server');
      }
    } catch (err: any) {
      setError('Network error occurred. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div className="glass-card" style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>🖥️ Register New Server</h3>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Server Name</label>
            <input
              type="text"
              className="glass-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AWS Production Web Server"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Hostname / Description (Optional)</label>
            <input
              type="text"
              className="glass-input"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="e.g. prod-web-1.example.com"
            />
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} className="btn-secondary" style={styles.btn}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary" style={styles.btn}>
              {loading ? 'Adding...' : 'Register Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    left: 0,
    top: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(3, 3, 15, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 20px 50px rgba(0, 242, 254, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  btn: {
    padding: '10px 20px',
  },
  error: {
    background: 'rgba(255, 75, 43, 0.1)',
    border: '1px solid rgba(255, 75, 43, 0.2)',
    color: '#ff4b2b',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
};
