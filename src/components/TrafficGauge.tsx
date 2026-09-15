'use client';
import React from 'react';

import { Language } from '../lib/types';
import { translations } from '../lib/i18n';

interface TrafficGaugeProps {
  rate: number; // entries per second
  maxRate?: number;
  warnThreshold?: number;
  critThreshold?: number;
  lang?: Language;
}

export const TrafficGauge: React.FC<TrafficGaugeProps> = ({ 
  rate, 
  maxRate = 800, 
  warnThreshold = 300, 
  critThreshold = 500, 
  lang = 'ru' 
}) => {
  const t = translations[lang] || translations.ru;
  const percentage = Math.min(100, Math.max(0, (rate / maxRate) * 100));
  
  let statusColor = '#10B981'; // Green (Safe)
  let statusText = warnThreshold === 300 ? t.trafficSafe : `${lang === 'ru' ? 'Норма' : 'Normal'} (< ${warnThreshold})`;
  if (rate > critThreshold) {
    statusColor = '#EF4444'; // Red (Critical)
    statusText = critThreshold === 500 ? t.trafficCrit : `${lang === 'ru' ? 'Критично' : 'Critical'} (> ${critThreshold})`;
  } else if (rate > warnThreshold) {
    statusColor = '#F59E0B'; // Yellow (Warning)
    statusText = (warnThreshold === 300 && critThreshold === 500) ? t.trafficWarn : `${lang === 'ru' ? 'Повышенная' : 'Warning'} (${warnThreshold}–${critThreshold})`;
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center text-xs">
        <span className="font-semibold flex items-center gap-1.5" style={{ color: statusColor }}>
          <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: statusColor }} />
          {statusText}
        </span>
        <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">
          {(rate || 0).toFixed(1)} / {maxRate} {lang === 'ru' ? 'зап/сек' : 'rec/s'}
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
      
      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">
        <span>0 ({t.trafficIdle})</span>
        <span>{warnThreshold} ({lang === 'ru' ? 'Вним' : 'Warn'})</span>
        <span>{critThreshold} ({critThreshold === 500 ? t.trafficMaxSqlite : lang === 'ru' ? 'Крит' : 'Crit'})</span>
        <span>{maxRate}+</span>
      </div>
    </div>
  );
};
