'use client';
import React, { useState, useMemo, useCallback } from 'react';
import {
  MasterLoggingTag,
  Language,
  LoggingMode,
  TriggerMode,
  LimitScope,
  SmoothingMode,
  CompressionMode,
} from '../../lib/types';
import {
  calculateDataReductionFactor,
  checkTagCompatibility,
} from '../../lib/calculator/smoothingEngine';
import { translations } from '../../lib/i18n';
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
  FileSpreadsheet,
  Search,
  Sparkles,
} from 'lucide-react';

const generateMasterTagId = (): string => {
  return 'mt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
};

interface MasterTagsTabProps {
  masterTags: MasterLoggingTag[];
  setMasterTags: React.Dispatch<React.SetStateAction<MasterLoggingTag[]>>;
  onPushToUnified: (tags: MasterLoggingTag[]) => void;
  onPushToComfort: (tags: MasterLoggingTag[]) => void;
  onPushToProfessional: (tags: MasterLoggingTag[]) => void;
  onPullFromActive: () => void;
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
  onPullFromActive,
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
      const effectiveCycle = Math.max(0.1, (tag.cycleSec || 1) * (tag.cycleFactor || 1));
      const rawRate = 1 / effectiveCycle;
      const reduction = calculateDataReductionFactor(tag);
      const effectiveRate = rawRate * reduction;

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

  // Filtered tags for the table
  const filteredTags = useMemo(() => {
    return masterTags.filter((tag) => {
      const matchesSearch =
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.processTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMode = modeFilter === 'all' || tag.loggingMode === modeFilter;
      return matchesSearch && matchesMode;
    });
  }, [masterTags, searchQuery, modeFilter]);

