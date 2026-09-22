'use client';
import React, { useState, useMemo, useCallback, useEffect, useDeferredValue, useRef } from 'react';
import {
  MasterLoggingTag,
  Language,
  LoggingMode,
  TriggerMode,
  LimitScope,
  SmoothingMode,
  CompressionMode,
  UnifiedDataLogConfig,
  ComfortDataLogConfig,
} from '../../lib/types';
import {
  calculateDataReductionFactor,
  checkTagCompatibility,
} from '../../lib/calculator/smoothingEngine';
import { translations } from '../../lib/i18n';
import { ImportTagsModal } from '../ImportTagsModal';
import { SelectDataLogModal } from '../SelectDataLogModal';
import { convertToMasterTags, ParsedTagItem } from '../../lib/tagImporter';
import {
  Sliders,
  Plus,
  Trash2,
  Copy,
  Layers,
  HardDrive,
  Database,
  ArrowRightLeft,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Upload,
} from 'lucide-react';

const generateMasterTagId = (): string => {
  return 'mt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
};

const formatLimitBadge = (tag: MasterLoggingTag, lang: Language): string | null => {
  if (!tag.limitScope || tag.limitScope === 'no_limits') return null;
  const high = tag.highLimit ?? 100;
  const low = tag.lowLimit ?? 0;
  switch (tag.limitScope) {
    case 'greater':
      return `> ${high}`;
    case 'greater_or_equal':
      return `>= ${high}`;
    case 'less':
      return `< ${low}`;
    case 'less_or_equal':
      return `<= ${low}`;
    case 'within_limits':
      return `${low} < X < ${high}`;
    case 'within_or_equal':
      return `[${low} .. ${high}]`;
    case 'outside_limits':
      return `X < ${low} | X > ${high}`;
    case 'outside_or_equal':
      return lang === 'ru' ? `Вне [${low} .. ${high}]` : `Outside [${low} .. ${high}]`;
    default:
      return 'Limits';
  }
};

const formatCompressionBadge = (mode?: CompressionMode): string => {
  switch (mode) {
    case 'average': return 'Avg';
    case 'maximum': return 'Max';
    case 'minimum': return 'Min';
    case 'sum': return 'Sum';
    case 'end': return 'End';
    case 'time_average_stepped': return 'T-Avg';
    case 'max_with_timestamp': return 'Max+TS';
    case 'min_with_timestamp': return 'Min+TS';
    case 'no_compression':
    default:
      return 'None';
  }
};

interface MasterTagsTabProps {
  masterTags: MasterLoggingTag[];
  setMasterTags: React.Dispatch<React.SetStateAction<MasterLoggingTag[]>>;
  onPushToUnified: (tags: MasterLoggingTag[], targetDataLogId?: string) => void;
  onPushToComfort: (tags: MasterLoggingTag[], targetDataLogId?: string) => void;
  onPushToProfessional: (tags: MasterLoggingTag[]) => void;
  onPullFromRuntime?: (runtime: 'unified' | 'comfort' | 'professional') => void;
  onPullFromActive?: () => void;
  unifiedTagsCount?: number;
  comfortTagsCount?: number;
  proTagsCount?: number;
  unifiedDataLogs?: UnifiedDataLogConfig[];
  comfortDataLogs?: ComfortDataLogConfig[];
  lang: Language;
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

type InspectorTab = 'general' | 'trigger' | 'cycle' | 'limits' | 'smoothing' | 'compression';

export const MasterTagsTab: React.FC<MasterTagsTabProps> = ({
  masterTags,
  setMasterTags,
  onPushToUnified,
  onPushToComfort,
  onPushToProfessional,
  onPullFromRuntime,
  onPullFromActive,
  unifiedTagsCount = 0,
  comfortTagsCount = 0,
  proTagsCount = 0,
  unifiedDataLogs = [],
  comfortDataLogs = [],
  lang,
  addToast,
}) => {
  const t = translations[lang];

  const [selectedTagId, setSelectedTagId] = useState<string | null>(
    masterTags.length > 0 ? masterTags[0].id : null
  );
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [showComfortWarningModal, setShowComfortWarningModal] = useState(false);
  const [selectDataLogModalState, setSelectDataLogModalState] = useState<{
    isOpen: boolean;
    targetRuntime: 'unified' | 'comfort';
    dataLogs: { id: string; name: string }[];
  }>({
    isOpen: false,
    targetRuntime: 'unified',
    dataLogs: [],
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPullMenuOpen, setIsPullMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const pullMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pullMenuRef.current && !pullMenuRef.current.contains(e.target as Node)) {
        setIsPullMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPullMenuOpen(false);
      }
    };
    if (isPullMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPullMenuOpen]);

  // Selected tag object
  const selectedTag = useMemo(() => {
    return masterTags.find((tag) => tag.id === selectedTagId) || null;
  }, [masterTags, selectedTagId]);

