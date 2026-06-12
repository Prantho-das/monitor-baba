'use client';

import { useState } from 'react';

interface Alert {
  created_at: string;
  [key: string]: any;
}

export default function AlertHeatmap({ alerts }: { alerts: Alert[] }) {
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string; count: number } | null>(null);

  // Group alerts by day
  const alertCounts: Record<string, number> = {};
  alerts.forEach(alert => {
    if (!alert.created_at) return;
    const date = new Date(alert.created_at);
    // Convert to local YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    alertCounts[dateStr] = (alertCounts[dateStr] || 0) + 1;
  });

  // Generate 365 days history
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - 364); // 365 days ago

  const gridDays: { date: Date; count: number; dateStr: string }[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= now) {
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    gridDays.push({
      date: new Date(currentDate),
      count: alertCounts[dateStr] || 0,
      dateStr
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Pad the start so the grid always aligns Sunday-Saturday
  const startDayOfWeek = startDate.getDay(); // 0 = Sunday
  const paddedDays: ({ date: Date; count: number; dateStr: string } | null)[] = [
    ...Array(startDayOfWeek).fill(null),
    ...gridDays
  ];

  // Chunk into 53 weeks (columns of 7 days)
  const columns: ({ date: Date; count: number; dateStr: string } | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    columns.push(paddedDays.slice(i, i + 7));
  }

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'rgba(255, 255, 255, 0.04)';
    if (count <= 2) return 'rgba(239, 68, 68, 0.25)'; // Light red
    if (count <= 5) return 'rgba(239, 68, 68, 0.6)';  // Medium red
    return 'rgb(239, 68, 68)';                       // Dark red (critical)
  };

  const getTooltipText = (day: { dateStr: string; count: number }) => {
    const dateObj = new Date(day.dateStr);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString(undefined, options);
    return `${day.count} ${day.count === 1 ? 'alert' : 'alerts'} on ${formattedDate}`;
  };

  // Extract monthly text placement for top labels
  const monthLabels: { index: number; label: string }[] = [];
  let prevMonth = -1;
  columns.forEach((week, colIndex) => {
    const firstDayOfWeek = week.find(day => day !== null);
    if (firstDayOfWeek) {
      const month = firstDayOfWeek.date.getMonth();
      if (month !== prevMonth) {
        const label = firstDayOfWeek.date.toLocaleString('default', { month: 'short' });
        monthLabels.push({ index: colIndex, label });
        prevMonth = month;
      }
    }
  });

  return (
    <div className="glass-card mb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm font-semibold text-textp uppercase tracking-wider">Alert Heatmap Calendar</h3>
          <p className="text-xs text-textm mt-1">Daily incident density over the past year (GitHub-style calendar)</p>
        </div>
        <div className="text-right">
          {hoveredDay ? (
            <span className="text-xs text-red-400 font-medium animate-fade-in">
              {getTooltipText(hoveredDay)}
            </span>
          ) : (
            <span className="text-xs text-textm">Hover squares for details</span>
          )}
        </div>
      </div>

      {/* Grid wrapper for scrolling */}
      <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
        <div className="min-w-[760px] pb-2">
          {/* Month Labels row */}
          <div className="flex text-[10px] text-textm mb-2 select-none h-4 relative">
            <div className="w-8 flex-shrink-0" /> {/* Spacer for weekday labels */}
            <div className="flex-1 flex position-relative">
              {columns.map((_, index) => {
                const match = monthLabels.find(ml => ml.index === index);
                return (
                  <div key={index} className="w-3 flex-shrink-0 relative">
                    {match && (
                      <span className="absolute left-0 bottom-0 whitespace-nowrap text-[9px]">
                        {match.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex gap-[3px]">
            {/* Weekday labels */}
            <div className="w-8 flex flex-col justify-between text-[9px] text-textm font-medium pr-2 h-[98px] select-none py-[2px] text-right">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* Grid Columns */}
            <div className="flex-1 flex gap-[3px]">
              {columns.map((week, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, rowIndex) => {
                    if (!day) {
                      return (
                        <div
                          key={rowIndex}
                          className="w-[11px] h-[11px] bg-transparent"
                        />
                      );
                    }
                    const bgColor = getHeatmapColor(day.count);

                    return (
                      <div
                        key={rowIndex}
                        className="w-[11px] h-[11px] rounded-[2px] transition-all duration-150 cursor-pointer relative group"
                        style={{ backgroundColor: bgColor }}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                      >
                        {/* Native Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-borderg px-2 py-1 rounded text-[9px] whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-20 text-textp font-sans">
                          {getTooltipText(day)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend and scale footer */}
          <div className="flex justify-between items-center mt-4 text-[10px] text-textm select-none">
            <span className="text-textm font-mono text-[9px]">Total tracked alerts: {alerts.length}</span>
            <div className="flex items-center gap-[4px] pr-2">
              <span>Less</span>
              <div className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: getHeatmapColor(0) }} />
              <div className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: getHeatmapColor(1) }} />
              <div className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: getHeatmapColor(3) }} />
              <div className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: getHeatmapColor(6) }} />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
