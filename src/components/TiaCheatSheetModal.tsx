'use client';
import React, { useState, useEffect } from 'react';
import { ActiveTab, Language, UnifiedResult, UnifiedConfig, ComfortResult, ComfortConfig, ProfessionalResult, ProfessionalConfig, ToastMessage } from '../lib/types';
import { translations } from '../lib/i18n';
import { X, Copy, Check, CheckSquare, Square, RotateCcw, ShieldCheck, HardDrive, Sliders } from 'lucide-react';

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
  const [modalView, setModalView] = useState<'properties' | 'checklist'>('properties');
  const [checkedRules, setCheckedRules] = useState<Record<number, boolean>>({});

  const toggleRule = (ruleNum: number) => {
    setCheckedRules((prev) => ({ ...prev, [ruleNum]: !prev[ruleNum] }));
  };

  const handleCheckAll = () => {
    setCheckedRules({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true });
    if (onShowToast) onShowToast(lang === 'ru' ? 'Все 6 правил отмечены' : 'All 6 rules checked', 'info');
  };

  const handleResetChecklist = () => {
    setCheckedRules({});
    if (onShowToast) onShowToast(lang === 'ru' ? 'Отметки чек-листа сброшены' : 'Checklist reset', 'info');
  };

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
    if (onShowToast) onShowToast(t.toastCopied, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate cheat items based on active tab
  let title = '';
  let items: { label: string; value: string; tip: string }[] = [];

  if (activeTab === 'unified') {
    title = lang === 'ru'
      ? 'WinCC Unified — Свойства Data Logs и Alarm Logs (TIA Portal)'
      : 'WinCC Unified — Data Logs & Alarm Logs Properties (TIA Portal)';
    const isUsb = unifiedData.config.storageMedium === 'usb_128g';
    const isX52 = unifiedData.config.storageMedium === 'sd_custom_x52';
    const path = unifiedData.config.deviceType === 'ucp'
      ? (isUsb ? '/media/simatic/X61' : isX52 ? '/media/simatic/X52' : '/media/simatic/X51')
      : 'C:\\ProgramData\\Siemens\\Automation\\LogData';
    const storageTip = unifiedData.config.deviceType === 'ucp'
      ? (isUsb
          ? (lang === 'ru' ? 'USB-накопитель в разъеме X61 панели Unified Comfort' : 'USB flash drive in port X61 of Unified Comfort')
          : isX52
          ? (lang === 'ru' ? 'Пользовательская SD-карта в слоте X52 (High Endurance / Industrial)' : 'User SD card in Slot X52 (High Endurance / Industrial)')
          : t.cheatTipStoragePathUcp)
      : t.cheatTipStoragePathPc;

    const logItems = unifiedData.result.logItems && unifiedData.result.logItems.length > 0
      ? unifiedData.result.logItems
      : [];

    items = [];

    logItems.forEach((log) => {
      const segTimeStr = log.segmentHours >= 24 
        ? `${Math.floor(log.segmentHours / 24)}.00:00:00` 
        : `0.${String(log.segmentHours).padStart(2, '0')}:00:00`;

      items.push({
        label: `[${log.name}] Maximum segment size (MB)`,
        value: `${log.sqliteSegmentMb} MB`,
        tip: `${lang === 'ru' ? log.categoryNameRu : log.categoryNameEn} • ${t.cheatTipMultiple4Mb}`,
      });
      items.push({
        label: `[${log.name}] Maximum log size (MB)`,
        value: `${log.totalLogMb} MB`,
        tip: `${lang === 'ru' ? log.categoryNameRu : log.categoryNameEn} • ${t.cheatTipTotalLog}`,
      });
      items.push({
        label: `[${log.name}] Segment time period`,
        value: `${segTimeStr} (${log.segmentHours} h)`,
        tip: t.cheatTipSegmentPeriod,
      });
      items.push({
        label: `[${log.name}] Log time period`,
        value: `${log.retentionDays}.00:00:00 (${log.retentionDays} d)`,
        tip: t.cheatTipRetention,
      });
    });

    items.push({
      label: 'Storage location (Path)',
      value: path,
      tip: storageTip,
    });
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

  const checklistRules = [
    {
      num: 1,
      title: t.storageChecklistRule1Title,
      badge: t.storageChecklistRule1Badge,
      desc: t.storageChecklistRule1Desc,
    },
    {
      num: 2,
      title: t.storageChecklistRule2Title,
      badge: t.storageChecklistRule2Badge,
      desc: t.storageChecklistRule2Desc,
    },
    {
      num: 3,
      title: t.storageChecklistRule3Title,
      badge: t.storageChecklistRule3Badge,
      desc: t.storageChecklistRule3Desc,
    },
    {
      num: 4,
      title: t.storageChecklistRule4Title,
      badge: t.storageChecklistRule4Badge,
      desc: t.storageChecklistRule4Desc,
    },
    {
      num: 5,
      title: t.storageChecklistRule5Title,
      badge: t.storageChecklistRule5Badge,
      desc: t.storageChecklistRule5Desc,
    },
    {
      num: 6,
      title: t.storageChecklistRule6Title,
      badge: t.storageChecklistRule6Badge,
      desc: t.storageChecklistRule6Desc,
    },
  ];

  const checkedCount = Object.values(checkedRules).filter(Boolean).length;

  const handleCopyAll = () => {
    const text = items.map((i) => `${i.label}: ${i.value}`).join('\n');
    copyToClipboard('ALL', text);
  };

  const handleCopyChecklist = () => {
    const text = [
      `=== ${t.storageChecklistTitle} ===`,
      `${t.storageChecklistSubtitle}`,
      `Status: ${checkedCount}/6 verified\n`,
      ...checklistRules.map(
        (r) => `[${checkedRules[r.num] ? 'X' : ' '}] ${r.title}\n    ${r.desc}`
      ),
    ].join('\n\n');
    copyToClipboard('CHECKLIST', text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheat-sheet-title"
        className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 rounded-3xl shadow-2xl relative border border-white/20 dark:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
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

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-3 shrink-0">
          <button
            type="button"
            onClick={() => setModalView('properties')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              modalView === 'properties'
                ? 'bg-white dark:bg-slate-900 text-[#00646E] dark:text-[#00A3B5] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.cheatTabProperties}</span>
          </button>

          <button
            type="button"
            onClick={() => setModalView('checklist')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              modalView === 'checklist'
                ? 'bg-white dark:bg-slate-900 text-[#00646E] dark:text-[#00A3B5] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.cheatTabChecklist}</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                checkedCount === 6
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
              }`}
            >
              {checkedCount}/6
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-3 mb-4">
          {modalView === 'properties' ? (
            /* Properties Cheat List */
            items.map((item, idx) => {
              const isCopied = copiedKey === item.label;
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center justify-between gap-3 hover:border-[#00646E]/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{item.label}</div>
                    <div className="text-base font-bold font-mono text-slate-900 dark:text-white truncate">{item.value}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.tip}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.label, item.value)}
                    className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
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
            })
          ) : (
            /* Siemens Storage Commissioning Checklist */
            <div className="space-y-3">
              {/* Checklist Subheader with progress & actions */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#00646E]/10 via-[#00A3B5]/10 to-transparent border border-[#00646E]/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-[#00A3B5] shrink-0" />
                      <span>{t.storageChecklistTitle}</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      {t.storageChecklistSubtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCheckAll}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      {t.storageChecklistBtnCheckAll}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetChecklist}
                      className="p-1 px-2 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                      title={t.storageChecklistBtnReset}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t.storageChecklistBtnReset}</span>
                    </button>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00646E] to-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${(checkedCount / 6) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                    {checkedCount} / 6
                  </span>
                </div>
              </div>

              {/* 6 Interactive Industrial Rules */}
              {checklistRules.map((rule) => {
                const isChecked = !!checkedRules[rule.num];
                return (
                  <div
                    key={rule.num}
                    onClick={() => toggleRule(rule.num)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-[#00A3B5]/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 shrink-0 transition-colors ${
                          isChecked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h5
                            className={`text-xs sm:text-sm font-bold leading-tight ${
                              isChecked
                                ? 'text-emerald-900 dark:text-emerald-200'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {rule.title}
                          </h5>
                          <span
                            className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
                              isChecked
                                ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {rule.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {rule.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          {modalView === 'properties' ? (
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00646E] hover:bg-[#004D54] text-white flex items-center gap-2 shadow-md shadow-[#00646E]/20 transition-all active:scale-95 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{t.cheatBtnCopyAll}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCopyChecklist}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00646E] hover:bg-[#004D54] text-white flex items-center gap-2 shadow-md shadow-[#00646E]/20 transition-all active:scale-95 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Скопировать памятку (SIOS)' : 'Copy SIOS Checklist'}</span>
            </button>
          )}

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
