'use client';
import React, { useState } from 'react';
import { 
  UnifiedTag, UnifiedConfig, UnifiedResult, Language, ToastMessage, 
  UnifiedDataLogConfig, UnifiedAlarmLogConfig, UnifiedAlarmTag
} from '../../lib/types';
import { translations, formatPlural } from '../../lib/i18n';
import { TrafficGauge } from '../TrafficGauge';
import { BulkAddModal } from '../BulkAddModal';
import { BulkAddAlarmModal } from '../BulkAddAlarmModal';
import { ConfirmModal } from '../ConfirmModal';
import { ImportTagsModal } from '../ImportTagsModal';
import { 
  Plus, Trash2, Layers, AlertTriangle, CheckCircle2, 
  ShieldCheck, ShieldAlert, Bell, BellRing, Cpu, Clock, RefreshCw, Download, Settings2, Upload,
  Database, Copy, Check, Filter
} from 'lucide-react';
import { getSiemensArticle } from '../../lib/calculator/mlfbCatalog';
import { generateTiaPortalCsv, generateTiaPortalAlarmCsv, downloadFile } from '../../lib/tiaExporter';
import { convertToUnifiedTags, ParsedTagItem } from '../../lib/tagImporter';
import { NetworkBandwidthCard } from '../NetworkBandwidthCard';

interface UnifiedTabProps {
  tags: UnifiedTag[];
  setTags: React.Dispatch<React.SetStateAction<UnifiedTag[]>>;
  config: UnifiedConfig;
  setConfig: React.Dispatch<React.SetStateAction<UnifiedConfig>>;
  result: UnifiedResult;
  lang: Language;
  onShowToast?: (message: string, type?: ToastMessage['type']) => void;
}

