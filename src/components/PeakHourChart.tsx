'use client';

import { useState } from 'react';

interface MetricPoint {
  recorded_at: string;
  cpu_percent: number;
  [key: string]: any;
}

export default function PeakHourChart({ data }: { data: MetricPoint[] }) {
  const [hoveredHour, setHoveredHour] = useState<{ hour: number; cpu: number } | null>(null);

  // Group metrics by hour of the day (0-23)
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const pointsInHour = data.filter(p => {
      const date = new Date(p.recorded_at);
      return date.getHours() === hour;
    });

    const avgCpu = pointsInHour.length > 0
      ? pointsInHour.reduce((sum, p) => sum + (p.cpu_percent || 0), 0) / pointsInHour.length
      : 0;

    return {
      hour,
      cpu: avgCpu,
      count: pointsInHour.length
    };
  });

  const getBarColor = (cpu: number) => {
    if (cpu > 80) return 'rgb(var(--color-critical))';
    if (cpu > 50) return 'rgb(var(--color-warning))';
    return 'rgb(var(--color-online))';
  };

  return (
    <div className="glass-card mb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm font-semibold text-textp uppercase tracking-wider">Peak Hour CPU Usage (24h Pattern)</h3>
          <p className="text-xs text-textm mt-1">Average CPU load grouped by hour of the day based on historical cycles</p>
        </div>
        <div className="text-right">
          {hoveredHour ? (
            <div className="animate-fade-in">
              <span className="text-xs text-textm mr-2">Hour {String(hoveredHour.hour).padStart(2, '0')}:00</span>
              <span className="text-sm font-bold" style={{ color: getBarColor(hoveredHour.cpu) }}>
                {hoveredHour.cpu.toFixed(1)}% CPU
              </span>
            </div>
          ) : (
            <span className="text-xs text-textm">Hover over bars for details</span>
          )}
        </div>
      </div>

      {/* Chart container */}
      <div className="relative pt-6">
        {/* Y-Axis lines */}
        <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none">
          <div className="w-full border-t border-borderg/30 relative">
            <span className="absolute -top-2 right-0 text-[9px] text-textm">100%</span>
          </div>
          <div className="w-full border-t border-borderg/20 relative">
            <span className="absolute -top-2 right-0 text-[9px] text-textm">50%</span>
          </div>
          <div className="w-full border-t border-borderg/10 relative">
            <span className="absolute -top-2 right-0 text-[9px] text-textm">0%</span>
          </div>
        </div>

        {/* 24 columns grid for bars */}
        <div className="h-32 flex items-end justify-between gap-[2px] relative z-10 px-2">
          {hourlyData.map(({ hour, cpu, count }) => {
            const heightPercent = Math.max(2, Math.min(100, cpu));
            const barColor = getBarColor(cpu);

            return (
              <div
                key={hour}
                className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                onMouseEnter={() => setHoveredHour({ hour, cpu })}
                onMouseLeave={() => setHoveredHour(null)}
              >
                {/* Bar */}
                <div
                  className="w-full rounded-t-[2px] transition-all duration-300 relative"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: barColor,
                    opacity: hoveredHour?.hour === hour ? 1 : 0.65,
                    boxShadow: hoveredHour?.hour === hour ? `0 0 12px ${barColor}` : 'none'
                  }}
                >
                  {/* Native tooltip as fallback */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-borderg px-2 py-1 rounded text-[10px] whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 text-textp">
                    {String(hour).padStart(2, '0')}:00 &bull; {cpu.toFixed(1)}% ({count} pts)
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between text-[10px] text-textm mt-3 px-2 font-mono">
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
          <span>23:00</span>
        </div>
      </div>
    </div>
  );
}
