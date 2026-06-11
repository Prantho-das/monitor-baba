'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { loading: authLoading } = useAuth(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingPulse}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div className="glass-card" style={styles.card}>
        <div style={styles.logoContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={styles.logo} />
          <h1 style={styles.title}>Mooonitooor</h1>
          <p style={styles.subtitle}>Cloud Server Monitoring Dashboard</p>
        </div>

        {errorMsg && <div style={styles.error}>{errorMsg}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              className="glass-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourdomain.com"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              className="glass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <div style={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={styles.link}>
            Sign Up Now
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'radial-gradient(circle at center, #0f0a28 0%, #03030f 70%)',
  },
  card: {
    width: '100%',
    maxWidth: '450px',
    textAlign: 'center' as const,
    boxShadow: '0 8px 32px 0 rgba(0, 242, 254, 0.05)',
  },
  logoContainer: {
    marginBottom: '32px',
  },
  logo: {
    width: '80px',
    height: '80px',
    borderRadius: '16px',
    marginBottom: '16px',
    boxShadow: '0 0 20px rgba(0, 242, 254, 0.2)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(to right, #00f2fe, #8e2de2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#8b8ea9',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    textAlign: 'left' as const,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    color: '#8b8ea9',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  submitBtn: {
    marginTop: '10px',
    width: '100%',
  },
  error: {
    background: 'rgba(255, 75, 43, 0.1)',
    border: '1px solid rgba(255, 75, 43, 0.2)',
    color: '#ff4b2b',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
    textAlign: 'left' as const,
  },
  footer: {
    marginTop: '24px',
    color: '#8b8ea9',
    fontSize: '14px',
  },
  link: {
    color: '#00f2fe',
    fontWeight: '600',
  },
  loadingPulse: {
    fontSize: '18px',
    color: '#00f2fe',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
  },
};
