import React from 'react';
import { NetworkMetrics, Language } from '../lib/types';
import { translations } from '../lib/i18n';
import { Activity, ShieldCheck, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

interface NetworkBandwidthCardProps {
  network: NetworkMetrics;
  lang: Language;
}

export const NetworkBandwidthCard: React.FC<NetworkBandwidthCardProps> = ({ network, lang }) => {
  const t = translations[lang];

  // Visual status config
  let statusBadgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/40 dark:border-emerald-800';
  let statusLabel = t.networkStatusSafe;
  let StatusIcon = ShieldCheck;
  let barColor = '#10B981'; // emerald

  if (network.networkStatus === 'critical') {
    statusBadgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300/40 dark:border-rose-800';
    statusLabel = t.networkStatusCritical;
    StatusIcon = AlertOctagon;
    barColor = '#F43F5E'; // rose
  } else if (network.networkStatus === 'warning') {
    statusBadgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/40 dark:border-amber-800';
    statusLabel = t.networkStatusWarning;
    StatusIcon = AlertTriangle;
    barColor = '#F59E0B'; // amber
  }

  // Display bandwidth nicely in Kbps or Mbps
  const formattedBandwidth = network.bandwidthKbps >= 1000
    ? `${network.bandwidthMbps} ${lang === 'ru' ? 'Мбит/с' : 'Mbps'}`
    : `${network.bandwidthKbps} ${lang === 'ru' ? 'Кбит/с' : 'Kbps'}`;

  // Saturation progress bar width (scaled for visibility: 0-10% fills up to 50% width)
  const visualBarWidth = Math.min(100, Math.max(network.bandwidthKbps > 0 ? 3 : 0, network.fastEthernetSaturationPct * 5));

  const recommendation = lang === 'ru' ? network.recommendationRu : network.recommendationEn;

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Activity className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
              {t.networkCardTitle}
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'ru' ? 'Опрос тегов S7comm / OMS+ / OPC UA' : 'S7comm / OMS+ / OPC UA Tag Polling'}
            </span>
          </div>
        </div>

        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${statusBadgeColor}`}>
          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
          {statusLabel}
        </span>
      </div>

      {/* Main Metric & Gauge */}
      <div className="flex flex-col gap-2 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.networkBandwidth}</span>
            <div className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {formattedBandwidth}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.networkSaturation}</span>
            <div className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
              {network.fastEthernetSaturationPct}% <span className="text-[10px] text-slate-600 dark:text-slate-300 font-normal">/ 100 Mbps</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${visualBarWidth}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* Detail Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/50">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">{t.networkDailyVolume}</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {network.dailyTrafficMb} {lang === 'ru' ? 'МБ/день' : 'MB/day'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/50">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">{t.networkMonthlyVolume}</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {network.monthlyTrafficGb} {lang === 'ru' ? 'ГБ/мес' : 'GB/mo'}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/50">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">{t.networkPacketsPerSec}</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            ~{network.telegramsPerSec} {lang === 'ru' ? 'пак/сек' : 'pkt/s'}
          </span>
        </div>
      </div>

      {/* Engineering Topology Recommendation */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 text-xs text-sky-900 dark:text-sky-200">
        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block mb-0.5">{t.networkRecommendationTitle}:</span>
          <span className="leading-relaxed opacity-90">{recommendation}</span>
        </div>
      </div>
    </div>
  );
};
