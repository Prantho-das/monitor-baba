import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={styles.container}>
      {/* Background decoration */}
      <div style={styles.blob1}></div>
      <div style={styles.blob2}></div>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.logoGroup}>
          <div style={styles.logoIcon}>M</div>
          <span style={styles.logoText}>Mooonitooor</span>
        </div>
        <div style={styles.navLinks}>
          <Link href="/login" style={styles.loginBtn}>
            Log In
          </Link>
          <Link href="/login" style={styles.signupBtn}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={styles.main}>
        <div style={styles.heroContent}>
          <div style={styles.badge}>v1.0 is Live 🚀</div>
          <h1 style={styles.title}>
            Next-Gen Server <br />
            <span style={styles.gradientText}>Monitoring</span>
          </h1>
          <p style={styles.subtitle}>
            Keep your infrastructure healthy with real-time telemetry, instant alerts, and beautiful dashboards. Track CPU, RAM, and Disk usage effortlessly.
          </p>
          <div style={styles.ctaGroup}>
            <Link href="/login" style={styles.primaryCta}>
              Start Monitoring Free
            </Link>
            <Link href="#features" style={styles.secondaryCta}>
              Explore Features
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div id="features" style={styles.featuresGrid}>
          <div className="glass-card" style={styles.featureCard}>
            <div style={{ ...styles.featureIcon, color: 'var(--accent-cyan)' }}>⚡</div>
            <h3 style={styles.featureTitle}>Real-time Telemetry</h3>
            <p style={styles.featureDesc}>Sub-second updates for CPU, Memory, and Disk usage across all your Linux nodes.</p>
          </div>
          <div className="glass-card" style={styles.featureCard}>
            <div style={{ ...styles.featureIcon, color: 'var(--color-critical)' }}>🔔</div>
            <h3 style={styles.featureTitle}>Instant Alerts</h3>
            <p style={styles.featureDesc}>Get notified immediately when a server goes offline or resources hit critical levels.</p>
          </div>
          <div className="glass-card" style={styles.featureCard}>
            <div style={{ ...styles.featureIcon, color: 'var(--accent-violet)' }}>📊</div>
            <h3 style={styles.featureTitle}>Beautiful Dashboards</h3>
            <p style={styles.featureDesc}>Visualize historical data and trends with our premium, glassmorphism UI.</p>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <p>© 2026 Mooonitooor. All rights reserved.</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0b0f19', // Dark theme background
    color: '#fff',
    fontFamily: 'var(--font-inter)',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute' as const,
    top: '-10%',
    left: '-10%',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(11,15,25,0) 70%)',
    borderRadius: '50%',
    zIndex: 0,
    pointerEvents: 'none' as const,
  },
  blob2: {
    position: 'absolute' as const,
    bottom: '-20%',
    right: '-10%',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, rgba(11,15,25,0) 70%)',
    borderRadius: '50%',
    zIndex: 0,
    pointerEvents: 'none' as const,
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 48px',
    position: 'relative' as const,
    zIndex: 10,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
  },
  navLinks: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  loginBtn: {
    color: '#9ca3af',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'color 0.2s',
  },
  signupBtn: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.2s',
  },
  main: {
    position: 'relative' as const,
    zIndex: 10,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '80px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
  },
  heroContent: {
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    animation: 'fadeIn 0.8s ease-out',
  },
  badge: {
    background: 'rgba(37,99,235,0.1)',
    color: '#60a5fa',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    marginBottom: '24px',
    border: '1px solid rgba(37,99,235,0.2)',
  },
  title: {
    fontSize: '64px',
    fontWeight: '800',
    lineHeight: '1.1',
    letterSpacing: '-2px',
    marginBottom: '24px',
  },
  gradientText: {
    background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '20px',
    color: '#9ca3af',
    lineHeight: '1.6',
    marginBottom: '40px',
    maxWidth: '600px',
  },
  ctaGroup: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  primaryCta: {
    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
    color: '#fff',
    padding: '16px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    boxShadow: '0 4px 14px 0 rgba(37,99,235,0.39)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  secondaryCta: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '16px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'background 0.2s',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginTop: '100px',
    width: '100%',
    textAlign: 'left' as const,
  },
  featureCard: {
    padding: '32px',
    background: 'rgba(31, 41, 55, 0.4)',
    backdropFilter: 'blur(10px)',
  },
  featureIcon: {
    fontSize: '32px',
    marginBottom: '16px',
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '12px',
  },
  featureDesc: {
    color: '#9ca3af',
    lineHeight: '1.5',
  },
  footer: {
    position: 'relative' as const,
    zIndex: 10,
    textAlign: 'center' as const,
    padding: '32px',
    color: '#6b7280',
    fontSize: '14px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  }
};
