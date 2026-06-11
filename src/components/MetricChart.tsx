'use client';

interface MetricPoint {
  recorded_at: string;
  cpu_percent: number;
  ram_percent: number;
  disk_percent: number;
  network_in_mb?: number;
  network_out_mb?: number;
  [key: string]: any;
}

export default function MetricChart({
  data,
  metricKey,
  label,
  color = 'var(--accent-cyan)',
}: {
  data: MetricPoint[];
  metricKey: keyof MetricPoint;
  label: string;
  color?: string;
}) {
  // SVG size parameters
  const width = 500;
  const height = 150;
  const padding = 20;

  // Render fallback if no historical metrics are logged yet
  if (!data || data.length === 0) {
    return (
      <div style={styles.fallback}>
        <span style={styles.fallbackText}>Waiting for telemetry data...</span>
      </div>
    );
  }

  // Reverse to chronological order (newest is last in query response)
  const sortedData = [...data].reverse();

  // Find scale boundaries
  let maxVal = 100;
  const minVal = 0;
  
  if (metricKey.toString().includes('network')) {
    const highest = Math.max(...sortedData.map(d => Number(d[metricKey]) || 0));
    maxVal = highest > 10 ? Math.ceil(highest * 1.2) : 10;
  }

  // Generate coordinate points for polyline
  const points = sortedData
    .map((point, index) => {
      const val = Number(point[metricKey]) || 0;
      const x = padding + (index / (sortedData.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((val - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  // Generate shading path under the line
  const startX = padding;
  const startY = height - padding;
  const endX = padding + (sortedData.length - 1) * ((width - padding * 2) / (sortedData.length - 1 || 1));
  const fillPoints = `${startX},${startY} ${points} ${endX},${startY}`;

  return (
    <div className="glass-card" style={styles.chartContainer}>
      <div style={styles.header}>
        <span style={styles.label}>{label}</span>
        <span style={{ ...styles.currentVal, color }}>
          {Number(sortedData[sortedData.length - 1]?.[metricKey] || 0).toFixed(1)}
          {metricKey.toString().includes('network') ? ' MB/s' : '%'}
        </span>
      </div>

      <div style={styles.svgWrapper}>
        <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.02)" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.02)" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" />

          {/* Gradients */}
          <defs>
            <linearGradient id={`gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Shaded area */}
          {points && (
            <polygon
              points={fillPoints}
              fill={`url(#gradient-${metricKey})`}
            />
          )}

          {/* Core line */}
          {points && (
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={points}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive dots on coordinates */}
          {sortedData.map((point, index) => {
            const val = point[metricKey];
            const x = padding + (index / (sortedData.length - 1 || 1)) * (width - padding * 2);
            const y = height - padding - ((val - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);
            const isLast = index === sortedData.length - 1;

            if (isLast || index % 5 === 0) {
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={isLast ? 4 : 2.5}
                  fill={isLast ? '#fff' : color}
                  stroke={isLast ? color : 'none'}
                  strokeWidth={isLast ? 2 : 0}
                />
              );
            }
            return null;
          })}
        </svg>
      </div>
    </div>
  );
}

const styles = {
  chartContainer: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    flex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
  },
  currentVal: {
    fontSize: '20px',
    fontWeight: '700',
  },
  svgWrapper: {
    position: 'relative' as const,
    width: '100%',
  },
  svg: {
    width: '100%',
    height: 'auto',
    overflow: 'visible',
  },
  fallback: {
    height: '150px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-card)',
    borderRadius: '16px',
    border: '1px solid var(--border-glass)',
  },
  fallbackText: {
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
};