  // Overall statistics calculation
  const stats = useMemo(() => {
    let totalTagsCount = 0;
    let rawDailyRecords = 0;
    let effectiveDailyRecords = 0;

    masterTags.forEach((tag) => {
      const count = tag.count || 1;
      totalTagsCount += count;
      
      let rawRate = 0;
      if (tag.loggingMode === 'ondemand') {
        // On demand is triggered by external events, baseline ~0.02 Hz
        rawRate = 0.02;
      } else {
        const effectiveCycle = Math.max(0.1, (tag.cycleSec || 1) * (tag.cycleFactor || 1));
        rawRate = 1 / effectiveCycle;
      }

      const reduction = calculateDataReductionFactor(tag);
      const effectiveRate = tag.loggingMode === 'ondemand' ? reduction : rawRate * reduction;

      rawDailyRecords += rawRate * 86400 * count;
      effectiveDailyRecords += effectiveRate * 86400 * count;
    });

    const overallReductionPct =
      rawDailyRecords > 0
        ? Math.max(0, Math.round((1 - effectiveDailyRecords / rawDailyRecords) * 100))
        : 0;

    // Approximate 50 bytes per entry
    const dailyRawMb = (rawDailyRecords * 50) / (1024 * 1024);
    const dailyEffectiveMb = (effectiveDailyRecords * 50) / (1024 * 1024);
    const savedMbPerDay = Math.max(0, dailyRawMb - dailyEffectiveMb);

    return {
      totalTagsCount,
      effectiveEntriesPerSec: +(effectiveDailyRecords / 86400).toFixed(2),
      overallReductionPct,
      dailyEffectiveMb: +dailyEffectiveMb.toFixed(1),
      savedMbPerDay: +savedMbPerDay.toFixed(1),
    };
  }, [masterTags]);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Filtered tags for the table (deferred search query ensures smooth, non-blocking typing)
  const filteredTags = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    return masterTags.filter((tag) => {
      const matchesSearch =
        !q ||
        tag.name.toLowerCase().includes(q) ||
        tag.processTag.toLowerCase().includes(q) ||
        tag.description.toLowerCase().includes(q);
      const matchesMode = modeFilter === 'all' || tag.loggingMode === modeFilter;
      return matchesSearch && matchesMode;
    });
  }, [masterTags, deferredSearchQuery, modeFilter]);

  // Tag navigation within drawer
  const currentTagIndex = useMemo(() => {
    return filteredTags.findIndex((t) => t.id === selectedTagId);
  }, [filteredTags, selectedTagId]);

  const prevTag = currentTagIndex > 0 ? filteredTags[currentTagIndex - 1] : null;
  const nextTag = currentTagIndex >= 0 && currentTagIndex < filteredTags.length - 1 ? filteredTags[currentTagIndex + 1] : null;

  // Keyboard accessibility: Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Tag mutation helpers with Siemens TIA Portal parameter dependency rules
  const handleUpdateTag = (id: string, updates: Partial<MasterLoggingTag>) => {
    setMasterTags((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        // Enforce mode dependencies when loggingMode changes
        if (updates.loggingMode && updates.loggingMode !== item.loggingMode) {
          if (updates.loggingMode === 'cyclic') {
            // Cyclic: trigger is None, cycle is active, compression can be active
            updated.triggerMode = 'none';
          } else if (updates.loggingMode === 'onchange') {
            // On change: trigger is allowed (optional), cycle is inactive, compression is No compression
            updated.compressionMode = 'no_compression';
          } else if (updates.loggingMode === 'ondemand') {
            // On demand: trigger is mandatory (default to rising_edge), compression is No compression
            // Limit Scope and Smoothing mode are allowed in all logging modes!
            if (!updated.triggerMode || updated.triggerMode === 'none') {
              updated.triggerMode = 'rising_edge';
            }
            updated.compressionMode = 'no_compression';
          }
        }
        return updated;
      })
    );
  };

  const handleAddTag = useCallback(() => {
    const newId = generateMasterTagId();
    const newTag: MasterLoggingTag = {
      id: newId,
      name: `Tag_${masterTags.length + 1}`,
      processTag: `PLC1_Process_Val_${masterTags.length + 1}`,
      description: `Process Sensor ${masterTags.length + 1}`,
      dataType: 'Real',
      loggingMode: 'cyclic',
      cycleSec: 1,
      cycleFactor: 1,
      limitScope: 'no_limits',
      smoothingMode: 'no_smoothing',
      compressionMode: 'no_compression',
      count: 1,
      targetLogName: 'Trend_Logs',
    };
    setMasterTags((prev) => [...prev, newTag]);
    setSelectedTagId(newId);
    addToast(lang === 'ru' ? 'Новый тег добавлен' : 'New tag created', 'success');
  }, [masterTags.length, setMasterTags, addToast, lang]);

  const handleDuplicateTag = useCallback((tag: MasterLoggingTag) => {
    const newId = generateMasterTagId();
    const clone: MasterLoggingTag = {
      ...tag,
      id: newId,
      name: `${tag.name}_Copy`,
      processTag: `${tag.processTag}_Copy`,
    };
    setMasterTags((prev) => [...prev, clone]);
    setSelectedTagId(newId);
    addToast(lang === 'ru' ? 'Тег дублирован' : 'Tag duplicated', 'info');
  }, [setMasterTags, addToast, lang]);

  const handleDeleteTag = (id: string) => {
    setMasterTags((prev) => prev.filter((tag) => tag.id !== id));
    if (selectedTagId === id) {
      const remaining = masterTags.filter((tag) => tag.id !== id);
      setSelectedTagId(remaining.length > 0 ? remaining[0].id : null);
    }
    addToast(lang === 'ru' ? 'Тег удален' : 'Tag deleted', 'info');
  };

  const handleImportTags = useCallback((parsedTags: ParsedTagItem[], mode: 'append' | 'replace') => {
    const converted = convertToMasterTags(parsedTags);
    if (mode === 'replace') {
      setMasterTags(converted);
      if (converted.length > 0) {
        setSelectedTagId(converted[0].id);
      }
    } else {
      setMasterTags((prev) => [...prev, ...converted]);
      if (converted.length > 0 && !selectedTagId) {
        setSelectedTagId(converted[0].id);
      }
    }
    const successMsg = t.importToastSuccess 
      ? t.importToastSuccess.replace('{n}', String(converted.length))
      : (lang === 'ru' ? `Успешно импортировано ${converted.length} тегов` : `Successfully imported ${converted.length} tags`);
    addToast(successMsg, 'success');
  }, [setMasterTags, selectedTagId, addToast, t.importToastSuccess, lang]);

  // Check if any tag has features unsupported by Comfort
  const comfortUnsupportedCount = useMemo(() => {
    return masterTags.filter((tag) => {
      const compat = checkTagCompatibility(tag, 'comfort');
      return compat.status === 'partial' || compat.status === 'unsupported';
    }).length;
  }, [masterTags]);

  const handlePushUnifiedClick = () => {
    const activeUnifiedLogs = (unifiedDataLogs || []).filter(l => l.enabled !== false);
    if (activeUnifiedLogs.length > 1) {
      setSelectDataLogModalState({
        isOpen: true,
        targetRuntime: 'unified',
        dataLogs: activeUnifiedLogs,
      });
    } else {
      onPushToUnified(masterTags, activeUnifiedLogs[0]?.id);
      addToast(t.pushSuccessUnified, 'success');
    }
  };

  const handlePushComfortClick = () => {
    if (comfortUnsupportedCount > 0) {
      setShowComfortWarningModal(true);
    } else {
      const activeComfortLogs = (comfortDataLogs || []).filter(l => l.enabled !== false);
      if (activeComfortLogs.length > 1) {
        setSelectDataLogModalState({
          isOpen: true,
          targetRuntime: 'comfort',
          dataLogs: activeComfortLogs,
        });
      } else {
        onPushToComfort(masterTags, activeComfortLogs[0]?.id);
        addToast(t.pushSuccessComfort, 'success');
      }
    }
  };

  const handleSelectDataLogConfirm = (selectedLogId: string) => {
    if (selectDataLogModalState.targetRuntime === 'unified') {
      onPushToUnified(masterTags, selectedLogId);
      addToast(t.pushSuccessUnified, 'success');
    } else {
      onPushToComfort(masterTags, selectedLogId);
      addToast(t.pushSuccessComfort, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Statistical KPI Banner */}
      <div className="p-6 rounded-3xl glass-panel shadow-xl border border-slate-200 dark:border-slate-800 relative z-20 bg-white/80 dark:bg-gradient-to-br dark:from-slate-900/60 dark:via-slate-900/40 dark:to-amber-950/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                  {t.masterTagsTitle}
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-mono font-medium">
                    Unified • Comfort • Professional
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  {t.masterTagsSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
                {t.masterTagCount}
              </span>
              <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-300 mt-0.5">
                {stats.totalTagsCount}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
                {t.masterTotalEffectiveRate}
              </span>
              <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.effectiveEntriesPerSec} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">зап/с</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
                {t.reductionEstLabel}
              </span>
              <p className="text-lg font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                -{stats.overallReductionPct}%
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
                Экономия объема:
              </span>
              <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-300 mt-0.5">
                ~{stats.savedMbPerDay} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">МБ/день</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Cross-Platform Sync */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mr-1 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Синхронизация:
            </span>

            <button
              onClick={handlePushUnifiedClick}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00A3B5]/15 hover:bg-[#00A3B5]/25 text-[#008394] dark:text-[#00E5FF] border border-[#00A3B5]/40 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              title="Перенести теги с сохранением всех свойств TIA Inspector в WinCC Unified"
            >
              <Layers className="w-3.5 h-3.5" />
              {t.btnPushUnified}
            </button>

            <button
              onClick={handlePushComfortClick}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-2 shadow-xs relative cursor-pointer"
              title="Адаптировать и перенести теги в WinCC Comfort / Advanced"
            >
              <HardDrive className="w-3.5 h-3.5" />
              {t.btnPushComfort}
              {comfortUnsupportedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                onPushToProfessional(masterTags);
                addToast(t.pushSuccessProfessional, 'success');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/40 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              title="Автоматически распределить по Tag Logging Fast (<1 мин) и Slow (>=1 мин) в WinCC Professional"
            >
              <Database className="w-3.5 h-3.5" />
              {t.btnPushProfessional}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Pull Tags Dropdown */}
            <div className="relative" ref={pullMenuRef}>
              <button
                type="button"
                onClick={() => setIsPullMenuOpen(!isPullMenuOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  isPullMenuOpen
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700'
                }`}
                title={lang === 'ru' ? 'Загрузить теги из Unified, Comfort или Professional' : 'Pull tags from Unified, Comfort or Professional'}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{t.btnPullTags || (lang === 'ru' ? 'Загрузить теги' : 'Pull Tags')}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isPullMenuOpen ? 'rotate-180 text-amber-600 dark:text-amber-400' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isPullMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-1.5 flex flex-col gap-1 animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    {t.pullSelectSource || (lang === 'ru' ? 'Выберите источник тегов' : 'Select Tag Source')}
                  </div>

                  {/* Option: Unified */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onPullFromRuntime) onPullFromRuntime('unified');
                      else if (onPullFromActive) onPullFromActive();
                      setIsPullMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">WinCC Unified</span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      {unifiedTagsCount} {lang === 'ru' ? 'тег.' : 'tags'}
                    </span>
                  </button>

                  {/* Option: Comfort */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onPullFromRuntime) onPullFromRuntime('comfort');
                      setIsPullMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-amber-500/10 dark:hover:bg-amber-500/20 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">WinCC Comfort</span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-amber-500/20 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                      {comfortTagsCount} {lang === 'ru' ? 'тег.' : 'tags'}
                    </span>
                  </button>

                  {/* Option: Professional */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onPullFromRuntime) onPullFromRuntime('professional');
                      setIsPullMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-blue-500/10 dark:hover:bg-blue-500/20 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">WinCC Professional</span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                      {proTagsCount} {lang === 'ru' ? 'тег.' : 'tags'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Import Tags Button */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={lang === 'ru' ? 'Импортировать теги из файла TIA Portal (.xlsx, .csv)' : 'Import tags from TIA Portal file (.xlsx, .csv)'}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t.btnImportTagsFull || (lang === 'ru' ? 'Импорт тегов' : 'Import Tags')}</span>
            </button>

            <button
              onClick={handleAddTag}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t.btnAddTag}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Work Area: Logging Properties Inspector (Top) + Tags List Table (Bottom) */}
      {/* 2. Slide-over Drawer: TIA Portal Logging Properties Inspector */}
      {isDrawerOpen && selectedTag && (() => {
        const isTriggerDisabled = selectedTag.loggingMode === 'cyclic';
        const isCycleDisabled = selectedTag.loggingMode !== 'cyclic';
        const isSmoothingDisabled = false;
        const isCompressionDisabled = selectedTag.loggingMode !== 'cyclic';

        return (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn cursor-pointer"
              onClick={() => setIsDrawerOpen(false)}
            />

            {/* Slide-in Panel */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                      {lang === 'ru' ? 'Свойства:' : 'Properties:'} {selectedTag.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        [{selectedTag.processTag}]
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-300 font-medium shrink-0">
                        (Unified • Comfort • Pro)
                      </span>
                      <div className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{t.statusAutoSaved}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right controls: Reduction badge, tag navigation, close */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold">
                    -{Math.round((1 - calculateDataReductionFactor(selectedTag)) * 100)}%
                  </div>

                  {/* Navigation between tags */}
                  <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-white dark:bg-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-1">
                      {currentTagIndex + 1}/{filteredTags.length}
                    </span>
                    <button
                      type="button"
                      disabled={!prevTag}
                      onClick={() => prevTag && setSelectedTagId(prevTag.id)}
                      className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                      title="Предыдущий тег"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!nextTag}
                      onClick={() => nextTag && setSelectedTagId(nextTag.id)}
                      className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                      title="Следующий тег"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                    title="Закрыть (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inspector Tabstrip (matching TIA Portal parameters) */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 overflow-x-auto no-scrollbar shrink-0">
                {[
                  { id: 'general' as InspectorTab, label: 'General', disabled: false },
                  { id: 'trigger' as InspectorTab, label: 'Tag trigger', disabled: isTriggerDisabled },
                  { id: 'cycle' as InspectorTab, label: 'Cycle', disabled: isCycleDisabled },
                  { id: 'limits' as InspectorTab, label: 'Limits', disabled: false },
                  { id: 'smoothing' as InspectorTab, label: 'Smoothing', disabled: isSmoothingDisabled },
                  { id: 'compression' as InspectorTab, label: 'Compression', disabled: isCompressionDisabled },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInspectorTab(tab.id)}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                      activeInspectorTab === tab.id
                        ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-semibold'
                        : tab.disabled
                        ? 'border-transparent text-slate-400 dark:text-slate-500 opacity-60 hover:text-slate-600 dark:hover:text-slate-300'
                        : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.disabled && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700/60 font-mono">
                        N/A
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Inspector Content Body */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {/* 1. GENERAL TAB */}
                {/* 1. GENERAL TAB */}
                {activeInspectorTab === 'general' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                          Имя архивного тега (Name):
                        </label>
                        <input
                          type="text"
                          value={selectedTag.name}
                          onChange={(e) => handleUpdateTag(selectedTag.id, { name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                          {t.propProcessTag}:
                        </label>
                        <input
                          type="text"
                          value={selectedTag.processTag}
                          onChange={(e) => handleUpdateTag(selectedTag.id, { processTag: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                        Описание переменной:
                      </label>
                      <input
                        type="text"
                        value={selectedTag.description}
                        onChange={(e) => handleUpdateTag(selectedTag.id, { description: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                          {t.colType}:
                        </label>
                        <select
                          value={selectedTag.dataType}
                          onChange={(e) =>
                            handleUpdateTag(selectedTag.id, {
                              dataType: e.target.value as MasterLoggingTag['dataType'],
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                        >
                          <option value="Real">Real (Float 32-bit)</option>
                          <option value="LReal">LReal (Double 64-bit)</option>
                          <option value="DInt">DInt (32-bit signed)</option>
                          <option value="Int">Int (16-bit signed)</option>
                          <option value="Bool">Bool (1-bit discrete)</option>
                          <option value="String">String (Текстовый)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                          {t.propLoggingMode}:
                        </label>
                        <select
                          value={selectedTag.loggingMode}
                          onChange={(e) =>
                            handleUpdateTag(selectedTag.id, {
                              loggingMode: e.target.value as LoggingMode,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                        >
                          <option value="cyclic">{t.modeCyclicLabel}</option>
                          <option value="onchange">{t.modeOnChangeLabel}</option>
                          <option value="ondemand">{t.modeOnDemandLabel}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                          {t.propDataLog}:
                        </label>
                        <input
                          type="text"
                          value={selectedTag.targetLogName || 'Trend_Logs'}
                          onChange={(e) => handleUpdateTag(selectedTag.id, { targetLogName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                          Количество сигналов (множитель):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          value={selectedTag.count}
                          onChange={(e) => handleUpdateTag(selectedTag.id, { count: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* General Impact & Compatibility Info */}
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs space-y-2">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        {lang === 'ru' ? 'На что влияют параметры General:' : 'General Parameters Impact:'}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {lang === 'ru'
                          ? '• Logging mode определяет частоту обращений к памяти: Cyclic пишет непрерывно каждую секунду (большой объем архива). On change экономит до 85–95% объема при стабильном процессе (температуры, уровни), фиксируя только реальные изменения. On demand пишет только по внешнему триггеру.'
                          : '• Logging mode determines write frequency: Cyclic writes continuously every interval (high storage consumption). On change saves up to 85–95% storage for slow analog signals by writing only on changes. On demand logs solely upon triggers.'}
                      </p>
                      <div className="pt-1.5 border-t border-amber-200 dark:border-amber-800/30 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Поддержка:' : 'Platform Support:'}</span>
                        <span className="text-cyan-700 dark:text-cyan-300 font-medium">Unified: ✅ Все режимы</span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">Comfort: ✅ Cyclic, On Change</span>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Professional: ✅ Все режимы</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. TAG TRIGGER TAB */}
                {activeInspectorTab === 'trigger' && (
                  <div className="space-y-4">
                    {isTriggerDisabled ? (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div className="space-y-1">
                          <div className="font-semibold text-amber-900 dark:text-amber-200">
                            Триггер отключен в циклическом режиме (Cyclic)
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                            По стандарту Siemens TIA Portal (V14–V21+) в циклическом режиме архивация инициируется таймером цикла (Cycle). Параметры Tag trigger деактивированы (None) и не влияют на запись.
                          </div>
                        </div>
                      </div>
                    ) : selectedTag.loggingMode === 'onchange' ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <div className="space-y-1">
                          <div className="font-semibold text-emerald-900 dark:text-emerald-200">
                            Режим «По изменению» (On change): триггер опционален
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                            Архивация инициируется изменением значения тега. При указании тега триггера запись дополнительно стробируется выбранным событием (фронт/спад/изменение).
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div className="space-y-1">
                          <div className="font-semibold text-amber-900 dark:text-amber-200">
                            Режим «По требованию» (On demand): триггер обязателен
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                            Архивация производится строго при возникновении триггерного события (передний фронт 0→1, спад 1→0 или изменение). Задайте тег триггера и номер бита.
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                        {t.triggerModeLabel}:
                      </label>
                      <select
                        disabled={isTriggerDisabled}
                        value={isTriggerDisabled ? 'none' : (selectedTag.triggerMode || (selectedTag.loggingMode === 'ondemand' ? 'rising_edge' : 'none'))}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            triggerMode: e.target.value as TriggerMode,
                          })
                        }
                        className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 ${
                          isTriggerDisabled ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40' : 'focus:outline-none focus:border-amber-500'
                        }`}
                      >
                        {selectedTag.loggingMode !== 'ondemand' && (
                          <option value="none">{t.triggerNone}</option>
                        )}
                        <option value="rising_edge">{t.triggerRisingEdge}</option>
                        <option value="falling_edge">{t.triggerFallingEdge}</option>
                        <option value="change">{t.triggerChange}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                        {t.triggerTagLabel}:
                      </label>
                      <input
                        type="text"
                        disabled={isTriggerDisabled}
                        placeholder={isTriggerDisabled ? 'Деактивирован в текущем режиме' : 'например, selMode или Machine_Cycle_End'}
                        value={isTriggerDisabled ? '' : (selectedTag.triggerTag || '')}
                        onChange={(e) => handleUpdateTag(selectedTag.id, { triggerTag: e.target.value })}
                        className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono ${
                          isTriggerDisabled ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40' : 'focus:outline-none focus:border-amber-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                        {t.triggerBitLabel}:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        disabled={isTriggerDisabled}
                        value={isTriggerDisabled ? 0 : (selectedTag.triggerBit ?? 0)}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            triggerBit: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono ${
                          isTriggerDisabled ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40' : 'focus:outline-none focus:border-amber-500'
                        }`}
                      />
                    </div>

                    {/* Trigger Impact & Compatibility Info */}
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs space-y-2">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        {lang === 'ru' ? 'На что влияет Tag trigger (Логирование по событию):' : 'Tag Trigger Impact:'}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {lang === 'ru'
                          ? '• Архивация производится строго по технологическому событию (передний фронт 0→1, задний фронт 1→0 или переключение бита). Идеально для периодических циклов станков, рецептур и пакетов дозирования: данные не пишутся при простое, что экономит память и исключает холостые замеры.'
                          : '• Logging occurs strictly upon discrete machine events (rising/falling edge or bit toggle). Eliminates idle records during process pauses and batch downtime, dramatically saving storage.'}
                      </p>
                      <div className="pt-1.5 border-t border-amber-200 dark:border-amber-800/30 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Поддержка:' : 'Platform Support:'}</span>
                        <span className="text-cyan-700 dark:text-cyan-300 font-medium">Unified: ✅ Нативно в свойствах тега</span>
                        <span className="text-amber-700 dark:text-amber-300 font-medium">Comfort: ⚠️ Через триггеры тегов в TIA</span>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Professional: ✅ Нативно</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CYCLE TAB */}
                {activeInspectorTab === 'cycle' && (
                  <div className="space-y-4">
                    {isCycleDisabled ? (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div className="space-y-1.5 flex-1">
                          <div className="font-semibold text-amber-900 dark:text-amber-200">
                            Параметры Cycle отключены в режиме «{selectedTag.loggingMode === 'onchange' ? 'По изменению' : 'По требованию'}»
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                            По стандарту Siemens TIA Portal (V14–V21+) период архивации (Logging cycle) активен исключительно при циклической записи (Cyclic). В текущем режиме архивация управляется {selectedTag.loggingMode === 'onchange' ? 'событиями изменения значений' : 'событиями внешнего триггера'}.
                          </div>
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateTag(selectedTag.id, { loggingMode: 'cyclic' })}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>{t.btnSwitchToCyclic}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div className="space-y-1">
                          <div className="font-semibold text-amber-900 dark:text-amber-200">
                            Циклический режим (Cyclic) активен
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                            Тег архивируется непрерывно с интервалом: Базовый цикл × Множитель.
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                        {t.cycleLabel}:
                      </label>
                      <select
                        disabled={isCycleDisabled}
                        value={selectedTag.cycleSec}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            cycleSec: parseFloat(e.target.value),
                          })
                        }
                        className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 ${
                          isCycleDisabled ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40' : 'focus:outline-none focus:border-amber-500'
                        }`}
                      >
                        <option value="0.1">100 ms (Высокоскоростной)</option>
                        <option value="0.2">200 ms</option>
                        <option value="0.5">500 ms</option>
                        <option value="1">1 s (Стандартный)</option>
                        <option value="2">2 s</option>
                        <option value="5">5 s</option>
                        <option value="10">10 s</option>
                        <option value="30">30 s</option>
                        <option value="60">1 min</option>
                        <option value="120">2 min</option>
                        <option value="300">5 min</option>
                        <option value="600">10 min</option>
                        <option value="3600">1 hour</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                        {t.cycleFactorLabel}:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        disabled={isCycleDisabled}
                        value={selectedTag.cycleFactor || 1}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            cycleFactor: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono ${
                          isCycleDisabled ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40' : 'focus:outline-none focus:border-amber-500'
                        }`}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isCycleDisabled
                          ? 'Итоговый период: — (деактивирован в текущем режиме)'
                          : `Итоговый период: ${(selectedTag.cycleSec * (selectedTag.cycleFactor || 1)).toFixed(2)} с`}
                      </p>
                    </div>

                    {/* Cycle Impact & Compatibility Info */}
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs space-y-2">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        {lang === 'ru' ? 'На что влияет Cycle (Базовый интервал и множитель):' : 'Logging Cycle Impact:'}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {lang === 'ru'
                          ? '• Базовый период × Множитель определяет суммарный интервал дискретизации. Сокращение интервала с 10 с до 1 с увеличивает нагрузку на ПЛК и размер базы данных в 10 раз! В WinCC Professional этот параметр критичен: теги с циклом < 60 с идут в Fast Tag Logging (бинарный кольцевой архив), а ≥ 60 с — в Slow Tag Logging (таблицы SQL Server).'
                          : '• Base interval × Factor determines acquisition period. Shortening cycle from 10s to 1s increases PLC load and database size tenfold. In WinCC Professional, cycles < 60s route to Fast Tag Logging (binary ring buffer), and >= 60s route to Slow Tag Logging (SQL Server tables).'}
                      </p>
                      <div className="pt-1.5 border-t border-amber-200 dark:border-amber-800/30 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Поддержка:' : 'Platform Support:'}</span>
                        <span className="text-cyan-700 dark:text-cyan-300 font-medium">Unified: ✅ от 100 мс</span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">Comfort: ✅ от 100 мс</span>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Professional: ✅ Fast/Slow разделение</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. LIMITS TAB */}
                {activeInspectorTab === 'limits' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                      Фильтрация по пределам записывает тег только при выходе за технологические границы, снижая объем архива на 90–95%.
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                        {t.limitScopeLabel}:
                      </label>
                      <select
                        value={selectedTag.limitScope || 'no_limits'}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            limitScope: e.target.value as LimitScope,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                      >
                        <option value="no_limits">{t.limitNoLimits}</option>
                        <option value="greater">{t.limitGreater}</option>
                        <option value="less">{t.limitLess}</option>
                        <option value="greater_or_equal">{t.limitGreaterOrEqual}</option>
                        <option value="less_or_equal">{t.limitLessOrEqual}</option>
                        <option value="within_limits">{t.limitWithinLimits}</option>
                        <option value="within_or_equal">{t.limitWithinOrEqual}</option>
                        <option value="outside_limits">{t.limitOutsideLimits}</option>
                        <option value="outside_or_equal">{t.limitOutsideOrEqual}</option>
                      </select>
                    </div>

                    {selectedTag.limitScope && selectedTag.limitScope !== 'no_limits' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                            {t.highLimitLabel}:
                          </label>
                          <input
                            type="number"
                            value={selectedTag.highLimit ?? 100}
                            onChange={(e) =>
                              handleUpdateTag(selectedTag.id, {
                                highLimit: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                            {t.lowLimitLabel}:
                          </label>
                          <input
                            type="number"
                            value={selectedTag.lowLimit ?? 0}
                            onChange={(e) =>
                              handleUpdateTag(selectedTag.id, {
                                lowLimit: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="useTagLimitsCheck"
                        checked={selectedTag.useTagLimits || false}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            useTagLimits: e.target.checked,
                          })
                        }
                        className="rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500"
                      />
                      <label htmlFor="useTagLimitsCheck" className="text-xs text-slate-700 dark:text-slate-300">
                        {t.useTagLimitsLabel}
                      </label>
                    </div>

                    {/* Limits Impact & Compatibility Info */}
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs space-y-2">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        {lang === 'ru' ? 'На что влияет Limits (Фильтрация по диапазону):' : 'Limit Scope Impact:'}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {lang === 'ru'
                          ? '• Позволяет отсекать запись штатных рабочих значений и архивировать точку только при выходе за пределы (например, Greater: только если T > 85°C) или, наоборот, строго в рабочем диапазоне (Within limits). Для контрольных сигналов это снижает объем базы данных на 90–98%!'
                          : '• Filters out nominal operating values, logging samples only when exceeding thresholds (e.g. Greater: only when T > 85°C) or strictly within normal band. Can reduce logging volume by 90–98% for anomaly-tracking variables.'}
                      </p>
                      <div className="pt-1.5 border-t border-amber-200 dark:border-amber-800/30 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Поддержка:' : 'Platform Support:'}</span>
                        <span className="text-cyan-700 dark:text-cyan-300 font-medium">Unified: ✅ 9 режимов нативно</span>
                        <span className="text-amber-700 dark:text-amber-300 font-medium">Comfort: ⚠️ Только через фильтр в ПЛК</span>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Professional: ✅ Нативно</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. SMOOTHING TAB */}
                {activeInspectorTab === 'smoothing' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-800 dark:text-cyan-300">
                      Сглаживание (Deadband и Swinging door) устраняет шум датчиков 4–20 мА и продлевает ресурс SD-карт в 5–15 раз. Доступно для всех режимов архивации (Cyclic, On change, On demand).
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                        {t.smoothingModeLabel}:
                      </label>
                      <select
                        value={selectedTag.smoothingMode || 'no_smoothing'}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            smoothingMode: e.target.value as SmoothingMode,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                      >
                        <option value="no_smoothing">{t.smoothingNoSmoothing}</option>
                        <option value="compare_values">{t.smoothingCompareValues}</option>
                        <option value="value">{t.smoothingValue}</option>
                        <option value="relative_value">{t.smoothingRelativeValue}</option>
                        <option value="swinging_door">{t.smoothingSwingingDoor}</option>
                      </select>
                    </div>

                    {selectedTag.smoothingMode && selectedTag.smoothingMode !== 'no_smoothing' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                          {t.smoothingDeltaLabel}:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={selectedTag.smoothingDelta ?? 0.5}
                          onChange={(e) =>
                            handleUpdateTag(selectedTag.id, {
                              smoothingDelta: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                          {t.smoothingMaxTimeLabel}:
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 600"
                          value={selectedTag.maxTimeSec ?? ''}
                          onChange={(e) =>
                            handleUpdateTag(selectedTag.id, {
                              maxTimeSec: e.target.value ? parseInt(e.target.value) : undefined,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                          {t.smoothingMinTimeLabel}:
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 1"
                          value={selectedTag.minTimeSec ?? ''}
                          onChange={(e) =>
                            handleUpdateTag(selectedTag.id, {
                              minTimeSec: e.target.value ? parseInt(e.target.value) : undefined,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Smoothing Impact & Compatibility Info */}
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs space-y-2">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        {lang === 'ru' ? 'На что влияет Smoothing (Сглаживание и сжатие трендов):' : 'Smoothing & Trend Compression Impact:'}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
                        <p>
                          {lang === 'ru'
                            ? '• Value Deadband (Δ): отсекает электрический шум и вибрации КИПиА, сокращая поток на 50–80%.'
                            : '• Value Deadband (Δ): rejects analog sensor noise, cutting sample flow by 50–80%.'}
                        </p>
                        <p>
                          {lang === 'ru'
                            ? '• Swinging Door: продвинутый алгоритм динамического коридора наклона тренда — сжатие до 90–95% без потери визуальной формы кривой!'
                            : '• Swinging Door: dynamic parallelogram slope compression algorithm — up to 90–95% storage reduction preserving exact trend curve!'}
                        </p>
                        <p>
                          {lang === 'ru'
                            ? '• Maximum time (Heartbeat): принудительно сохраняет контрольную точку каждые N секунд даже при неподвижном сигнале, подтверждая исправность датчика.'
                            : '• Maximum time (Heartbeat): forces a heartbeat sample every N seconds even during static conditions.'}
                        </p>
                        <p>
                          {lang === 'ru'
                            ? '• Minimum time (Anti-chatter): защищает ячейки памяти от лавины записей при дребезге контактов.'
                            : '• Minimum time (Anti-chatter): prevents flash wear from chattering sensor oscillation.'}
                        </p>
                      </div>
                      <div className="pt-1.5 border-t border-amber-200 dark:border-amber-800/30 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Поддержка:' : 'Platform Support:'}</span>
                        <span className="text-cyan-700 dark:text-cyan-300 font-medium">Unified: ✅ Все алгоритмы (вкл. Swinging Door)</span>
                        <span className="text-amber-700 dark:text-amber-300 font-medium">Comfort: ⚠️ Только базовый Deadband</span>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Professional: ✅ Deadband</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. COMPRESSION TAB */}
                {activeInspectorTab === 'compression' && (
                  <div className="space-y-4">
                    {isCompressionDisabled ? (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div className="space-y-1.5 flex-1">
                          <div className="font-semibold text-amber-900 dark:text-amber-200">
                            Вторичное сжатие отключено в режиме «{selectedTag.loggingMode === 'onchange' ? 'По изменению' : 'По требованию'}»
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                            По стандарту Siemens TIA Portal (V14–V21+) вторичное сжатие (Compression / агрегированные архивы Min/Max/Avg) поддерживается исключительно для циклического режима архивации (Cyclic).
                          </div>
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateTag(selectedTag.id, { loggingMode: 'cyclic' })}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>{t.btnSwitchToCyclic}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300">
                        Вторичное сжатие (Compression) агрегирует сырые данные в часовые/суточные архивы (Min, Max, Avg, Sum).
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                        {t.compressionModeLabel}:
                      </label>
                      <select
                        disabled={isCompressionDisabled}
                        value={isCompressionDisabled ? 'no_compression' : (selectedTag.compressionMode || 'no_compression')}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            compressionMode: e.target.value as CompressionMode,
                          })
                        }
                        className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 ${
                          isCompressionDisabled ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40' : 'focus:outline-none focus:border-amber-500'
                        }`}
                      >
                        <option value="no_compression">{t.compressionNoCompression}</option>
                        <option value="minimum">{t.compressionMinimum}</option>
                        <option value="maximum">{t.compressionMaximum}</option>
                        <option value="min_with_timestamp">{t.compressionMinTimestamp}</option>
                        <option value="max_with_timestamp">{t.compressionMaxTimestamp}</option>
                        <option value="sum">{t.compressionSum}</option>
                        <option value="average">{t.compressionAverage}</option>
                        <option value="time_average_stepped">{t.compressionTimeAvgStepped}</option>
                        <option value="end">{t.compressionEnd}</option>
                      </select>
                    </div>

                    {!isCompressionDisabled && selectedTag.compressionMode && selectedTag.compressionMode !== 'no_compression' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                            {t.compressionDelayLabel}:
                          </label>
                          <input
                            type="number"
                            value={selectedTag.compressionDelaySec ?? 10}
                            onChange={(e) =>
                              handleUpdateTag(selectedTag.id, {
                                compressionDelaySec: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">
                            {t.compressionSourceLabel}:
                          </label>
                          <input
                            type="text"
                            placeholder="Trend_Logs"
                            value={selectedTag.sourceLog ?? ''}
                            onChange={(e) =>
                              handleUpdateTag(selectedTag.id, {
                                sourceLog: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Compression Impact & Compatibility Info */}
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs space-y-2">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        {lang === 'ru' ? 'На что влияет Compression (Вторичная агрегация):' : 'Secondary Compression Impact:'}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {lang === 'ru'
                          ? '• Рассчитывает укрупненные показатели (среднее за час, максимум за смену, интегральный расход жидкости/электроэнергии). Позволяет строить долгосрочные аналитические отчеты за месяцы и годы с мгновенным временем отклика, не перегружая базу данных миллионами сырых строк.'
                          : '• Calculates aggregated metrics (hourly average, shift maximum, cumulative consumption). Enables instant analytical reports spanning months and years without scanning millions of raw rows.'}
                      </p>
                      <div className="pt-1.5 border-t border-amber-200 dark:border-amber-800/30 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Поддержка:' : 'Platform Support:'}</span>
                        <span className="text-cyan-700 dark:text-cyan-300 font-medium">Unified: ✅ Нативно в Data Log</span>
                        <span className="text-rose-700 dark:text-rose-400 font-medium">Comfort: ❌ Не поддерживается нативно</span>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Professional: ✅ Агрегатные таблицы SQL</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspector Footer: Real-time Platform Compatibility Check */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {t.compatMatrixTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-xs cursor-pointer transition-colors"
                  >
                    {lang === 'ru' ? 'Готово' : 'Done'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Unified Status */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="flex items-center gap-2 font-medium text-[#008394] dark:text-[#00E5FF]">
                      <CheckCircle2 className="w-4 h-4 text-[#008394] dark:text-[#00E5FF]" />
                      WinCC Unified (MTP / PC RT)
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                      Native SQLite 100%
                    </span>
                  </div>

                  {/* Comfort Status */}
                  {(() => {
                    const compat = checkTagCompatibility(selectedTag, 'comfort');
                    return (
                      <div className="flex flex-col text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                            {compat.status === 'full' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                            )}
                            WinCC Comfort / Adv (RDB/CSV)
                          </span>
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded ${
                              compat.status === 'full'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                            }`}
                          >
                            {compat.effectiveModeRu}
                          </span>
                        </div>
                        {compat.status !== 'full' && (
                          <div className="mt-1.5 text-xs text-amber-700 dark:text-amber-300/90 pl-6 space-y-0.5">
                            {compat.reasonsRu.map((r, i) => (
                              <div key={i}>• {r}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Professional Status */}
                  {(() => {
                    const compat = checkTagCompatibility(selectedTag, 'professional');
                    return (
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <span className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          WinCC Professional SCADA
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-300 font-mono font-medium">
                          {compat.effectiveModeRu}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Work Area: Tags List (Table) */}
      <div className="w-full space-y-4">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.filterSearchPlaceholder}
              className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.colLoggingMode}:</span>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">{t.filterAllModes}</option>
              <option value="cyclic">Cyclic</option>
              <option value="onchange">On change</option>
              <option value="ondemand">On demand</option>
            </select>
          </div>
        </div>

        {/* Tags Table */}
        <div className="rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/95 dark:bg-slate-900/90 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 pl-3 pr-2">{t.colNameProcessTag}</th>
                  <th className="py-2.5 px-2">{t.colMasterDataType}</th>
                  <th className="py-2.5 px-2">{t.colLoggingMode}</th>
                  <th className="py-2.5 px-2">{t.colMasterCycleOrTrigger || t.colMasterCycle}</th>
                  <th className="py-2.5 px-2">{t.colMasterSmoothingAndLimits || t.colSmoothing}</th>
                  <th className="py-2.5 px-2 text-center">{t.colMasterReductionAndCompression || t.colMasterCompression}</th>
                  <th className="py-2.5 px-2 text-center" title={t.colPlatformsTooltip}>{t.colPlatforms}</th>
                  <th className="py-2.5 pl-2 pr-3 text-right">{t.colMasterActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {filteredTags.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 px-4 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
                          <SlidersHorizontal className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                            {t.emptyTagsTitle}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {t.emptyTagsDesc}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <button
                            onClick={handleAddTag}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t.btnAddFirstTag}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onPullFromRuntime) onPullFromRuntime('unified');
                              else if (onPullFromActive) onPullFromActive();
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                            title={lang === 'ru' ? 'Загрузить теги из WinCC Unified' : 'Pull tags from WinCC Unified'}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Unified ({unifiedTagsCount})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onPullFromRuntime) onPullFromRuntime('comfort');
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                            title={lang === 'ru' ? 'Загрузить теги из WinCC Comfort' : 'Pull tags from WinCC Comfort'}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Comfort ({comfortTagsCount})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onPullFromRuntime) onPullFromRuntime('professional');
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                            title={lang === 'ru' ? 'Загрузить теги из WinCC Professional' : 'Pull tags from WinCC Professional'}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>Professional ({proTagsCount})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                            title={lang === 'ru' ? 'Импортировать теги из файла TIA Portal (.xlsx, .csv)' : 'Import tags from TIA Portal file (.xlsx, .csv)'}
                          >
                            <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{t.btnImportTagsFull || (lang === 'ru' ? 'Импорт тегов' : 'Import Tags')}</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTags.map((tag) => {
                    const isSelected = tag.id === selectedTagId;
                    const reduction = calculateDataReductionFactor(tag);
                    const reductionPct = Math.round((1 - reduction) * 100);
                    const compatComfort = checkTagCompatibility(tag, 'comfort');
                    const compatPro = checkTagCompatibility(tag, 'professional');

                    return (
                      <tr
                        key={tag.id}
                        onClick={() => {
                          setSelectedTagId(tag.id);
                          setIsDrawerOpen(true);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-500/10 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 pl-3 pr-2">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span>{tag.name}</span>
                            {tag.count > 1 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700">
                                ×{tag.count}
                              </span>
                            )}
                            {tag.targetLogName && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00646E]/10 dark:bg-[#00A3B5]/15 text-[#00646E] dark:text-[#00A3B5] border border-[#00646E]/20 dark:border-[#00A3B5]/30">
                                {tag.targetLogName}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[190px]" title={`${tag.processTag}${tag.description ? ` (${tag.description})` : ''}`}>
                            {tag.processTag}
                          </div>
                          {tag.description && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[190px]" title={tag.description}>
                              {tag.description}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50">
                            {tag.dataType}
                          </span>
                        </td>

                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              tag.loggingMode === 'cyclic'
                                ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20'
                                : tag.loggingMode === 'onchange'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {tag.loggingMode}
                          </span>
                        </td>

                        <td className="py-2.5 px-2 text-xs">
                          {tag.loggingMode === 'ondemand' ? (
                            <div className="space-y-0.5">
                              <div className="font-mono text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                                <span>⚡</span>
                                <span className="truncate max-w-[130px]" title={tag.triggerTag ? `Trigger tag: ${tag.triggerTag}` : 'No trigger tag'}>
                                  {tag.triggerTag || t.triggerNoneSet}
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                {tag.triggerMode === 'rising_edge'
                                  ? '↑ 0→1'
                                  : tag.triggerMode === 'falling_edge'
                                  ? '↓ 1→0'
                                  : tag.triggerMode === 'change'
                                  ? '⇅ toggle'
                                  : '—'}
                                {tag.triggerBit !== undefined && tag.triggerBit > 0 ? ` (${t.triggerBitLabelShort} ${tag.triggerBit})` : ''}
                              </div>
                            </div>
                          ) : tag.loggingMode === 'onchange' ? (
                            <div className="space-y-0.5">
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                {t.modeOnChangeBadge}
                              </span>
                              {tag.triggerTag && (
                                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[120px]" title={`Gate: ${tag.triggerTag}`}>
                                  trig: {tag.triggerTag}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="font-mono text-slate-700 dark:text-slate-300">
                              <span className="font-semibold">{(tag.cycleSec * (tag.cycleFactor || 1)).toFixed(tag.cycleSec < 1 ? 1 : 0)}s</span>
                              {tag.cycleFactor && tag.cycleFactor > 1 && (
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  ({tag.cycleSec}s × {tag.cycleFactor})
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-2">
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate block max-w-[140px]" title={tag.smoothingMode}>
                            {tag.smoothingMode === 'swinging_door'
                              ? 'Swinging Door'
                              : tag.smoothingMode === 'value'
                              ? `Deadband (${tag.smoothingDelta || 0.5})`
                              : tag.smoothingMode === 'relative_value'
                              ? `Rel (${tag.smoothingDelta || 1}%)`
                              : tag.smoothingMode === 'compare_values'
                              ? 'Compare'
                              : 'None'}
                          </span>
                          {(() => {
                            const limitLabel = formatLimitBadge(tag, lang);
                            if (!limitLabel) return null;
                            return (
                              <span
                                className="text-[10px] text-amber-700 dark:text-amber-300 font-mono font-medium block truncate max-w-[140px]"
                                title={`Limit scope: ${tag.limitScope}`}
                              >
                                🎯 {limitLabel}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              title={t.dataReductionTooltip}
                              className={`text-xs font-mono px-2 py-0.5 rounded font-semibold ${
                                reductionPct > 70
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
                                  : reductionPct > 30
                                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              -{reductionPct}%
                            </span>

                            {tag.loggingMode === 'cyclic' ? (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                  tag.compressionMode && tag.compressionMode !== 'no_compression'
                                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-medium'
                                    : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50'
                                }`}
                                title={lang === 'ru' ? `Вторичное сжатие: ${tag.compressionMode || 'no_compression'}` : `Secondary compression: ${tag.compressionMode || 'no_compression'}`}
                              >
                                {formatCompressionBadge(tag.compressionMode)}
                              </span>
                            ) : (
                              <span
                                className="text-[10px] font-mono text-slate-400 dark:text-slate-500"
                                title={lang === 'ru' ? 'Вторичное сжатие не применимо в режимах On demand и On change' : 'Secondary compression N/A in On demand and On change'}
                              >
                                N/A
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Compatibility Badges */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Unified */}
                            <span
                              title="Unified: Full support"
                              className="w-2.5 h-2.5 rounded-full bg-[#00A3B5] dark:bg-[#00E5FF] shadow-xs inline-block"
                            />
                            {/* Comfort */}
                            <span
                              title={`Comfort: ${compatComfort.status === 'full' ? (lang === 'ru' ? 'Полная поддержка' : 'Full support') : (lang === 'ru' ? compatComfort.reasonsRu.join('; ') : compatComfort.reasonsEn.join('; '))}`}
                              className={`w-2.5 h-2.5 rounded-full inline-block ${
                                compatComfort.status === 'full'
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500 ring-2 ring-amber-500/30'
                              }`}
                            />
                            {/* Professional */}
                            <span
                              title={`Professional: ${lang === 'ru' ? compatPro.effectiveModeRu : compatPro.effectiveModeEn}`}
                              className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"
                            />
                          </div>
                        </td>

                        <td className="py-2.5 pl-2 pr-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTagId(tag.id);
                                setIsDrawerOpen(true);
                              }}
                              title={t.titleConfigureArchive}
                              aria-label={t.titleConfigureArchive}
                              className="p-1 rounded hover:bg-amber-500/15 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateTag(tag);
                              }}
                              title={t.titleDuplicateTag}
                              aria-label={t.titleDuplicateTag}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTag(tag.id);
                              }}
                              title={t.titleDeleteTag}
                              aria-label={t.titleDeleteTag}
                              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Comfort Warning Confirmation Modal */}
      {showComfortWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Адаптация тегов для WinCC Comfort
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              В вашем каталоге обнаружено <strong className="text-amber-600 dark:text-amber-400">{comfortUnsupportedCount}</strong> тегов, использующих функции, которые физически <strong>не поддерживаются</strong> в WinCC Comfort / Advanced (алгоритм <em>Swinging Door</em>, фильтрация по уставкам <em>Limits</em> или вторичная компрессия).
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <strong>Правила автоматической адаптации:</strong>
              <div>• Алгоритм Swinging Door будет деградирован до сырой записи или базового Deadband.</div>
              <div>• Режим On demand будет преобразован в On change.</div>
              <div>• Расчет срока службы SD-карты в Comfort будет вестись по реальному несжатому потоку RDB.</div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowComfortWarningModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setShowComfortWarningModal(false);
                  const activeComfortLogs = (comfortDataLogs || []).filter(l => l.enabled !== false);
                  if (activeComfortLogs.length > 1) {
                    setSelectDataLogModalState({
                      isOpen: true,
                      targetRuntime: 'comfort',
                      dataLogs: activeComfortLogs,
                    });
                  } else {
                    onPushToComfort(masterTags, activeComfortLogs[0]?.id);
                    addToast(t.pushSuccessComfort, 'success');
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
              >
                Адаптировать и перенести
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Data Log Destination Modal */}
      <SelectDataLogModal
        isOpen={selectDataLogModalState.isOpen}
        onClose={() => setSelectDataLogModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleSelectDataLogConfirm}
        targetRuntime={selectDataLogModalState.targetRuntime}
        dataLogs={selectDataLogModalState.dataLogs}
        tagsCount={masterTags.length}
        lang={lang}
      />

      {/* Import Tags Modal */}
      <ImportTagsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportTags}
        tab="master_tags"
        lang={lang}
      />
    </div>
  );
};