export const UnifiedTab: React.FC<UnifiedTabProps> = ({
  tags,
  setTags,
  config,
  setConfig,
  result,
  lang,
  onShowToast,
}) => {
  const t = translations[lang];
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkAlarmModalOpen, setIsBulkAlarmModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null);

  // Category & Filter states
  const [activeCategory, setActiveCategory] = useState<'data' | 'alarm'>('data');
  const [activeDataLogFilter, setActiveDataLogFilter] = useState<string | 'all'>('all');
  const [activeAlarmLogFilter, setActiveAlarmLogFilter] = useState<string | 'all'>('all');

  // Multi-Log Accessors & Handlers
  const dataLogs: UnifiedDataLogConfig[] = config.dataLogs && config.dataLogs.length > 0
    ? config.dataLogs
    : [{ id: 'default_data_log', name: 'Trend_Logs', retentionDays: config.retentionDays || 30, segmentHours: config.segmentHours || 24, enabled: true }];

  const alarmLogs: UnifiedAlarmLogConfig[] = config.alarmLogs !== undefined
    ? config.alarmLogs
    : [
        { id: 'alarms_log', name: 'Alarms_log', entriesPerDay: 50, retentionDays: config.retentionDays || 30, segmentHours: config.segmentHours || 24, enabled: true },
        { id: 'events_log', name: 'Events_log', entriesPerDay: 100, retentionDays: config.retentionDays || 30, segmentHours: config.segmentHours || 24, enabled: true },
      ];

  const alarmTags: UnifiedAlarmTag[] = config.alarmTags || [];

  const handleAddDataLog = () => {
    const newDl: UnifiedDataLogConfig = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Data_Log_${dataLogs.length + 1}`,
      retentionDays: config.retentionDays || 30,
      segmentHours: config.segmentHours || 24,
      enabled: true,
    };
    setConfig(prev => ({ ...prev, dataLogs: [...dataLogs, newDl] }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Архив данных добавлен' : 'Data log added', 'success');
  };

  const handleUpdateDataLog = (id: string, patch: Partial<UnifiedDataLogConfig>) => {
    const updated = dataLogs.map(dl => dl.id === id ? { ...dl, ...patch } : dl);
    setConfig(prev => ({ ...prev, dataLogs: updated }));
  };

  const handleRemoveDataLog = (id: string) => {
    if (dataLogs.length <= 1) {
      if (onShowToast) onShowToast(lang === 'ru' ? 'Должен остаться хотя бы один архив данных' : 'At least one Data Log must remain', 'warning');
      return;
    }
    const updated = dataLogs.filter(dl => dl.id !== id);
    const fallbackId = updated[0]?.id || 'default_data_log';
    setTags(tags.map(tItem => tItem.dataLogId === id ? { ...tItem, dataLogId: fallbackId } : tItem));
    setConfig(prev => ({ ...prev, dataLogs: updated }));
    if (activeDataLogFilter === id) setActiveDataLogFilter('all');
    if (onShowToast) onShowToast(lang === 'ru' ? 'Архив данных удален' : 'Data log removed', 'info');
  };

  const handleAddAlarmLog = () => {
    const newAl: UnifiedAlarmLogConfig = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Alarm_Log_${alarmLogs.length + 1}`,
      entriesPerDay: 50,
      retentionDays: config.retentionDays || 30,
      segmentHours: config.segmentHours || 24,
      enabled: true,
    };
    setConfig(prev => ({ ...prev, alarmLogs: [...alarmLogs, newAl] }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Архив аварий добавлен' : 'Alarm log added', 'success');
  };

  const handleUpdateAlarmLog = (id: string, patch: Partial<UnifiedAlarmLogConfig>) => {
    const updated = alarmLogs.map(al => al.id === id ? { ...al, ...patch } : al);
    setConfig(prev => ({ ...prev, alarmLogs: updated }));
  };

  const handleRemoveAlarmLog = (id: string) => {
    if (alarmLogs.length <= 1) {
      if (onShowToast) onShowToast(lang === 'ru' ? 'Должен остаться хотя бы один архив аварий' : 'At least one Alarm Log must remain', 'warning');
      return;
    }
    const updated = alarmLogs.filter(al => al.id !== id);
    const fallbackId = updated[0]?.id || 'alarms_log';
    setConfig(prev => ({
      ...prev,
      alarmLogs: updated,
      alarmTags: (prev.alarmTags || []).map(at => at.alarmLogId === id ? { ...at, alarmLogId: fallbackId } : at),
    }));
    if (activeAlarmLogFilter === id) setActiveAlarmLogFilter('all');
    if (onShowToast) onShowToast(lang === 'ru' ? 'Архив аварий удален' : 'Alarm log removed', 'info');
  };

  const handleApplyDefaultsToAll = () => {
    const targetRetention = config.retentionDays || 30;
    const targetSegment = config.segmentHours || 24;
    const updatedDl = dataLogs.map(dl => ({
      ...dl,
      retentionDays: targetRetention,
      segmentHours: targetSegment,
    }));
    const updatedAl = alarmLogs.map(al => ({
      ...al,
      retentionDays: targetRetention,
      segmentHours: targetSegment,
    }));
    setConfig(prev => ({ ...prev, dataLogs: updatedDl, alarmLogs: updatedAl }));
    if (onShowToast) {
      onShowToast(
        lang === 'ru'
          ? 'Параметры по умолчанию применены ко всем архивам'
          : 'Global defaults applied to all logs',
        'success'
      );
    }
  };

  // Alarm Tags Handlers
  const handleAddAlarmTag = () => {
    const targetLogId = activeAlarmLogFilter !== 'all'
      ? activeAlarmLogFilter
      : (alarmLogs[0]?.id || 'alarms_log');
    const newAlarmTag: UnifiedAlarmTag = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Alarm_${alarmTags.length + 1}`,
      alarmClass: 'Alarm',
      triggerType: 'digital',
      eventsPerDay: 5,
      count: 1,
      alarmLogId: targetLogId,
    };
    setConfig(prev => ({
      ...prev,
      alarmTags: [...(prev.alarmTags || []), newAlarmTag],
    }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Аварийный сигнал добавлен' : 'Alarm signal added', 'success');
  };

  const handleBulkAddAlarmSubmit = (params: {
    count: number;
    prefix: string;
    alarmClass: UnifiedAlarmTag['alarmClass'];
    triggerType: UnifiedAlarmTag['triggerType'];
    eventsPerDay: number;
    alarmLogId: string;
  }) => {
    const newBatch: UnifiedAlarmTag[] = Array.from({ length: params.count }, (_, i) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: `${params.prefix}${alarmTags.length + i + 1}`,
      alarmClass: params.alarmClass,
      triggerType: params.triggerType,
      eventsPerDay: params.eventsPerDay,
      count: 1,
      alarmLogId: params.alarmLogId,
    }));
    setConfig(prev => ({
      ...prev,
      alarmTags: [...(prev.alarmTags || []), ...newBatch],
    }));
    if (onShowToast) {
      onShowToast(
        lang === 'ru'
          ? `Добавлен пакет из ${params.count} аварийных сигналов`
          : `Added batch of ${params.count} alarm signals`,
        'success'
      );
    }
  };

  const handleUpdateAlarmTag = (id: string, patch: Partial<UnifiedAlarmTag>) => {
    setConfig(prev => ({
      ...prev,
      alarmTags: (prev.alarmTags || []).map(at => at.id === id ? { ...at, ...patch } : at),
    }));
  };

  const handleRemoveAlarmTag = (id: string) => {
    setConfig(prev => ({
      ...prev,
      alarmTags: (prev.alarmTags || []).filter(at => at.id !== id),
    }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Аварийный сигнал удален' : 'Alarm signal removed', 'info');
  };

  const handleClearAlarmTags = () => {
    setConfig(prev => ({ ...prev, alarmTags: [] }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Все аварийные сигналы удалены' : 'All alarm signals cleared', 'info');
  };

  const handleCopyValue = (key: string, val: string | number) => {
    navigator.clipboard.writeText(String(val));
    setCopiedCellKey(key);
    if (onShowToast) onShowToast(t.toastCopied, 'success');
    setTimeout(() => setCopiedCellKey(null), 2000);
  };

  const handleImportTags = (parsedTags: ParsedTagItem[], mode: 'append' | 'replace') => {
    const converted = convertToUnifiedTags(parsedTags);
    if (mode === 'replace') {
      setTags(converted);
    } else {
      setTags(prev => [...prev, ...converted]);
    }
    if (onShowToast) {
      onShowToast(t.importToastSuccess.replace('{n}', String(converted.length)), 'success');
    }
  };

  const handleAddTag = () => {
    const targetDataLogId = activeDataLogFilter !== 'all'
      ? activeDataLogFilter
      : (dataLogs[0]?.id || 'default_data_log');
    const newTag: UnifiedTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `Tag_${tags.length + 1}`,
      mode: 'cyclic',
      cycleSec: 1,
      entriesPerSec: 1,
      count: 1,
      dataType: 'Real',
      dataLogId: targetDataLogId,
    };
    setTags([...tags, newTag]);
    if (onShowToast) onShowToast(lang === 'ru' ? 'Тег добавлен' : 'Tag added', 'success');
  };

  const handleBulkAddSubmit = (params: {
    count: number;
    prefix: string;
    cycleSec: number;
    mode: 'cyclic' | 'onchange';
    dataType?: UnifiedTag['dataType'];
  }) => {
    const entriesPerSec = params.mode === 'cyclic'
      ? Number((1 / Math.max(0.01, params.cycleSec)).toFixed(4))
      : 0.0167;

    const targetDataLogId = activeDataLogFilter !== 'all'
      ? activeDataLogFilter
      : (dataLogs[0]?.id || 'default_data_log');

    const newTags: UnifiedTag[] = Array.from({ length: params.count }, (_, i) => ({
      id: Math.random().toString(36).substring(2, 9),
      description: `${params.prefix}${tags.length + i + 1}`,
      mode: params.mode,
      cycleSec: params.cycleSec,
      entriesPerSec,
      count: 1,
      dataType: params.dataType || 'Real',
      dataLogId: targetDataLogId,
    }));
    setTags(prev => [...prev, ...newTags]);
    if (onShowToast) onShowToast(t.toastBulkAdded, 'success');
  };

  const handleLoadSample = () => {
    const defaultDlId = dataLogs[0]?.id || 'default_data_log';
    setTags([
      { id: '1', description: lang === 'ru' ? 'Давление ПИД-контуров (0.5с)' : 'Fast PID Pressures (0.5s)', mode: 'cyclic', cycleSec: 0.5, entriesPerSec: 2, count: 40, dataType: 'Real', dataLogId: defaultDlId },
      { id: '2', description: lang === 'ru' ? 'Температуры обмоток и подшипников (2с)' : 'Motor Temperatures (2s)', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 120, dataType: 'Real', dataLogId: defaultDlId },
      { id: '3', description: lang === 'ru' ? 'Уровни в резервуарах (5с)' : 'Tank Levels & Flow (5s)', mode: 'cyclic', cycleSec: 5, entriesPerSec: 0.2, count: 80, dataType: 'Real', dataLogId: defaultDlId },
      { id: '4', description: lang === 'ru' ? 'Концевики и клапаны (По изм.)' : 'Valve States (On Change)', mode: 'onchange', cycleSec: 60, entriesPerSec: 0.0167, count: 200, dataType: 'Bool', dataLogId: defaultDlId },
    ]);
    if (onShowToast) onShowToast(lang === 'ru' ? 'Загружен типовой проект тегов' : 'Sample project tags loaded', 'info');
  };

  const handleUpdateTag = (id: string, updates: Partial<UnifiedTag>) => {
    setTags(tags.map(tItem => {
      if (tItem.id !== id) return tItem;
      const updated = { ...tItem, ...updates };
      if (updates.mode === 'cyclic' || (updates.cycleSec !== undefined && updated.mode === 'cyclic')) {
        const cycle = Math.max(0.01, updated.cycleSec || 1);
        updated.entriesPerSec = Number((1 / cycle).toFixed(4));
      } else if (updates.mode === 'onchange') {
        updated.entriesPerSec = 0.0167; // average 1 entry per minute
      }
      return updated;
    }));
  };

  const handleRemoveTag = (id: string) => {
    setTags(tags.filter(tItem => tItem.id !== id));
  };

  const handleClearAllConfirm = () => {
    setTags([]);
    if (onShowToast) onShowToast(t.toastCleared, 'info');
  };

  const handleExportTiaCsv = () => {
    const csv = generateTiaPortalCsv('unified', tags, 'Unified_DataLog', dataLogs);
    downloadFile(csv, `TIA_WinCC_Unified_Tags_${new Date().toISOString().slice(0, 10)}.csv`);
    if (onShowToast) onShowToast(t.exportTiaSuccess, 'success');
  };

  const handleExportTiaAlarmCsv = () => {
    const csv = generateTiaPortalAlarmCsv(alarmTags, alarmLogs);
    downloadFile(csv, `TIA_WinCC_Unified_Alarms_${new Date().toISOString().slice(0, 10)}.csv`);
    if (onShowToast) onShowToast(t.exportAlarmCsvSuccess, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Device Selection & Global Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Device Profile Card */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#00A3B5]" />
                {t.unifiedDeviceTitle}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00646E]/10 text-[#00646E] dark:text-[#00A3B5] font-semibold border border-[#00646E]/20">
                SQLite Engine
              </span>
            </div>
            
            <div className="space-y-2.5">
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.deviceType === 'ucp'
                  ? 'border-[#00646E] bg-[#00646E]/5 dark:bg-[#00A3B5]/10 shadow-xs ring-1 ring-[#00646E]/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="deviceType"
                  checked={config.deviceType === 'ucp'}
                  onChange={() => setConfig({ ...config, deviceType: 'ucp', storageMedium: 'sd_12g', storageSizeGb: 12 })}
                  className="accent-[#00646E] w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.ucpModel}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.ucpModelSub}</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.deviceType === 'pc_rt'
                  ? 'border-[#00646E] bg-[#00646E]/5 dark:bg-[#00A3B5]/10 shadow-xs ring-1 ring-[#00646E]/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="deviceType"
                  checked={config.deviceType === 'pc_rt'}
                  onChange={() => setConfig({ ...config, deviceType: 'pc_rt', storageMedium: 'ssd_custom', storageSizeGb: 120 })}
                  className="accent-[#00646E] w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.pcRtModel}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.pcRtModelSub}</div>
                </div>
              </label>
            </div>
          </div>

          {/* Storage medium selection */}
          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              {t.storageSelect}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={config.storageMedium}
                onChange={(e) => {
                  const val = e.target.value as UnifiedConfig['storageMedium'];
                  let gb = 12;
                  if (val === 'sd_512m') gb = 0.5;
                  else if (val === 'sd_2g') gb = 2;
                  else if (val === 'sd_12g') gb = 12;
                  else if (val === 'sd_32g') gb = 32;
                  else if (val === 'usb_128g') gb = 128;
                  else if (val === 'sd_custom_x52') gb = config.storageMedium === 'sd_custom_x52' ? (config.storageSizeGb || 32) : 32;
                  else if (val === 'ssd_custom') gb = config.storageMedium === 'ssd_custom' ? (config.storageSizeGb || 256) : 256;
                  setConfig({ ...config, storageMedium: val, storageSizeGb: gb });
                }}
                className="col-span-2 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none"
              >
                <option value="sd_512m">SIMATIC SD Card 512 MB</option>
                <option value="sd_2g">SIMATIC SD Card 2 GB</option>
                <option value="sd_12g">{t.storageSdCard12gUcp}</option>
                <option value="sd_32g">SIMATIC SD Card 32 GB</option>
                <option value="sd_custom_x52">{t.storageSdCustomX52}</option>
                <option value="usb_128g">Industrial USB Flash 128 GB</option>
                <option value="ssd_custom">{t.storageCustomSsd}</option>
              </select>

              {(config.storageMedium === 'ssd_custom' || config.storageMedium === 'sd_custom_x52') && (
                <div className="col-span-2 flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {config.storageMedium === 'sd_custom_x52' ? (lang === 'ru' ? 'Емкость SDHC/SDXC (X52):' : 'SDHC/SDXC (X52) capacity:') : `${t.storageCustom}:`}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={config.storageSizeGb || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 1 : Math.max(1, parseFloat(e.target.value) || 1);
                      setConfig({ ...config, storageSizeGb: val });
                    }}
                    className="p-1 px-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-24 font-mono focus:ring-2 focus:ring-[#00646E]/20 outline-none"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">GB</span>
                  <div className="flex items-center gap-1">
                    {(config.storageMedium === 'sd_custom_x52' ? [16, 32, 64, 128] : [120, 256, 512, 1024]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setConfig({ ...config, storageSizeGb: size })}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                          config.storageSizeGb === size
                            ? 'bg-[#00646E] text-white font-bold'
                            : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {size}G
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* High Endurance / Industrial Recommendation Banner for Slot X52 */}
            {config.deviceType === 'ucp' && config.storageMedium === 'sd_custom_x52' && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{t.sdX52RecommendationTitle}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 shrink-0">
                    {t.sdX52RecommendationBadge}
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  {t.sdX52RecommendationText}
                </p>
              </div>
            )}

            {/* Dynamic File System Warning for Slot X52 with SDXC (> 32 GB) */}
            {config.deviceType === 'ucp' && config.storageMedium === 'sd_custom_x52' && (config.storageSizeGb || 0) > 32 && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>{t.sdX52ExFatWarningTitle}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-800 dark:text-red-200 border border-red-500/30 shrink-0">
                    {t.sdX52ExFatWarningBadge}
                  </span>
                </div>
                <p className="text-[11px] text-red-900/90 dark:text-red-200/90 leading-relaxed">
                  {t.sdX52ExFatWarningText}
                </p>
              </div>
            )}

            {/* Siemens MLFB Article Info */}
            {(() => {
              const article = getSiemensArticle(config.storageMedium);
              return (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                      {t.mlfbSiemensArticle}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#00646E] dark:text-[#00A3B5] bg-[#00646E]/10 dark:bg-[#00A3B5]/10 px-2 py-0.5 rounded border border-[#00646E]/20 dark:border-[#00A3B5]/20">
                      {article.mlfb}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    {lang === 'ru' ? article.descriptionRu : article.descriptionEn}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Global Parameters Card */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00A3B5]" />
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                  {t.globalParamsTitle}
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.globalParamsHint}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleApplyDefaultsToAll}
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-[#00646E] dark:hover:text-[#00A3B5] flex items-center gap-1 font-medium cursor-pointer border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg bg-white/60 dark:bg-slate-800/60 transition-colors"
                title={lang === 'ru' ? 'Применить текущие глобальные значения срока и сегмента ко всем созданным архивам' : 'Apply current global retention and segment to all existing logs'}
              >
                <RefreshCw className="w-3 h-3 text-[#00646E] dark:text-[#00A3B5]" />
                <span>{t.btnApplyDefaultsToAll}</span>
              </button>
              <button
                onClick={handleLoadSample}
                className="text-xs text-[#00646E] dark:text-[#00A3B5] hover:underline flex items-center gap-1 font-medium cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                {lang === 'ru' ? 'Загрузить демо-теги' : 'Load Demo Tags'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t.retentionDays}
              </label>
              <input
                type="number"
                min="1"
                value={config.retentionDays || ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                  setConfig({ ...config, retentionDays: val });
                }}
                onBlur={() => {
                  if (!config.retentionDays || config.retentionDays < 1) {
                    setConfig({ ...config, retentionDays: 30 });
                  }
                }}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.retentionHelper}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {t.segmentHours}
              </label>
              <input
                type="number"
                min="1"
                value={config.segmentHours || ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                  setConfig({ ...config, segmentHours: val });
                }}
                onBlur={() => {
                  if (!config.segmentHours || config.segmentHours < 1) {
                    setConfig({ ...config, segmentHours: 24 });
                  }
                }}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.segmentHelper}</span>
            </div>
          </div>

          {/* Advanced Engineering Settings Accordion */}
          <details className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-900/60 mb-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 select-none hover:text-[#00646E] dark:hover:text-[#00A3B5] transition-colors">
              <Settings2 className="w-3.5 h-3.5 text-[#00646E] dark:text-[#00A3B5]" />
              <span>{t.advancedSettingsTitle}</span>
              <span className="text-[10px] text-slate-400 ml-auto hidden sm:inline">{t.advancedSettingsHint}</span>
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {t.entryBytes}
                </label>
                <input
                  type="number"
                  min="10"
                  value={config.perEntryBytes || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                    setConfig({ ...config, perEntryBytes: val });
                  }}
                  onBlur={() => {
                    if (!config.perEntryBytes || config.perEntryBytes < 10) {
                      setConfig({ ...config, perEntryBytes: 50 });
                    }
                  }}
                  className="p-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.entryBytesHelper}</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {t.headroom}
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.headroomPct !== undefined ? config.headroomPct : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                    setConfig({ ...config, headroomPct: val });
                  }}
                  className="p-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.headroomHelper}</span>
              </div>
            </div>
          </details>

          {/* Multi-Log Manager: Data Logs & Alarm Logs */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
            {/* Section 1: Data Logs List */}
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#00646E] dark:text-[#00A3B5]" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {t.dataLogsSectionTitle}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    {dataLogs.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddDataLog}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-[#00646E]/10 hover:bg-[#00646E]/20 text-[#00646E] dark:text-[#00A3B5] border border-[#00646E]/20 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t.btnAddDataLog}</span>
                </button>
              </div>

              <div className="space-y-2">
                {dataLogs.map((dl, idx) => {
                  const tagCountForDl = tags.filter(tItem => (tItem.dataLogId ? tItem.dataLogId === dl.id : idx === 0)).reduce((acc, tItem) => acc + (tItem.count || 0), 0);
                  const logCalc = result.logItems.find(i => i.id === dl.id);
                  const curRetention = dl.retentionDays !== undefined ? dl.retentionDays : config.retentionDays;
                  const curSegment = dl.segmentHours !== undefined ? dl.segmentHours : config.segmentHours;

                  return (
                    <div key={dl.id} className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs">
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={dl.enabled !== false}
                            onChange={(e) => handleUpdateDataLog(dl.id, { enabled: e.target.checked })}
                            className="w-4 h-4 accent-[#00646E] cursor-pointer shrink-0"
                            title={lang === 'ru' ? 'Включить/отключить архив' : 'Enable/disable log'}
                          />
                          <input
                            type="text"
                            value={dl.name}
                            onChange={(e) => handleUpdateDataLog(dl.id, { name: e.target.value })}
                            placeholder={t.logNamePlaceholder}
                            className="p-1 px-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:border-[#00646E] outline-none flex-1 max-w-[200px]"
                          />
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00646E]/10 text-[#00646E] dark:text-[#00A3B5] font-mono font-semibold shrink-0">
                            {tagCountForDl} {lang === 'ru' ? 'тегов' : 'tags'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {logCalc && logCalc.totalLogMb > 0 && (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
                              {logCalc.sqliteSegmentMb} MB seg / {logCalc.totalLogMb} MB
                            </span>
                          )}
                          {dataLogs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDataLog(dl.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                              title={lang === 'ru' ? 'Удалить Data Log' : 'Remove Data Log'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Individual Parameters Row: Retention Days & Segment Hours */}
                      <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        <div className="flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                            {t.cardRetentionLabel}
                          </span>
                          <input
                            type="number"
                            min="1"
                            value={curRetention}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value, 10) || 1);
                              handleUpdateDataLog(dl.id, { retentionDays: val });
                            }}
                            className="w-14 p-0.5 px-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-[#00646E]"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">{t.unitDays}</span>
                          {(curRetention !== config.retentionDays || curSegment !== config.segmentHours) && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDataLog(dl.id, { retentionDays: config.retentionDays, segmentHours: config.segmentHours })}
                              title={`${t.btnResetToDefaults} (${config.retentionDays} ${t.unitDays}, ${config.segmentHours} ${t.unitHours})`}
                              className="ml-auto p-0.5 text-slate-400 hover:text-[#00646E] dark:hover:text-[#00A3B5] transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                            {t.cardSegmentLabel}
                          </span>
                          <input
                            type="number"
                            min="1"
                            value={curSegment}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value, 10) || 1);
                              handleUpdateDataLog(dl.id, { segmentHours: val });
                            }}
                            className="w-14 p-0.5 px-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-[#00646E]"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">{t.unitHours}</span>
                          <select
                            value={[1, 8, 12, 24, 168].includes(curSegment) ? curSegment : 'custom'}
                            onChange={(e) => {
                              if (e.target.value !== 'custom') {
                                handleUpdateDataLog(dl.id, { segmentHours: parseInt(e.target.value, 10) });
                              }
                            }}
                            className="p-0.5 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 outline-none ml-auto cursor-pointer"
                            title="Быстрый выбор сегмента"
                          >
                            <option value="custom">⚡</option>
                            <option value="1">1ч</option>
                            <option value="8">8ч</option>
                            <option value="12">12ч</option>
                            <option value="24">24ч</option>
                            <option value="168">7д</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Alarm Logs List */}
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {t.alarmLogsSectionTitle}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    {alarmLogs.filter(a => a.enabled).length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddAlarmLog}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t.btnAddAlarmLog}</span>
                </button>
              </div>

              {alarmLogs.length === 0 ? (
                <div className="text-center py-2 text-[11px] text-slate-400">
                  {lang === 'ru' ? 'Нет настроенных журналов алармов (нажмите «+ Alarm Log» для добавления)' : 'No alarm logs configured (click "+ Alarm Log" to add)'}
                </div>
              ) : (
                <div className="space-y-2">
                  {alarmLogs.map((al, idx) => {
                    const matchingAlarmTags = alarmTags.filter((at) => (at.alarmLogId ? at.alarmLogId === al.id : idx === 0));
                    const tagsEvents = matchingAlarmTags.reduce((sum, at) => sum + (Math.max(0, at.eventsPerDay || 0) * Math.max(1, at.count || 1)), 0);
                    const tagsCount = matchingAlarmTags.reduce((sum, at) => sum + Math.max(1, at.count || 1), 0);
                    const logCalc = result.logItems.find(i => i.id === al.id);
                    const curRetention = al.retentionDays !== undefined ? al.retentionDays : config.retentionDays;
                    const curSegment = al.segmentHours !== undefined ? al.segmentHours : config.segmentHours;

                    return (
                      <div key={al.id} className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs">
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={al.enabled}
                              onChange={(e) => handleUpdateAlarmLog(al.id, { enabled: e.target.checked })}
                              className="w-4 h-4 accent-[#00646E] cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={al.name}
                              disabled={!al.enabled}
                              onChange={(e) => handleUpdateAlarmLog(al.id, { name: e.target.value })}
                              placeholder={t.logNamePlaceholder}
                              className="p-1 px-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:border-[#00646E] outline-none flex-1 max-w-[170px] disabled:opacity-40"
                            />
                            {tagsCount > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono font-semibold shrink-0" title={`${tagsEvents} ${t.eventsPerDayShort} ${t.fromAlarmTags}`}>
                                {tagsCount} {lang === 'ru' ? 'сигн.' : 'sigs'} ({tagsEvents} {t.eventsPerDayShort})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 justify-end">
                            <div className="flex items-center gap-1 shrink-0" title={t.baseManualEvents}>
                              <span className="text-[10px] text-slate-400 font-mono">{lang === 'ru' ? '+ фон:' : '+ base:'}</span>
                              <input
                                type="number"
                                min="0"
                                disabled={!al.enabled}
                                value={al.entriesPerDay}
                                onChange={(e) => handleUpdateAlarmLog(al.id, { entriesPerDay: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                className="w-16 p-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-[#00646E] disabled:opacity-40"
                              />
                              <span className="text-[10px] text-slate-400 font-mono">{t.eventsPerDayShort}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveAlarmLog(al.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                              title={lang === 'ru' ? 'Удалить Alarm Log' : 'Remove Alarm Log'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Individual Parameters Row: Retention Days & Segment Hours */}
                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                          <div className="flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                              {t.cardRetentionLabel}
                            </span>
                            <input
                              type="number"
                              min="1"
                              disabled={!al.enabled}
                              value={curRetention}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value, 10) || 1);
                                handleUpdateAlarmLog(al.id, { retentionDays: val });
                              }}
                              className="w-14 p-0.5 px-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-40"
                            />
                            <span className="text-[10px] text-slate-400 font-mono">{t.unitDays}</span>
                            {al.enabled && (curRetention !== config.retentionDays || curSegment !== config.segmentHours) && (
                              <button
                                type="button"
                                onClick={() => handleUpdateAlarmLog(al.id, { retentionDays: config.retentionDays, segmentHours: config.segmentHours })}
                                title={`${t.btnResetToDefaults} (${config.retentionDays} ${t.unitDays}, ${config.segmentHours} ${t.unitHours})`}
                                className="ml-auto p-0.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                              {t.cardSegmentLabel}
                            </span>
                            <input
                              type="number"
                              min="1"
                              disabled={!al.enabled}
                              value={curSegment}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value, 10) || 1);
                                handleUpdateAlarmLog(al.id, { segmentHours: val });
                              }}
                              className="w-14 p-0.5 px-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-40"
                            />
                            <span className="text-[10px] text-slate-400 font-mono">{t.unitHours}</span>
                            <select
                              disabled={!al.enabled}
                              value={[1, 8, 12, 24, 168].includes(curSegment) ? curSegment : 'custom'}
                              onChange={(e) => {
                                if (e.target.value !== 'custom') {
                                  handleUpdateAlarmLog(al.id, { segmentHours: parseInt(e.target.value, 10) });
                                }
                              }}
                              className="p-0.5 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 outline-none ml-auto cursor-pointer disabled:opacity-40"
                              title="Быстрый выбор сегмента"
                            >
                              <option value="custom">⚡</option>
                              <option value="1">1ч</option>
                              <option value="8">8ч</option>
                              <option value="12">12ч</option>
                              <option value="24">24ч</option>
                              <option value="168">7д</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 3: Audit Trail Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{t.auditToggle}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      min="0"
                      disabled={!config.includeAudit}
                      value={config.auditEntriesPerDay}
                      onChange={(e) => setConfig({ ...config, auditEntriesPerDay: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-20 p-0.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:ring-1 focus:ring-[#00646E] outline-none"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.auditPerDay}</span>
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.includeAudit}
                onChange={(e) => setConfig({ ...config, includeAudit: e.target.checked })}
                className="w-4 h-4 accent-[#00646E] cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tags Table Card */}
      <div className="glass-panel p-5 rounded-2xl">
        {/* Category Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-4 max-w-fit border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveCategory('data')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'data'
                ? 'bg-white dark:bg-slate-900 text-[#00646E] dark:text-[#00A3B5] shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t.tabDataLogsTags}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {tags.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('alarm')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'alarm'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{t.tabAlarmLogsTags}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold">
              {alarmTags.length}
            </span>
          </button>
        </div>

        {/* Header & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              {activeCategory === 'data' ? (
                <>
                  <Layers className="w-5 h-5 text-[#00A3B5]" />
                  <span>{t.tagListTitle}</span>
                </>
              ) : (
                <>
                  <Bell className="w-5 h-5 text-amber-500" />
                  <span>{t.alarmTagsTitle}</span>
                </>
              )}
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {activeCategory === 'data'
                ? formatPlural(tags.length, lang, ['тег', 'тега', 'тегов'], ['tag', 'tags'])
                : formatPlural(alarmTags.length, lang, ['сигнал', 'сигнала', 'сигналов'], ['signal', 'signals'])}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {activeCategory === 'data' ? (
              <>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-[#00A3B5]/15 hover:bg-[#00A3B5]/25 text-[#00646E] dark:text-[#00A3B5] border border-[#00A3B5]/30 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                  title={t.btnImportTagsFull}
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{t.btnImportTags}</span>
                </button>
                <button
                  onClick={handleExportTiaCsv}
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                  title={t.btnExportTiaCsv}
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{t.btnExportTiaCsv}</span>
                </button>
                <button
                  onClick={handleAddTag}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00646E] text-white hover:bg-[#004D54] flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">{lang === 'ru' ? 'Тег' : 'Tag'}</span>
                  <span className="hidden sm:inline">{t.btnAddTag}</span>
                </button>
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">{lang === 'ru' ? 'Пакет' : 'Bulk'}</span>
                  <span className="hidden sm:inline">{t.btnAddBulk}</span>
                </button>
                <button
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all active:scale-95 cursor-pointer shrink-0 ml-auto sm:ml-0"
                >
                  {t.btnClearAll}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleAddAlarmTag}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.btnAddAlarmTag}</span>
                </button>
                <button
                  onClick={() => setIsBulkAlarmModalOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                  title={lang === 'ru' ? 'Пакетное добавление сигналов тревог и событий' : 'Bulk add alarm & event signals'}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.btnAddAlarmBulk}</span>
                </button>
                <button
                  onClick={handleExportTiaAlarmCsv}
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                  title={t.btnExportAlarmCsv}
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{t.btnExportAlarmCsv}</span>
                </button>
                <button
                  onClick={handleClearAlarmTags}
                  className="px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all active:scale-95 cursor-pointer shrink-0 ml-auto sm:ml-0"
                >
                  {t.btnClearAll}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Log Filter Bar */}
        {activeCategory === 'data' ? (
          <div className="flex flex-wrap items-center gap-1.5 mb-3 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3 h-3 text-[#00646E] dark:text-[#00A3B5]" />
              <span>{t.filterDataLogPrefix}</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveDataLogFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                activeDataLogFilter === 'all'
                  ? 'bg-[#00646E] text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.filterShowAll} ({tags.length})
            </button>
            {dataLogs.map((dl) => {
              const dlCount = tags.filter(tItem => (tItem.dataLogId ? tItem.dataLogId === dl.id : dataLogs[0]?.id === dl.id)).length;
              return (
                <button
                  key={dl.id}
                  type="button"
                  onClick={() => setActiveDataLogFilter(dl.id)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDataLogFilter === dl.id
                      ? 'bg-[#00646E] text-white shadow-xs'
                      : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{dl.name}</span>
                  <span className="text-[10px] opacity-80">({dlCount})</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 mb-3 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3 h-3 text-amber-500" />
              <span>{t.filterAlarmLogPrefix}</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveAlarmLogFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                activeAlarmLogFilter === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.filterShowAll} ({alarmTags.length})
            </button>
            {alarmLogs.map((al) => {
              const alCount = alarmTags.filter(at => (at.alarmLogId ? at.alarmLogId === al.id : alarmLogs[0]?.id === al.id)).length;
              return (
                <button
                  key={al.id}
                  type="button"
                  onClick={() => setActiveAlarmLogFilter(al.id)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeAlarmLogFilter === al.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{al.name}</span>
                  <span className="text-[10px] opacity-80">({alCount})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {activeCategory === 'data' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">{t.colDesc}</th>
                  {(dataLogs.length > 1 || activeDataLogFilter === 'all') && (
                    <th className="p-3 font-mono text-[#00646E] dark:text-[#00A3B5]">{t.colDataLog}</th>
                  )}
                  <th className="p-3">{t.colType}</th>
                  <th className="p-3">{t.colMode}</th>
                  <th className="p-3">{t.colCycle}</th>
                  <th className="p-3">{t.colRate}</th>
                  <th className="p-3">{t.colCount}</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {(() => {
                  const displayedDataTags = activeDataLogFilter === 'all'
                    ? tags
                    : tags.filter(tItem => (tItem.dataLogId ? tItem.dataLogId === activeDataLogFilter : dataLogs[0]?.id === activeDataLogFilter));

                  if (displayedDataTags.length === 0) {
                    return (
                      <tr>
                        <td colSpan={dataLogs.length > 1 || activeDataLogFilter === 'all' ? 8 : 7} className="p-6 text-center text-xs text-slate-500 dark:text-slate-300">
                          {lang === 'ru' ? `Список тегов пуст. Нажмите «${t.btnAddTag}» или «${t.btnAddBulk}».` : `Tag list is empty. Click "${t.btnAddTag}" or "${t.btnAddBulk}" to configure.`}
                        </td>
                      </tr>
                    );
                  }

                  return displayedDataTags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={tag.description}
                          onChange={(e) => handleUpdateTag(tag.id, { description: e.target.value })}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-1 focus:ring-[#00646E] outline-none font-medium"
                        />
                      </td>
                      {(dataLogs.length > 1 || activeDataLogFilter === 'all') && (
                        <td className="p-2.5">
                          <select
                            value={tag.dataLogId || dataLogs[0]?.id}
                            onChange={(e) => handleUpdateTag(tag.id, { dataLogId: e.target.value })}
                            className="p-1.5 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-[#00646E] dark:text-[#00A3B5] outline-none focus:ring-1 focus:ring-[#00646E]"
                          >
                            {dataLogs.map((dl) => (
                              <option key={dl.id} value={dl.id}>{dl.name}</option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="p-2.5">
                        <select
                          value={tag.dataType}
                          onChange={(e) => handleUpdateTag(tag.id, { dataType: e.target.value as UnifiedTag['dataType'] })}
                          className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-[#00646E]"
                        >
                          <option value="Real">Real (4B)</option>
                          <option value="LReal">LReal (8B)</option>
                          <option value="DInt">DInt (4B)</option>
                          <option value="Int">Int (2B)</option>
                          <option value="Bool">Bool (1B)</option>
                          <option value="String">String (Variable)</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <select
                          value={tag.mode}
                          onChange={(e) => handleUpdateTag(tag.id, { mode: e.target.value as 'cyclic' | 'onchange' })}
                          className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none font-medium focus:ring-1 focus:ring-[#00646E]"
                        >
                          <option value="cyclic">{t.modeCyclic}</option>
                          <option value="onchange">{t.modeOnChange}</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0.01"
                            disabled={tag.mode === 'onchange'}
                            value={tag.cycleSec || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              handleUpdateTag(tag.id, { cycleSec: val });
                            }}
                            onBlur={() => {
                              if (!tag.cycleSec || tag.cycleSec <= 0) {
                                handleUpdateTag(tag.id, { cycleSec: 1 });
                              }
                            }}
                            className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-1 focus:ring-[#00646E] outline-none disabled:opacity-40"
                          />
                          <select
                            disabled={tag.mode === 'onchange'}
                            value={[0.1, 0.5, 1, 2, 5, 10, 30, 60].includes(tag.cycleSec) ? tag.cycleSec : 'custom'}
                            onChange={(e) => {
                              if (e.target.value !== 'custom') {
                                handleUpdateTag(tag.id, { cycleSec: parseFloat(e.target.value) });
                              }
                            }}
                            className="p-1 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none disabled:opacity-40 cursor-pointer"
                            title={t.cycleQuickPresets}
                          >
                            <option value="custom">⚡</option>
                            <option value="0.1">{t.cycle100ms}</option>
                            <option value="0.5">{t.cycle500ms}</option>
                            <option value="1">{t.cycle1s}</option>
                            <option value="2">{t.cycle2s}</option>
                            <option value="5">{t.cycle5s}</option>
                            <option value="10">{t.cycle10s}</option>
                            <option value="30">{t.cycle30s}</option>
                            <option value="60">{t.cycle1m}</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-slate-700 dark:text-slate-200 font-semibold">
                        {tag.entriesPerSec.toFixed(3)}
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={tag.count || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                            handleUpdateTag(tag.id, { count: val });
                          }}
                          onBlur={() => {
                            if (!tag.count || tag.count < 1) {
                              handleUpdateTag(tag.id, { count: 1 });
                            }
                          }}
                          className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-1 focus:ring-[#00646E] outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleRemoveTag(tag.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          aria-label="Remove tag"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">{t.colAlarmName}</th>
                  {(alarmLogs.length > 1 || activeAlarmLogFilter === 'all') && (
                    <th className="p-3 font-mono text-amber-600 dark:text-amber-400">{t.colAlarmLog}</th>
                  )}
                  <th className="p-3">{t.colAlarmClass}</th>
                  <th className="p-3">{t.colAlarmTrigger}</th>
                  <th className="p-3">{t.colAlarmEventsPerDay}</th>
                  <th className="p-3">{t.colCount}</th>
                  <th className="p-3 font-mono text-amber-600 dark:text-amber-400">{t.colAlarmTotalEvents}</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {(() => {
                  const displayedAlarmTags = activeAlarmLogFilter === 'all'
                    ? alarmTags
                    : alarmTags.filter(at => (at.alarmLogId ? at.alarmLogId === activeAlarmLogFilter : alarmLogs[0]?.id === activeAlarmLogFilter));

                  if (displayedAlarmTags.length === 0) {
                    return (
                      <tr>
                        <td colSpan={alarmLogs.length > 1 || activeAlarmLogFilter === 'all' ? 8 : 7} className="p-6 text-center text-xs text-slate-500 dark:text-slate-300">
                          {t.alarmTagsEmpty}
                        </td>
                      </tr>
                    );
                  }

                  return displayedAlarmTags.map((at) => {
                    const totalEv = Math.round((at.eventsPerDay || 0) * (at.count || 1));
                    return (
                      <tr key={at.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={at.name}
                            onChange={(e) => handleUpdateAlarmTag(at.id, { name: e.target.value })}
                            className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-medium"
                          />
                        </td>
                        {(alarmLogs.length > 1 || activeAlarmLogFilter === 'all') && (
                          <td className="p-2.5">
                            <select
                              value={at.alarmLogId || alarmLogs[0]?.id}
                              onChange={(e) => handleUpdateAlarmTag(at.id, { alarmLogId: e.target.value })}
                              className="p-1.5 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-amber-600 dark:text-amber-400 outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              {alarmLogs.map((al) => (
                                <option key={al.id} value={al.id}>{al.name}</option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td className="p-2.5">
                          <select
                            value={at.alarmClass}
                            onChange={(e) => handleUpdateAlarmTag(at.id, { alarmClass: e.target.value as UnifiedAlarmTag['alarmClass'] })}
                            className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="Alarm">{t.alarmClassAlarm}</option>
                            <option value="Warning">{t.alarmClassWarning}</option>
                            <option value="Event">{t.alarmClassEvent}</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <select
                            value={at.triggerType}
                            onChange={(e) => handleUpdateAlarmTag(at.id, { triggerType: e.target.value as UnifiedAlarmTag['triggerType'] })}
                            className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="digital">{t.triggerDigital}</option>
                            <option value="analog">{t.triggerAnalog}</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={at.eventsPerDay !== undefined ? at.eventsPerDay : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                              handleUpdateAlarmTag(at.id, { eventsPerDay: val });
                            }}
                            className="w-18 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="1"
                            value={at.count || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value, 10) || 1);
                              handleUpdateAlarmTag(at.id, { count: val });
                            }}
                            className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                          />
                        </td>
                        <td className="p-2.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {totalEv} <span className="text-[10px] font-normal text-slate-400">{t.eventsPerDayShort}</span>
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleRemoveAlarmTag(at.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            aria-label="Remove alarm tag"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Results Dashboard */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            {t.resultsTitle}
          </h2>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
            {result.logItems.length > 1
              ? `${result.logItems.filter(l => l.enabled).length} ${lang === 'ru' ? 'активных журналов' : 'active logs'}`
              : `${formatPlural(result.totalSegments, lang, ['сегмент', 'сегмента', 'сегментов'], ['segment', 'segments'])} ${lang === 'ru' ? 'за' : 'over'} ${formatPlural(config.retentionDays, lang, ['день', 'дня', 'дней'], ['day', 'days'])}`}
          </span>
        </div>

        {/* TIA Portal Multi-Log Specification Table */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-[#00A3B5]" />
                <span>{t.multiLogSpecTitle}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t.multiLogSpecSub}
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00646E]/10 dark:bg-[#00A3B5]/10 text-[#00646E] dark:text-[#00A3B5] font-bold border border-[#00646E]/20">
              TIA Portal V16–V20
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">{t.colLogName}</th>
                  <th className="p-3">{t.colLogCategory}</th>
                  <th className="p-3">{t.colLogEntries}</th>
                  <th className="p-3">{t.colLogTimePeriod}</th>
                  <th className="p-3">{t.colLogSegmentPeriod}</th>
                  <th className="p-3 font-mono text-[#00646E] dark:text-[#00A3B5]">{t.colLogSegmentSize}</th>
                  <th className="p-3 font-mono">{t.colLogMaxSize}</th>
                  <th className="p-3 text-right">{lang === 'ru' ? 'Вес' : 'Size'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {result.logItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                      {item.category === 'data' ? (
                        <Database className="w-3.5 h-3.5 text-[#00A3B5]" />
                      ) : item.category === 'alarm' ? (
                        <Bell className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span>{item.name}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.category === 'data'
                          ? 'bg-[#00646E]/10 text-[#00646E] dark:text-[#00A3B5]'
                          : item.category === 'alarm'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {lang === 'ru' ? item.categoryNameRu : item.categoryNameEn}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">
                      {item.category === 'data'
                        ? `${item.tagCount || 0} ${lang === 'ru' ? 'тегов' : 'tags'} (~${item.entriesPerDay.toLocaleString()} зап/день)`
                        : `~${item.entriesPerDay.toLocaleString()} ${lang === 'ru' ? 'соб/день' : 'ev/day'}`
                      }
                    </td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                      {item.retentionDays}.00:00:00 <span className="text-slate-400 text-[10px]">({item.retentionDays} {lang === 'ru' ? 'дней' : 'd'})</span>
                    </td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                      {item.segmentHours >= 24 ? `${Math.floor(item.segmentHours / 24)}.00:00:00` : `0.${String(item.segmentHours).padStart(2, '0')}:00:00`} <span className="text-slate-400 text-[10px]">({item.segmentHours} {lang === 'ru' ? 'ч' : 'h'})</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-[#00646E] dark:text-[#00A3B5]">
                          {item.sqliteSegmentMb} MB
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyValue(`seg_${item.id}`, item.sqliteSegmentMb)}
                          title={lang === 'ru' ? 'Копировать размер сегмента' : 'Copy segment size'}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {copiedCellKey === `seg_${item.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {item.totalLogMb} MB
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyValue(`log_${item.id}`, item.totalLogMb)}
                          title={lang === 'ru' ? 'Копировать лимит архива' : 'Copy log size'}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {copiedCellKey === `log_${item.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {item.totalLogGb >= 1 ? `${item.totalLogGb.toFixed(2)} GB` : `${item.totalLogMb} MB`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-semibold border-t-2 border-slate-300 dark:border-slate-700">
                <tr>
                  <td colSpan={5} className="p-3 text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[11px] text-[#00646E] dark:text-[#00A3B5]">
                        {t.totalStorageUsedBanner} ({config.storageMedium === 'usb_128g' ? 'USB-X61' : config.storageMedium === 'sd_custom_x52' ? 'SD-X52' : config.storageMedium.startsWith('sd') ? 'SD-X51' : 'SSD'} {config.storageSizeGb} GB):
                      </span>
                    </div>
                  </td>
                  <td colSpan={3} className="p-3 text-right font-mono">
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-sm font-black text-[#00646E] dark:text-[#00A3B5]">
                        {result.totalStorageUsedGb >= 1 ? `${result.totalStorageUsedGb.toFixed(2)} GB` : `${result.totalStorageUsedMb} MB`}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {result.storageOccupancyPct.toFixed(1)}% {lang === 'ru' ? 'емкости' : 'capacity'}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 4 Primary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Entries per Day */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.entriesPerDayLabel}
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.entriesPerDay.toLocaleString()}
            </div>
            <div className="mt-2">
              <TrafficGauge rate={result.totalEntriesPerSec} lang={lang} />
            </div>
          </div>

          {/* SQLite Segment Size (Multiple of 4 MB) */}
          <div className="p-4 rounded-xl border-2 border-[#00646E] bg-[#00646E]/5 dark:bg-[#00A3B5]/10 shadow-sm relative overflow-hidden">
            <div className="text-xs font-semibold text-[#00646E] dark:text-[#00A3B5] mb-1">
              {t.sqliteSegmentLabel}
            </div>
            <div className="text-2xl font-black font-mono text-[#00646E] dark:text-[#00A3B5]">
              {result.sqliteSegmentMb} MB
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {t.sqliteMultiple4Mb}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {lang === 'ru' ? 'Сырой расчет:' : 'Raw calculation:'} {result.rawSegmentMb.toFixed(2)} MB
            </div>
          </div>

          {/* Max Log Size Recommendation */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.totalLogLabel}
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.totalStorageUsedGb >= 1 ? `${result.totalStorageUsedGb.toFixed(2)} GB` : `${result.totalStorageUsedMb} MB`}
            </div>
            <div className="mt-2 text-xs flex items-center gap-1.5">
              {result.rule3SegmentsValid ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t.rule3SegmentsOk}
                </span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1 font-medium text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t.rule3SegmentsBad}
                </span>
              )}
            </div>
          </div>

          {/* Storage Medium Occupancy & Flash Wear */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.storageUsageLabel} ({config.storageSizeGb} GB)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.storageOccupancyPct.toFixed(1)}%
            </div>
            
            {/* Storage bar */}
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5 mb-2">
              <div 
                className={`h-full transition-all duration-300 ${
                  result.storageOccupancyPct > 85 ? 'bg-rose-500' : 'bg-[#00646E] dark:bg-[#00A3B5]'
                }`}
                style={{ width: `${result.storageOccupancyPct}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>{t.flashLifeLabel}:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                ~{result.estimatedFlashLifeYears.toFixed(1)} {lang === 'ru' ? 'лет' : 'yrs'}
              </span>
            </div>
          </div>
        </div>

        {/* Industrial Ethernet Network Load */}
        <div className="mb-6">
          <NetworkBandwidthCard network={result.network} lang={lang} />
        </div>

        {/* Warnings & Siemens Recommendations Box */}
        {result.warnings.length > 0 && (
          <div className="space-y-2">
            {result.warnings.map((w, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Tags Modal */}
      <ImportTagsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportTags}
        tab="unified"
        lang={lang}
      />

      {/* Bulk Add Modal */}
      <BulkAddModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onAdd={handleBulkAddSubmit}
        tab="unified"
        lang={lang}
      />

      {/* Bulk Add Alarm Modal */}
      <BulkAddAlarmModal
        isOpen={isBulkAlarmModalOpen}
        onClose={() => setIsBulkAlarmModalOpen(false)}
        onAdd={handleBulkAddAlarmSubmit}
        alarmLogs={alarmLogs}
        defaultAlarmLogId={activeAlarmLogFilter !== 'all' ? activeAlarmLogFilter : alarmLogs[0]?.id}
        lang={lang}
      />

      {/* Clear Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleClearAllConfirm}
        title={t.confirmClearTitle}
        message={t.confirmClearMsg}
        confirmLabel={t.btnClear}
        cancelLabel={t.btnCancel}
      />
    </div>
  );
};
