'use client';
import React, { useState, useEffect } from 'react';
import { ActiveTab, Language, UnifiedResult, UnifiedConfig, ComfortResult, ComfortConfig, ProfessionalResult, ProfessionalConfig, ToastMessage } from '../lib/types';
import { translations } from '../lib/i18n';
import { X, Copy, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TiaCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  lang: Language;
  unifiedData: { config: UnifiedConfig; result: UnifiedResult };
  comfortData: { config: ComfortConfig; result: ComfortResult };
  proData: { config: ProfessionalConfig; result: ProfessionalResult };
  onShowToast?: (message: string, type?: ToastMessage['type']) => void;
}

export const TiaCheatSheetModal: React.FC<TiaCheatSheetModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  lang,
  unifiedData,
  comfortData,
  proData,
  onShowToast,
}) => {
  const t = translations[lang];
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    try {
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.6 } });
    } catch {
      // ignore
    }
    if (onShowToast) onShowToast(t.toastCopied, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate cheat items based on active tab
  let title = '';
  let items: { label: string; value: string; tip: string }[] = [];

  if (activeTab === 'unified') {
    title = lang === 'ru'
      ? 'WinCC Unified — Свойства Data Log (TIA Portal)'
      : 'WinCC Unified — Data Log Properties (TIA Portal)';
    const isUsb = unifiedData.config.storageMedium === 'usb_128g';
    const path = unifiedData.config.deviceType === 'ucp'
      ? (isUsb ? '/media/simatic/X61' : '/media/simatic/X51')
      : 'C:\\ProgramData\\Siemens\\Automation\\LogData';
    const storageTip = unifiedData.config.deviceType === 'ucp'
      ? (isUsb
          ? (lang === 'ru' ? 'USB-накопитель в разъеме X61 панели Unified Comfort' : 'USB flash drive in port X61 of Unified Comfort')
          : t.cheatTipStoragePathUcp)
      : t.cheatTipStoragePathPc;
    items = [
      { label: 'Max segment size', value: `${unifiedData.result.sqliteSegmentMb} MB`, tip: t.cheatTipMultiple4Mb },
      { label: 'Max log size', value: `${unifiedData.result.totalLogMb} MB`, tip: t.cheatTipTotalLog },
      { label: 'Segment time period', value: `${unifiedData.config.segmentHours} Hours`, tip: t.cheatTipSegmentPeriod },
      { label: 'Log time period (Retention)', value: `${unifiedData.config.retentionDays} Days`, tip: t.cheatTipRetention },
      { label: 'Storage path / location', value: path, tip: storageTip },
    ];
  } else if (activeTab === 'comfort') {
    title = lang === 'ru'
      ? 'WinCC Comfort / Advanced — Настройки архивации (TIA Portal)'
      : 'WinCC Comfort / Advanced — Historical Data Properties (TIA Portal)';
    items = [
      { label: 'Data records per log', value: `${comfortData.config.recordsPerLog.toLocaleString()}`, tip: t.cheatTipRecordsPerLog },
      { label: 'Sequence of log files', value: `${comfortData.result.recommendedLogFiles}`, tip: t.cheatTipSequenceFiles },
      { label: 'Log type / Storage location', value: comfortData.config.format === 'rdb' ? 'RDB (binary)' : 'CSV (ASCII)', tip: t.cheatTipFormat },
      { label: 'Path to storage', value: comfortData.config.deviceType === 'comfort_panel' ? '\\Storage Card SD\\Logs' : 'C:\\Logs', tip: comfortData.config.deviceType === 'comfort_panel' ? t.cheatTipComfortStoragePath : t.cheatTipComfortStoragePathPc },
    ];
  } else {
    title = lang === 'ru'
      ? 'WinCC Professional — Архивация тегов и SQL Server'
      : 'WinCC Professional — Tag Logging & SQL Server';
    items = [
      { label: 'Segment time period', value: proData.config.segmentPeriod === 'day' ? t.proPeriodDay : proData.config.segmentPeriod === 'week' ? t.proPeriodWeek : t.proPeriodMonth, tip: t.cheatTipProSegmentPeriod },
      { label: 'Max size of all segments', value: `${proData.result.totalStorageGb.toFixed(2)} GB`, tip: t.cheatTipProTotalDb },
      { label: 'Fast Tag Logging Archive (MDF)', value: `${proData.result.fastDatabaseSizeGb.toFixed(2)} GB`, tip: t.cheatTipProFast },
      { label: 'Slow Tag Logging Archive (MDF)', value: `${proData.result.slowDatabaseSizeGb.toFixed(2)} GB`, tip: t.cheatTipProSlow },
    ];
  }

  const handleCopyAll = () => {
    const text = items.map(i => `${i.label}: ${i.value}`).join('\n');
    copyToClipboard('ALL', text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheat-sheet-title"
        className="glass-panel w-full max-w-xl p-6 rounded-3xl shadow-2xl relative border border-white/20 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 id="cheat-sheet-title" className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Copy className="w-5 h-5 text-[#00A3B5]" />
              {t.cheatTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cheat List */}
        <div className="space-y-3 mb-6">
          {items.map((item, idx) => {
            const isCopied = copiedKey === item.label;
            return (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{item.label}</div>
                  <div className="text-base font-bold font-mono text-slate-900 dark:text-white truncate">{item.value}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.tip}</div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(item.label, item.value)}
                  className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-[#00646E] hover:text-white text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? t.copied : t.btnCopy}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCopyAll}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00646E] hover:bg-[#004D54] text-white flex items-center gap-2 shadow-md shadow-[#00646E]/20 transition-all active:scale-95 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>{t.cheatBtnCopyAll}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t.btnClose}
          </button>
        </div>
      </div>
    </div>
  );
};
