'use client';

export default function MetricGauge({
  value,
  label,
  color = 'var(--accent-cyan)',
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const roundedValue = Math.min(100, Math.max(0, Math.round(value)));
  
  // SVG properties
  const radius = 35;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (roundedValue / 100) * circumference;

  return (
    <div style={styles.gaugeContainer}>
      <div style={styles.svgWrapper}>
        <svg height={radius * 2} width={radius * 2} style={styles.svg}>
          {/* Background Track Circle */}
          <circle
            stroke="rgba(255,255,255,0.05)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress Indicator Circle */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div style={styles.valueOverlay}>
          <span style={styles.valueText}>{roundedValue}%</span>
        </div>
      </div>
      <span style={styles.label}>{label}</span>
    </div>
  );
}

const styles = {
  gaugeContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
  },
  svgWrapper: {
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: 'rotate(-90deg)',
  },
  valueOverlay: {
    position: 'absolute' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
};