  // Tag mutation helpers
  const handleUpdateTag = (id: string, updates: Partial<MasterLoggingTag>) => {
    setMasterTags((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
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

  // Check if any tag has features unsupported by Comfort
  const comfortUnsupportedCount = useMemo(() => {
    return masterTags.filter((tag) => {
      const compat = checkTagCompatibility(tag, 'comfort');
      return compat.status === 'partial' || compat.status === 'unsupported';
    }).length;
  }, [masterTags]);

  const handlePushComfortClick = () => {
    if (comfortUnsupportedCount > 0) {
      setShowComfortWarningModal(true);
    } else {
      onPushToComfort(masterTags);
      addToast(t.pushSuccessComfort, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Statistical KPI Banner */}
      <div className="p-6 rounded-3xl glass-panel shadow-xl border border-white/20 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-purple-950/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5">
                  {t.masterTagsTitle}
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono">
                    TIA Portal V19 Inspector
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {t.masterTagsSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 uppercase font-medium">
                {t.masterTagCount}
              </span>
              <p className="text-lg font-bold font-mono text-purple-300 mt-0.5">
                {stats.totalTagsCount}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 uppercase font-medium">
                {t.masterTotalEffectiveRate}
              </span>
              <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {stats.effectiveEntriesPerSec} <span className="text-xs font-normal text-slate-400">зап/с</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 uppercase font-medium">
                {t.reductionEstLabel}
              </span>
              <p className="text-lg font-bold font-mono text-cyan-400 mt-0.5 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                -{stats.overallReductionPct}%
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 uppercase font-medium">
                Экономия объема:
              </span>
              <p className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                ~{stats.savedMbPerDay} <span className="text-xs font-normal text-slate-400">МБ/день</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Cross-Platform Sync */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 mr-1 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
              Синхронизация:
            </span>

            <button
              onClick={() => {
                onPushToUnified(masterTags);
                addToast(t.pushSuccessUnified, 'success');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00A3B5]/20 hover:bg-[#00A3B5]/30 text-[#00E5FF] border border-[#00A3B5]/40 transition-all flex items-center gap-2 shadow-sm"
              title="Перенести теги с сохранением всех свойств TIA Inspector в WinCC Unified"
            >
              <Layers className="w-3.5 h-3.5" />
              {t.btnPushUnified}
            </button>

            <button
              onClick={handlePushComfortClick}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-2 shadow-sm relative"
              title="Адаптировать и перенести теги в WinCC Comfort / Advanced"
            >
              <HardDrive className="w-3.5 h-3.5" />
              {t.btnPushComfort}
              {comfortUnsupportedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                onPushToProfessional(masterTags);
                addToast(t.pushSuccessProfessional, 'success');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 transition-all flex items-center gap-2 shadow-sm"
              title="Автоматически распределить по Tag Logging Fast (<1 мин) и Slow (>=1 мин) в WinCC Professional"
            >
              <Database className="w-3.5 h-3.5" />
              {t.btnPushProfessional}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPullFromActive}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {t.btnPullActive}
            </button>

            <button
              onClick={handleAddTag}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {t.btnAddTag}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Work Area: Table (Left/Top) + TIA Portal Inspector (Right/Bottom) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left / Upper Column: Tags List (Table) */}
        <div className="xl:col-span-7 space-y-4">
          {/* Table Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass-panel border border-slate-800">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени, тегу процесса или описанию..."
                className="w-full bg-transparent text-xs text-slate-200 focus:outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Режим:</span>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none"
              >
                <option value="all">Все режимы</option>
                <option value="cyclic">Cyclic</option>
                <option value="onchange">On change</option>
                <option value="ondemand">On demand</option>
              </select>
            </div>
          </div>

          {/* Tags Table */}
          <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden shadow-lg">
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900/80 sticky top-0 z-10 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Имя / Process Tag</th>
                    <th className="py-2.5 px-2.5">Тип</th>
                    <th className="py-2.5 px-2.5">Режим</th>
                    <th className="py-2.5 px-2.5">Цикл</th>
                    <th className="py-2.5 px-2.5">Сглаживание</th>
                    <th className="py-2.5 px-2.5 text-center">Сжатие</th>
                    <th className="py-2.5 px-2.5 text-center">Совместимость</th>
                    <th className="py-2.5 px-2.5 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredTags.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Теги не найдены. Нажмите «Добавить тег» или «Загрузить из активной вкладки».
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
                          onClick={() => setSelectedTagId(tag.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-950/40 border-l-4 border-l-purple-500'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              {tag.name}
                              {tag.count > 1 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                  ×{tag.count}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate max-w-[170px]" title={tag.processTag}>
                              {tag.processTag}
                            </div>
                          </td>

                          <td className="py-2.5 px-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[11px] font-mono text-slate-300 border border-slate-700/50">
                              {tag.dataType}
                            </span>
                          </td>

                          <td className="py-2.5 px-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                tag.loggingMode === 'cyclic'
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                  : tag.loggingMode === 'onchange'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {tag.loggingMode}
                            </span>
                          </td>

                          <td className="py-2.5 px-2.5 font-mono text-slate-300">
                            {tag.cycleSec * (tag.cycleFactor || 1)}s
                          </td>

                          <td className="py-2.5 px-2.5">
                            <span className="text-[11px] text-slate-300 truncate block max-w-[110px]" title={tag.smoothingMode}>
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
                            {tag.limitScope && tag.limitScope !== 'no_limits' && (
                              <span className="text-[10px] text-amber-400 font-mono block">
                                Limits active
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-2.5 text-center">
                            <span
                              className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                                reductionPct > 70
                                  ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                                  : reductionPct > 30
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              -{reductionPct}%
                            </span>
                          </td>

                          {/* Compatibility Badges */}
                          <td className="py-2.5 px-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Unified */}
                              <span
                                title="Unified: Полная поддержка"
                                className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-sm shadow-[#00E5FF]/40 inline-block"
                              />
                              {/* Comfort */}
                              <span
                                title={`Comfort: ${compatComfort.status === 'full' ? 'Полная поддержка' : compatComfort.reasonsRu.join('; ')}`}
                                className={`w-2.5 h-2.5 rounded-full inline-block ${
                                  compatComfort.status === 'full'
                                    ? 'bg-emerald-400'
                                    : 'bg-amber-400 ring-2 ring-amber-500/30'
                                }`}
                              />
                              {/* Professional */}
                              <span
                                title={`Professional: ${compatPro.effectiveModeRu}`}
                                className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"
                              />
                            </div>
                          </td>

                          <td className="py-2.5 px-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateTag(tag);
                                }}
                                title="Дублировать тег"
                                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTag(tag.id);
                                }}
                                title="Удалить тег"
                                className="p-1 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"
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

        {/* Right / Lower Column: TIA Portal V19 Inspector Panel */}
        <div className="xl:col-span-5 space-y-4">
          {selectedTag ? (
            <div className="rounded-3xl glass-panel border border-purple-500/30 bg-slate-900/90 shadow-2xl overflow-hidden">
              {/* Inspector Header */}
              <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      Inspector: {selectedTag.name}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      [{selectedTag.processTag}]
                    </span>
                  </div>
                </div>

                {/* Reduction Badge */}
                <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                  Сжатие: -{Math.round((1 - calculateDataReductionFactor(selectedTag)) * 100)}%
                </div>
              </div>

              {/* Inspector Tabstrip (matching TIA Portal V19 screens) */}
              <div className="flex border-b border-slate-800 bg-slate-950/40 overflow-x-auto no-scrollbar">
                {[
                  { id: 'general' as InspectorTab, label: 'General' },
                  { id: 'trigger' as InspectorTab, label: 'Tag trigger' },
                  { id: 'cycle' as InspectorTab, label: 'Cycle' },
                  { id: 'limits' as InspectorTab, label: 'Limits' },
                  { id: 'smoothing' as InspectorTab, label: 'Smoothing' },
                  { id: 'compression' as InspectorTab, label: 'Compression' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInspectorTab(tab.id)}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                      activeInspectorTab === tab.id
                        ? 'border-purple-500 text-purple-400 bg-purple-500/10 font-semibold'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Inspector Content Body */}
              <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
                {/* 1. GENERAL TAB */}
                {activeInspectorTab === 'general' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Имя архивного тега (Name):
                      </label>
                      <input
                        type="text"
                        value={selectedTag.name}
                        onChange={(e) => handleUpdateTag(selectedTag.id, { name: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.propProcessTag}:
                      </label>
                      <input
                        type="text"
                        value={selectedTag.processTag}
                        onChange={(e) => handleUpdateTag(selectedTag.id, { processTag: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Описание переменной:
                      </label>
                      <input
                        type="text"
                        value={selectedTag.description}
                        onChange={(e) => handleUpdateTag(selectedTag.id, { description: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          {t.colType}:
                        </label>
                        <select
                          value={selectedTag.dataType}
                          onChange={(e) =>
                            handleUpdateTag(selectedTag.id, {
                              dataType: e.target.value as MasterLoggingTag['dataType'],
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none"
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
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          {t.propLoggingMode}:
                        </label>
                        <select
                          value={selectedTag.loggingMode}
                          onChange={(e) =>
                            handleUpdateTag(selectedTag.id, {
                              loggingMode: e.target.value as LoggingMode,
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none"
                        >
                          <option value="cyclic">{t.modeCyclicLabel}</option>
                          <option value="onchange">{t.modeOnChangeLabel}</option>
                          <option value="ondemand">{t.modeOnDemandLabel}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          {t.propDataLog}:
                        </label>
                        <input
                          type="text"
                          value={selectedTag.targetLogName || 'Trend_Logs'}
                          onChange={(e) => handleUpdateTag(selectedTag.id, { targetLogName: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Количество сигналов (множитель):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          value={selectedTag.count}
                          onChange={(e) => handleUpdateTag(selectedTag.id, { count: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. TAG TRIGGER TAB */}
                {activeInspectorTab === 'trigger' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                      Триггер активирует фиксацию значения в базу данных по внешнему булевому условию (фронт/спад бита).
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.triggerModeLabel}:
                      </label>
                      <select
                        value={selectedTag.triggerMode || 'none'}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            triggerMode: e.target.value as TriggerMode,
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none"
                      >
                        <option value="none">{t.triggerNone}</option>
                        <option value="rising_edge">{t.triggerRisingEdge}</option>
                        <option value="falling_edge">{t.triggerFallingEdge}</option>
                        <option value="change">{t.triggerChange}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.triggerTagLabel}:
                      </label>
                      <input
                        type="text"
                        placeholder="например, selMode или Machine_Cycle_End"
                        value={selectedTag.triggerTag || ''}
                        onChange={(e) => handleUpdateTag(selectedTag.id, { triggerTag: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.triggerBitLabel}:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={selectedTag.triggerBit ?? 0}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            triggerBit: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 3. CYCLE TAB */}
                {activeInspectorTab === 'cycle' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.cycleLabel}:
                      </label>
                      <select
                        value={selectedTag.cycleSec}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            cycleSec: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none"
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
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.cycleFactorLabel}:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={selectedTag.cycleFactor || 1}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            cycleFactor: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Итоговый период: {(selectedTag.cycleSec * (selectedTag.cycleFactor || 1)).toFixed(2)} с
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. LIMITS TAB */}
                {activeInspectorTab === 'limits' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      Фильтрация по пределам записывает тег только при выходе за технологические границы, снижая объем архива на 90–95%.
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.limitScopeLabel}:
                      </label>
                      <select
                        value={selectedTag.limitScope || 'no_limits'}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            limitScope: e.target.value as LimitScope,
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none"
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
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
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
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
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
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none"
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
                        className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="useTagLimitsCheck" className="text-xs text-slate-300">
                        {t.useTagLimitsLabel}
                      </label>
                    </div>
                  </div>
                )}

                {/* 5. SMOOTHING TAB */}
                {activeInspectorTab === 'smoothing' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                      Сглаживание (Deadband и Swinging door) устраняет шум датчиков 4–20 мА и продлевает ресурс SD-карт в 5–15 раз.
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.smoothingModeLabel}:
                      </label>
                      <select
                        value={selectedTag.smoothingMode || 'no_smoothing'}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            smoothingMode: e.target.value as SmoothingMode,
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none"
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
                        <label className="block text-xs font-medium text-slate-400 mb-1">
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
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
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
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
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
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. COMPRESSION TAB */}
                {activeInspectorTab === 'compression' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                      Вторичное сжатие (Compression) агрегирует сырые данные в часовые/суточные архивы (Min, Max, Avg, Sum).
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.compressionModeLabel}:
                      </label>
                      <select
                        value={selectedTag.compressionMode || 'no_compression'}
                        onChange={(e) =>
                          handleUpdateTag(selectedTag.id, {
                            compressionMode: e.target.value as CompressionMode,
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none"
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

                    {selectedTag.compressionMode && selectedTag.compressionMode !== 'no_compression' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
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
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
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
                            className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Inspector Footer: Real-time Platform Compatibility Check */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t.compatMatrixTitle}
                </span>

                <div className="space-y-1.5">
                  {/* Unified Status */}
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="flex items-center gap-2 font-medium text-[#00E5FF]">
                      <CheckCircle2 className="w-4 h-4 text-[#00E5FF]" />
                      WinCC Unified (MTP / PC RT)
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono">
                      Native SQLite 100%
                    </span>
                  </div>

                  {/* Comfort Status */}
                  {(() => {
                    const compat = checkTagCompatibility(selectedTag, 'comfort');
                    return (
                      <div className="flex flex-col text-xs p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 font-medium text-emerald-400">
                            {compat.status === 'full' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            )}
                            WinCC Comfort / Adv (RDB/CSV)
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              compat.status === 'full'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300 font-semibold'
                            }`}
                          >
                            {compat.effectiveModeRu}
                          </span>
                        </div>
                        {compat.status !== 'full' && (
                          <div className="mt-1.5 text-[11px] text-amber-300/90 pl-6 space-y-0.5">
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
                      <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="flex items-center gap-2 font-medium text-blue-400">
                          <CheckCircle2 className="w-4 h-4 text-blue-400" />
                          WinCC Professional SCADA
                        </span>
                        <span className="text-[11px] text-blue-300 font-mono font-medium">
                          {compat.effectiveModeRu}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl glass-panel border border-slate-800 text-center text-slate-500">
              <Sliders className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Выберите тег в таблице слева для настройки параметров в Инспекторе TIA Portal.
            </div>
          )}
        </div>
      </div>

      {/* Comfort Warning Confirmation Modal */}
      {showComfortWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-100">
                Адаптация тегов для WinCC Comfort
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              В вашем каталоге обнаружено <strong className="text-amber-400">{comfortUnsupportedCount}</strong> тегов, использующих функции, которые физически <strong>не поддерживаются</strong> в WinCC Comfort / Advanced (алгоритм <em>Swinging Door</em>, фильтрация по уставкам <em>Limits</em> или вторичная компрессия).
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
              <strong>Правила автоматической адаптации:</strong>
              <div>• Алгоритм Swinging Door будет деградирован до сырой записи или базового Deadband.</div>
              <div>• Режим On demand будет преобразован в On change.</div>
              <div>• Расчет срока службы SD-карты в Comfort будет вестись по реальному несжатому потоку RDB.</div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowComfortWarningModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setShowComfortWarningModal(false);
                  onPushToComfort(masterTags);
                  addToast(t.pushSuccessComfort, 'success');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition-all"
              >
                Адаптировать и перенести
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
