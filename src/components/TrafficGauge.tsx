'use client';
import React from 'react';

interface TrafficGaugeProps {
  rate: number; // entries per second
  maxRate?: number;
}

export const TrafficGauge: React.FC<TrafficGaugeProps> = ({ rate, maxRate = 800 }) => {
  const percentage = Math.min(100, Math.max(0, (rate / maxRate) * 100));
  
  let statusColor = '#10B981'; // Green (Safe)
  let statusText = 'Normal (< 300)';
  if (rate > 500) {
    statusColor = '#EF4444'; // Red (Critical)
    statusText = 'Critical (> 500)';
  } else if (rate > 300) {
    statusColor = '#F59E0B'; // Yellow (Warning)
    statusText = 'High (300-500)';
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center text-xs">
        <span className="font-semibold flex items-center gap-1.5" style={{ color: statusColor }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
          {statusText}
        </span>
        <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">
          {rate.toFixed(1)} / {maxRate} rec/s
        </span>
      </div>
      
      {/* Visual meter bar */}
      <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: statusColor,
            boxShadow: `0 0 10px ${statusColor}80`
          }}
        />
      </div>
      
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
        <span>0 (Idle)</span>
        <span>300 (Warn)</span>
        <span>500 (Max SQLite)</span>
        <span>{maxRate}+</span>
      </div>
    </div>
  );
};
