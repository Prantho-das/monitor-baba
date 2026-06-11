'use client';

import { useState, useEffect } from 'react';

export default function AgentInstaller({ apiKey }: { apiKey: string }) {
  const [appUrl, setAppUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
  }, []);

  const installCommand = `curl -fsSL ${appUrl || 'http://your-app'}/api/agent/install | bash -s -- ${apiKey}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card" style={styles.container}>
      <h3 style={styles.title}>🚀 Easy Agent Installation</h3>
      <p style={styles.description}>
        Run this single command on your server (Debian/Ubuntu/CentOS/Fedora) to automatically install and launch the monitoring agent in the background as a systemd service.
      </p>

      <div style={styles.codeWrapper}>
        <code style={styles.code}>{installCommand}</code>
        <button onClick={copyToClipboard} style={styles.copyBtn} className="btn-secondary">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div style={styles.note}>
        <strong>Note:</strong> Node.js version 18+ is required on your server. The script will attempt to install Node.js automatically if it is missing.
      </div>
    </div>
  );
}

const styles = {
  container: {
    border: '1px dashed var(--border-glass-hover)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    background: 'rgba(0, 242, 254, 0.01)',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  codeWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid var(--border-glass)',
    borderRadius: '8px',
    padding: '8px 8px 8px 16px',
    overflow: 'hidden',
    justifyContent: 'space-between',
    gap: '12px',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: 'var(--accent-cyan)',
    wordBreak: 'break-all' as const,
    whiteSpace: 'pre-wrap' as const,
  },
  copyBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
  note: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    borderLeft: '2px solid var(--accent-violet)',
    paddingLeft: '8px',
  },
};
