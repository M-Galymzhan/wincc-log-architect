'use client';
import React, { useState } from 'react';
import { 
  ComfortTag, ComfortConfig, ComfortResult, Language, ToastMessage,
  ComfortDataLogConfig, ComfortAlarmLogConfig, ComfortAlarmTag
} from '../../lib/types';
import { translations, formatPlural } from '../../lib/i18n';
import { TrafficGauge } from '../TrafficGauge';
import { BulkAddModal } from '../BulkAddModal';
import { BulkAddAlarmModal } from '../BulkAddAlarmModal';
import { ConfirmModal } from '../ConfirmModal';
import { ImportTagsModal } from '../ImportTagsModal';
import { 
  Plus, Trash2, Layers, AlertTriangle, CheckCircle2, 
  ShieldAlert, ShieldCheck, Bell, HardDrive, RefreshCw, Upload,
  Database, Copy, Check, Filter, Activity, Clock
} from 'lucide-react';
import { getSiemensArticle } from '../../lib/calculator/mlfbCatalog';
import { 
  generateTiaPortalCsv, 
  generateTiaPortalAlarmCsv, 
  generateTiaPortalXlsx, 
  generateTiaPortalAlarmXlsx, 
  downloadFile, 
  downloadXlsxFile 
} from '../../lib/tiaExporter';
import { convertToComfortTags, ParsedTagItem } from '../../lib/tagImporter';
import { NetworkBandwidthCard } from '../NetworkBandwidthCard';
import { ExportTiaDropdown } from '../ExportTiaDropdown';

interface ComfortTabProps {
  tags: ComfortTag[];
  setTags: React.Dispatch<React.SetStateAction<ComfortTag[]>>;
  config: ComfortConfig;
  setConfig: React.Dispatch<React.SetStateAction<ComfortConfig>>;
  result: ComfortResult;
  lang: Language;
  onShowToast?: (message: string, type?: ToastMessage['type']) => void;
}

export const ComfortTab: React.FC<ComfortTabProps> = React.memo(({
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
  const [selectedKpiLogId, setSelectedKpiLogId] = useState<string | 'max'>('max');

  // Category & Filter states
  const [activeCategory, setActiveCategory] = useState<'data' | 'alarm'>('data');
  const [activeDataLogFilter, setActiveDataLogFilter] = useState<string | 'all'>('all');
  const [activeAlarmLogFilter, setActiveAlarmLogFilter] = useState<string | 'all'>('all');

  // Multi-Log Accessors & Fallbacks
  const dataLogs: ComfortDataLogConfig[] = config.dataLogs && config.dataLogs.length > 0
    ? config.dataLogs
    : [{ id: 'default_data_log', name: 'Data_Log_1', retentionDays: config.retentionDays || 30, recordsPerLog: config.recordsPerLog || 50000, enabled: true }];

  const alarmLogs: ComfortAlarmLogConfig[] = config.alarmLogs !== undefined
    ? config.alarmLogs
    : [
        { id: 'alarms_log', name: 'Alarms_log', entriesPerDay: 50, retentionDays: config.retentionDays || 30, recordsPerLog: 20000, enabled: true },
        { id: 'events_log', name: 'Events_log', entriesPerDay: 100, retentionDays: config.retentionDays || 30, recordsPerLog: 20000, enabled: true },
      ];

  const alarmTags: ComfortAlarmTag[] = config.alarmTags || [];

  const handleCopyValue = (key: string, value: string | number) => {
    navigator.clipboard.writeText(String(value));
    setCopiedCellKey(key);
    if (onShowToast) onShowToast(t.toastCopied, 'success');
    setTimeout(() => {
      setCopiedCellKey(null);
    }, 2000);
  };

  const handleAddDataLog = () => {
    const defaultRet = config.retentionDays || 30;
    const defaultRec = config.recordsPerLog || 50000;
    const newDl: ComfortDataLogConfig = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Data_Log_${dataLogs.length + 1}`,
      retentionDays: defaultRet,
      recordsPerLog: defaultRec,
      enabled: true,
    };
    setConfig(prev => ({ ...prev, dataLogs: [...dataLogs, newDl] }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Архив данных добавлен' : 'Data log added', 'success');
  };

  const handleUpdateDataLog = (id: string, patch: Partial<ComfortDataLogConfig>) => {
    const updated = dataLogs.map(dl => (dl.id === id ? { ...dl, ...patch } : dl));
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
    const defaultRet = config.retentionDays || 30;
    const defaultRec = 20000;
    const newAl: ComfortAlarmLogConfig = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Alarm_Log_${alarmLogs.length + 1}`,
      entriesPerDay: 50,
      retentionDays: defaultRet,
      recordsPerLog: defaultRec,
      enabled: true,
    };
    setConfig(prev => ({ ...prev, alarmLogs: [...alarmLogs, newAl] }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Архив аварий добавлен' : 'Alarm log added', 'success');
  };

  const handleUpdateAlarmLog = (id: string, patch: Partial<ComfortAlarmLogConfig>) => {
    const updated = alarmLogs.map(al => (al.id === id ? { ...al, ...patch } : al));
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

  const handleAddAlarmTag = () => {
    const fallbackLogId = alarmLogs[0]?.id || 'alarms_log';
    const newTag: ComfortAlarmTag = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Alarm_${alarmTags.length + 1}`,
      alarmClass: 'Alarm',
      triggerType: 'digital',
      eventsPerDay: 5,
      count: 1,
      alarmLogId: fallbackLogId,
    };
    setConfig(prev => ({ ...prev, alarmTags: [...(prev.alarmTags || []), newTag] }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Аварийный сигнал добавлен' : 'Alarm tag added', 'success');
  };

  const handleUpdateAlarmTag = (id: string, patch: Partial<ComfortAlarmTag>) => {
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
  };

  const handleClearAlarmTags = () => {
    setConfig(prev => ({ ...prev, alarmTags: [] }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Список сигналов тревог очищен' : 'Alarm tags cleared', 'info');
  };

  const handleBulkAlarmSubmit = (params: {
    count: number;
    prefix: string;
    eventsPerDay: number;
    alarmClass: ComfortAlarmTag['alarmClass'];
    triggerType: ComfortAlarmTag['triggerType'];
    alarmLogId: string;
  }) => {
    const newAlarmTag: ComfortAlarmTag = {
      id: Math.random().toString(36).substring(2, 9),
      name: `${params.prefix}${params.count}x`,
      alarmClass: params.alarmClass,
      triggerType: params.triggerType,
      eventsPerDay: params.eventsPerDay,
      count: params.count,
      alarmLogId: params.alarmLogId,
    };
    setConfig(prev => ({
      ...prev,
      alarmTags: [...(prev.alarmTags || []), newAlarmTag],
    }));
    if (onShowToast) onShowToast(t.toastBulkAdded, 'success');
  };

  const handleApplyDefaultsToAll = () => {
    const targetRetention = Math.max(1, config.retentionDays || 30);
    const targetRecords = Math.min(500000, Math.max(1000, config.recordsPerLog || 50000));
    const updatedDl = dataLogs.map(dl => ({
      ...dl,
      retentionDays: targetRetention,
      recordsPerLog: targetRecords,
    }));
    const updatedAl = alarmLogs.map(al => ({
      ...al,
      retentionDays: targetRetention,
      recordsPerLog: targetRecords,
    }));
    setConfig(prev => ({ ...prev, dataLogs: updatedDl, alarmLogs: updatedAl }));
    if (onShowToast) {
      onShowToast(
        lang === 'ru'
          ? `Применены значения: ${targetRetention} дн., ${targetRecords.toLocaleString()} зап./файл`
          : `Applied to all logs: ${targetRetention} d, ${targetRecords.toLocaleString()} rec/file`,
        'success'
      );
    }
  };

  const handleImportTags = (parsedTags: ParsedTagItem[], mode: 'append' | 'replace') => {
    const converted = convertToComfortTags(parsedTags);
    const fallbackLogId = dataLogs[0]?.id || 'default_data_log';
    const mapped = converted.map(ct => ({
      ...ct,
      dataLogId: ct.dataLogId || fallbackLogId,
    }));
    if (mode === 'replace') {
      setTags(mapped);
    } else {
      setTags(prev => [...prev, ...mapped]);
    }
    if (onShowToast) {
      onShowToast(t.importToastSuccess.replace('{n}', String(converted.length)), 'success');
    }
  };

  const handleAddTag = () => {
    const fallbackLogId = dataLogs[0]?.id || 'default_data_log';
    const newTag: ComfortTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `Tag_${tags.length + 1}`,
      mode: 'cyclic',
      cycleSec: 2,
      count: 1,
      dataType: 'Real',
      dataLogId: fallbackLogId,
    };
    setTags([...tags, newTag]);
    if (onShowToast) onShowToast(lang === 'ru' ? 'Тег добавлен' : 'Tag added', 'success');
  };

  const handleBulkAddSubmit = (params: {
    count: number;
    prefix: string;
    cycleSec: number;
    mode: 'cyclic' | 'onchange';
    dataType?: 'Real' | 'LReal' | 'DInt' | 'Int' | 'Bool' | 'String';
    dataLogId?: string;
  }) => {
    const fallbackLogId = params.dataLogId || dataLogs[0]?.id || 'default_data_log';
    const newTag: ComfortTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `${params.prefix}${params.count}x`,
      mode: params.mode,
      cycleSec: params.cycleSec,
      count: params.count,
      dataType: params.dataType || 'Real',
      dataLogId: fallbackLogId,
    };
    setTags(prev => [...prev, newTag]);
    if (onShowToast) onShowToast(t.toastBulkAdded, 'success');
  };

  const handleLoadSample = () => {
    setTags([
      { id: '1', description: lang === 'ru' ? 'Температуры зон печи (1с)' : 'Oven Zone Temperatures (1s)', mode: 'cyclic', cycleSec: 1, count: 20, dataType: 'Real', dataLogId: 'default_data_log' },
      { id: '2', description: lang === 'ru' ? 'Давление и скорость линии (2с)' : 'Line Pressures & Speed (2s)', mode: 'cyclic', cycleSec: 2, count: 50, dataType: 'Real', dataLogId: 'default_data_log' },
      { id: '3', description: lang === 'ru' ? 'Суточные счетчики продукции (10с)' : 'Daily Counters (10s)', mode: 'cyclic', cycleSec: 10, count: 30, dataType: 'DInt', dataLogId: 'default_data_log' },
      { id: '4', description: lang === 'ru' ? 'Действия оператора (По изм.)' : 'Operator Actions (On change)', mode: 'onchange', cycleSec: 60, count: 100, dataType: 'Int', dataLogId: 'default_data_log' },
    ]);
    setConfig(prev => ({
      ...prev,
      dataLogs: [
        { id: 'default_data_log', name: 'Process_Data_1', retentionDays: 30, recordsPerLog: 50000, enabled: true },
        { id: 'log_fast', name: 'HighSpeed_Log', retentionDays: 14, recordsPerLog: 100000, enabled: true },
      ],
      alarmLogs: [
        { id: 'alarms_log', name: 'Alarms_log', entriesPerDay: 50, retentionDays: 30, recordsPerLog: 20000, enabled: true },
        { id: 'events_log', name: 'Events_log', entriesPerDay: 100, retentionDays: 30, recordsPerLog: 20000, enabled: true },
      ],
      alarmTags: [
        { id: 'alm_1', name: 'Motor_M101_Trip', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 2, count: 4, alarmLogId: 'alarms_log' },
        { id: 'alm_2', name: 'Reactor_Pressure_HH', alarmClass: 'Alarm', triggerType: 'analog', eventsPerDay: 1, count: 2, alarmLogId: 'alarms_log' },
        { id: 'alm_3', name: 'Emergency_Stop_PB1', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 0.5, count: 2, alarmLogId: 'alarms_log' },
        { id: 'alm_4', name: 'Auto_Cycle_Start', alarmClass: 'Event', triggerType: 'digital', eventsPerDay: 40, count: 5, alarmLogId: 'events_log' },
        { id: 'alm_5', name: 'Recipe_Download_Done', alarmClass: 'Event', triggerType: 'digital', eventsPerDay: 10, count: 2, alarmLogId: 'events_log' },
      ],
    }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Загружен типовой проект Comfort' : 'Sample Comfort tags loaded', 'info');
  };

  const handleUpdateTag = (id: string, updates: Partial<ComfortTag>) => {
    setTags(tags.map(tItem => tItem.id === id ? { ...tItem, ...updates } : tItem));
  };

  const handleRemoveTag = (id: string) => {
    setTags(tags.filter(tItem => tItem.id !== id));
  };

  const handleClearAllConfirm = () => {
    setTags([]);
    if (onShowToast) onShowToast(t.toastCleared, 'info');
  };

  const handleExportTiaCsv = () => {
    const csv = generateTiaPortalCsv('comfort', tags, 'Data_Log_1', dataLogs);
    downloadFile(csv, `TIA_WinCC_Comfort_Tags_${new Date().toISOString().slice(0, 10)}.csv`);
    if (onShowToast) onShowToast(t.exportTiaSuccess, 'success');
  };

  const handleExportTiaXlsx = () => {
    const xlsxData = generateTiaPortalXlsx('comfort', tags, 'Data_Log_1', dataLogs);
    downloadXlsxFile(xlsxData, `TIA_WinCC_Comfort_Tags_${new Date().toISOString().slice(0, 10)}.xlsx`);
    if (onShowToast) onShowToast(t.exportTiaXlsxSuccess, 'success');
  };

  const handleExportTiaAlarmCsv = () => {
    const csv = generateTiaPortalAlarmCsv(alarmTags, alarmLogs);
    downloadFile(csv, `TIA_WinCC_Comfort_Alarms_${new Date().toISOString().slice(0, 10)}.csv`);
    if (onShowToast) onShowToast(t.exportTiaSuccess, 'success');
  };

  const handleExportTiaAlarmXlsx = () => {
    const xlsxData = generateTiaPortalAlarmXlsx(alarmTags, alarmLogs);
    downloadXlsxFile(xlsxData, `TIA_WinCC_Comfort_Alarms_${new Date().toISOString().slice(0, 10)}.xlsx`);
    if (onShowToast) onShowToast(t.exportTiaXlsxSuccess, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Device & Configuration Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Device Profile & Storage */}
        <div className="xl:col-span-5 glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <HardDrive className="w-5 h-5 text-emerald-500" />
              {t.comfortDeviceTitle}
            </h2>

            <div className="space-y-2.5">
              <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.deviceType === 'comfort_panel'
                  ? 'border-emerald-600 bg-emerald-600/5 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="comfortDevice"
                  checked={config.deviceType === 'comfort_panel'}
                  onChange={() => {
                    const medium = config.storageMedium === 'ssd_custom' ? 'sd_2g' : (config.storageMedium || 'sd_2g');
                    const sizeGb = medium === 'sd_512m' ? 0.5 : medium === 'sd_2g' ? 2 : medium === 'sd_4g' ? 4 : medium === 'sd_12g' ? 12 : medium === 'sd_32g' ? 32 : (config.storageSizeGb || 2);
                    setConfig({ ...config, deviceType: 'comfort_panel', storageMedium: medium, storageSizeGb: sizeGb, storageMediumMb: Math.round(sizeGb * 1024) });
                  }}
                  className="accent-emerald-600 w-4 h-4 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="text-base font-semibold text-slate-900 dark:text-white">{t.comfortPanel}</div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 shrink-0">
                      {t.comfortHardwareLimitBadge}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Windows CE 6.0, SIMATIC SD Card (X51 slot)</div>
                  
                  {/* Hardware Limit Alert for Comfort Panels */}
                  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{t.comfortHardwareLimitText}</span>
                  </div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.deviceType === 'rt_advanced'
                  ? 'border-emerald-600 bg-emerald-600/5 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="comfortDevice"
                  checked={config.deviceType === 'rt_advanced'}
                  onChange={() => {
                    const medium = 'ssd_custom';
                    const sizeGb = config.storageSizeGb || 128;
                    setConfig({ ...config, deviceType: 'rt_advanced', storageMedium: medium, storageSizeGb: sizeGb, storageMediumMb: Math.round(sizeGb * 1024) });
                  }}
                  className="accent-emerald-600 w-4 h-4"
                />
                <div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white">{t.comfortRtAdv}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Windows PC, local HDD/SSD or Network share</div>
                </div>
              </label>
            </div>

            {/* Storage medium selection */}
            <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
              <label className="text-sm font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                {t.comfortStorageSelect}
              </label>
              <select
                value={config.storageMedium || (config.deviceType === 'rt_advanced' ? 'ssd_custom' : 'sd_2g')}
                onChange={(e) => {
                  const val = e.target.value as ComfortConfig['storageMedium'];
                  let gb = 2;
                  if (val === 'sd_512m') gb = 0.5;
                  else if (val === 'sd_2g') gb = 2;
                  else if (val === 'sd_4g') gb = 4;
                  else if (val === 'sd_12g') gb = 12;
                  else if (val === 'sd_32g') gb = 32;
                  else if (val === 'usb_128g') gb = 128;
                  else if (val === 'usb_custom') gb = config.storageMedium === 'usb_custom' ? (config.storageSizeGb || 32) : 32;
                  else if (val === 'sd_custom' || val === 'sd_custom_x52') gb = (config.storageMedium === 'sd_custom' || config.storageMedium === 'sd_custom_x52') ? (config.storageSizeGb || 16) : 16;
                  else if (val === 'ssd_custom') gb = config.storageMedium === 'ssd_custom' ? (config.storageSizeGb || 256) : 256;
                  setConfig({ 
                    ...config, 
                    storageMedium: val, 
                    storageSizeGb: gb, 
                    storageMediumMb: Math.round(gb * 1024),
                    nandClass: (val === 'sd_custom' || val === 'sd_custom_x52' || val === 'usb_custom') ? (config.nandClass || 'tlc') : undefined 
                  });
                }}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                {config.deviceType === 'comfort_panel' ? (
                  <>
                    <option value="sd_512m">SIMATIC SD 512 MB (SLC)</option>
                    <option value="sd_2g">SIMATIC SD 2 GB (SLC Standard)</option>
                    <option value="sd_4g">SIMATIC SD 4 GB (SLC)</option>
                    <option value="sd_12g">SIMATIC SD 12 GB (SLC)</option>
                    <option value="sd_32g">SIMATIC SD 32 GB (SDHC, FAT32)</option>
                    <option value="sd_custom_x52">{t.comfortStorageSdCustom}</option>
                    <option value="usb_128g">Industrial USB Flash 128 GB</option>
                    <option value="usb_custom">{t.comfortStorageUsbCustom}</option>
                  </>
                ) : (
                  <>
                    <option value="ssd_custom">{t.comfortStorageSsdPc}</option>
                    <option value="usb_128g">Industrial USB Flash 128 GB</option>
                    <option value="usb_custom">{t.storageUsbCustom}</option>
                  </>
                )}
              </select>

              {(config.storageMedium === 'ssd_custom' || config.storageMedium === 'sd_custom' || config.storageMedium === 'sd_custom_x52' || config.storageMedium === 'usb_custom') && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {config.storageMedium === 'sd_custom' || config.storageMedium === 'sd_custom_x52'
                      ? (lang === 'ru' ? 'Емкость SDHC (FAT32):' : 'SDHC capacity (FAT32):')
                      : config.storageMedium === 'usb_custom'
                      ? (lang === 'ru' ? 'Емкость USB (FAT32):' : 'USB capacity (FAT32):')
                      : `${t.storageCustom}:`}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={config.storageSizeGb || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 1 : Math.max(1, parseFloat(e.target.value) || 1);
                      setConfig({ ...config, storageSizeGb: val, storageMediumMb: Math.round(val * 1024) });
                    }}
                    className="p-1 px-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-20 font-mono focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">GB</span>
                  <div className="flex items-center gap-1">
                    {(config.storageMedium === 'ssd_custom' ? [128, 256, 512, 1024] : [4, 8, 16, 32]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setConfig({ ...config, storageSizeGb: size, storageMediumMb: size * 1024 })}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                          config.storageSizeGb === size
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {size}G
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(config.storageMedium === 'sd_custom' || config.storageMedium === 'sd_custom_x52' || config.storageMedium === 'usb_custom') && (
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {t.nandClassLabel}
                  </span>
                  <select
                    value={config.nandClass || 'tlc'}
                    onChange={(e) => setConfig({ ...config, nandClass: e.target.value as import('../../lib/types').NandClass })}
                    className="p-1.5 px-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
                  >
                    <option value="slc">{t.nandClassSlc}</option>
                    <option value="pslc">{t.nandClassPslc}</option>
                    <option value="mlc">{t.nandClassMlc}</option>
                    <option value="tlc">{t.nandClassTlc}</option>
                    <option value="qlc">{t.nandClassQlc}</option>
                  </select>
                </div>
              )}

              {/* High Endurance Recommendation for Custom Media */}
              {config.deviceType === 'comfort_panel' && (config.storageMedium === 'sd_custom' || config.storageMedium === 'sd_custom_x52' || config.storageMedium === 'usb_custom') && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200 mb-1">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{t.sdX52RecommendationTitle}</span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                    {t.sdX52RecommendationText}
                  </p>
                </div>
              )}

              {/* Windows CE Hardware Limit Warning (> 32 GB) */}
              {config.deviceType === 'comfort_panel' && (config.storageSizeGb || 0) > 32 && (
                <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-300 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>{lang === 'ru' ? 'Аппаратное ограничение Windows CE 6.0 (> 32 GB)' : 'Windows CE 6.0 Hardware Limit (> 32 GB)'}</span>
                  </div>
                  <p className="text-xs text-red-900/90 dark:text-red-200/90 leading-relaxed">
                    {lang === 'ru'
                      ? 'Контроллер панелей SIMATIC Comfort (Windows CE 6.0) аппаратно поддерживает SDHC карты объемом строго до 32 ГБ в файловой системе FAT32. Флешки SDXC (>32 ГБ) и exFAT не распознаются операционной системой панели!'
                      : 'SIMATIC Comfort Panels (Windows CE 6.0) hardware controller strictly supports SDHC cards up to 32 GB in FAT32. SDXC (>32 GB) and exFAT format are not recognized by Windows CE!'}
                  </p>
                </div>
              )}

              {/* Siemens MLFB Article Info */}
              {(() => {
                const mediumKey = config.storageMedium || 'sd_2g';
                const article = getSiemensArticle(mediumKey);
                return (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                        {t.mlfbSiemensArticle}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-600/10 dark:bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-600/20 dark:border-emerald-400/20">
                        {article.mlfb}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {lang === 'ru' ? article.descriptionRu : article.descriptionEn}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Format selection: RDB vs CSV */}
          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
            <label className="text-sm font-semibold block mb-2 text-slate-700 dark:text-slate-300">
              {lang === 'ru' ? 'Формат архива (Log format):' : 'Log format (Storage type):'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfig({ ...config, format: 'rdb' })}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  config.format === 'rdb'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="text-sm font-semibold">{t.formatRdb}</div>
                <div className="text-xs text-slate-500 font-normal mt-0.5">{t.comfortFormatRdbSub}</div>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, format: 'csv' })}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  config.format === 'csv'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="text-sm font-semibold">{t.formatCsv}</div>
                <div className="text-xs text-slate-500 font-normal mt-0.5">{t.comfortFormatCsvSub}</div>
              </button>
            </div>
          </div>
        </div>

        {/* Comfort Global Parameters & Multi-Log Manager */}
        <div className="xl:col-span-7 glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500" />
                <div>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    {lang === 'ru' ? 'Параметры ротации и архивы' : 'Archive Rotation & Logs'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.globalParamsHint}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleApplyDefaultsToAll}
                  className="text-xs text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 font-medium cursor-pointer border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg bg-white/60 dark:bg-slate-800/60 transition-colors"
                  title={lang === 'ru' ? 'Применить текущие глобальные параметры ко всем архивам' : 'Apply current global parameters to all logs'}
                >
                  <RefreshCw className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.btnApplyDefaultsToAll}</span>
                </button>
                <button
                  onClick={handleLoadSample}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  {lang === 'ru' ? 'Загрузить демо' : 'Load Sample'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
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
                  className="p-2.5 text-base font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{t.retentionHelper}</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {t.recordsPerLogLabel}
                </label>
                <input
                  type="number"
                  min="1000"
                  max="500000"
                  step="1000"
                  value={config.recordsPerLog || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                    setConfig({ ...config, recordsPerLog: val });
                  }}
                  onBlur={() => {
                    if (!config.recordsPerLog || config.recordsPerLog < 1000) {
                      setConfig({ ...config, recordsPerLog: 50000 });
                    }
                  }}
                  className="p-2.5 text-base font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{t.recordsPerLogHelper}</span>
              </div>
            </div>

            {/* Multi-Log Manager: Data Logs & Alarm Logs */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
              {/* Section 1: Data Logs List */}
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {t.dataLogsSectionTitle} ({dataLogs.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDataLog}
                    className="px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t.btnAddDataLog}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {dataLogs.map((dl) => {
                    const assignedTagsCount = tags.filter(tItem => (tItem.dataLogId ? tItem.dataLogId === dl.id : dataLogs[0]?.id === dl.id)).length;
                    return (
                      <div
                        key={dl.id}
                        className={`p-2.5 rounded-xl border text-xs transition-all space-y-2 shadow-2xs ${
                          dl.enabled
                            ? 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90'
                            : 'border-slate-200/50 dark:border-slate-800/40 bg-slate-100/50 dark:bg-slate-900/40 opacity-60'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={dl.enabled}
                              onChange={(e) => handleUpdateDataLog(dl.id, { enabled: e.target.checked })}
                              className="accent-emerald-600 w-4 h-4 rounded cursor-pointer shrink-0"
                              title={dl.enabled ? 'Disable log' : 'Enable log'}
                            />
                            <input
                              type="text"
                              value={dl.name}
                              onChange={(e) => handleUpdateDataLog(dl.id, { name: e.target.value })}
                              placeholder={t.logNamePlaceholder}
                              className="font-mono font-bold text-sm p-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100 flex-1 min-w-[120px] max-w-[200px] outline-none focus:border-emerald-600"
                            />
                            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                              {assignedTagsCount} {lang === 'ru' ? 'тегов' : 'tags'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <button
                              type="button"
                              onClick={() => handleRemoveDataLog(dl.id)}
                              disabled={dataLogs.length <= 1}
                              className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              title="Delete log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Parameters Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                          <div className="flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                              {t.cardRetentionLabel}
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={dl.retentionDays || ''}
                              onChange={(e) => handleUpdateDataLog(dl.id, { retentionDays: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                              className="w-14 p-0.5 px-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                            />
                            <span className="text-xs text-slate-400 font-mono">{t.unitDays}</span>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                              {lang === 'ru' ? 'Записей:' : 'Records:'}
                            </span>
                            <input
                              type="number"
                              min="1000"
                              max="500000"
                              step="1000"
                              value={dl.recordsPerLog || ''}
                              onChange={(e) => handleUpdateDataLog(dl.id, { recordsPerLog: Math.min(500000, Math.max(1000, parseInt(e.target.value, 10) || 1000)) })}
                              className="w-20 p-0.5 px-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                            />
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
                      {t.alarmLogsSectionTitle} ({alarmLogs.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAlarmLog}
                    className="px-2 py-1 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t.btnAddAlarmLog}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {alarmLogs.map((al) => {
                    const tagCount = alarmTags.filter(at => (at.alarmLogId ? at.alarmLogId === al.id : alarmLogs[0]?.id === al.id)).length;
                    const calculatedFromTags = alarmTags
                      .filter(at => (at.alarmLogId ? at.alarmLogId === al.id : alarmLogs[0]?.id === al.id))
                      .reduce((sum, at) => sum + (at.eventsPerDay * (at.count || 1)), 0);
                    const effectiveEvents = calculatedFromTags > 0 ? calculatedFromTags : (al.entriesPerDay || 0);

                    return (
                      <div
                        key={al.id}
                        className={`p-2.5 rounded-xl border text-xs transition-all space-y-2 shadow-2xs ${
                          al.enabled
                            ? 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90'
                            : 'border-slate-200/50 dark:border-slate-800/40 bg-slate-100/50 dark:bg-slate-900/40 opacity-60'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={al.enabled}
                              onChange={(e) => handleUpdateAlarmLog(al.id, { enabled: e.target.checked })}
                              className="accent-amber-600 w-4 h-4 rounded cursor-pointer shrink-0"
                              title={al.enabled ? 'Disable log' : 'Enable log'}
                            />
                            <input
                              type="text"
                              value={al.name}
                              onChange={(e) => handleUpdateAlarmLog(al.id, { name: e.target.value })}
                              placeholder={t.logNamePlaceholder}
                              className="font-mono font-bold text-sm p-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100 flex-1 min-w-[120px] max-w-[200px] outline-none focus:border-amber-600"
                            />
                            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold">
                              ~{Math.round(effectiveEvents)} {t.eventsPerDayShort} ({tagCount} {lang === 'ru' ? 'сигн.' : 'sigs'})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <button
                              type="button"
                              onClick={() => handleRemoveAlarmLog(al.id)}
                              disabled={alarmLogs.length <= 1}
                              className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              title={lang === 'ru' ? 'Удалить журнал' : 'Delete log'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Parameters Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                          <div className="flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                              {t.cardRetentionLabel}
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={al.retentionDays || ''}
                              onChange={(e) => handleUpdateAlarmLog(al.id, { retentionDays: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                              className="w-14 p-0.5 px-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                            />
                            <span className="text-xs text-slate-400 font-mono">{t.unitDays}</span>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                              {lang === 'ru' ? 'Записей:' : 'Records:'}
                            </span>
                            <input
                              type="number"
                              min="1000"
                              max="500000"
                              step="1000"
                              value={al.recordsPerLog || ''}
                              onChange={(e) => handleUpdateAlarmLog(al.id, { recordsPerLog: Math.min(500000, Math.max(1000, parseInt(e.target.value, 10) || 1000)) })}
                              className="w-20 p-0.5 px-1 text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section: Audit Trail Toggle (GMP / 21 CFR Part 11) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 mt-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{t.auditToggle}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      min="0"
                      disabled={!config.includeAudit}
                      value={config.auditEntriesPerDay || 200}
                      onChange={(e) => setConfig(prev => ({ ...prev, auditEntriesPerDay: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      className="w-20 p-0.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.auditPerDay}</span>
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.includeAudit || false}
                onChange={(e) => setConfig(prev => ({ ...prev, includeAudit: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {lang === 'ru' ? 'Правило TIA Portal: ' : 'TIA Portal Rule: '}
            </span>
            {lang === 'ru'
              ? 'В WinCC Comfort архивы разделяются на цепочку последовательных файлов (Sequence of log files). Рекомендуется держать размер одного файла до 100 000 записей для быстрого открытия графиков Trends на панели без задержек UI.'
              : 'In WinCC Comfort, historical data is divided into a circular sequence of log files. Keeping individual files under 100,000 records ensures instant trend display performance without panel UI freeze.'}
          </div>
        </div>
      </div>

      {/* Tags & Alarms Section */}
      <div className="glass-panel p-5 rounded-2xl">
        {/* Category Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-4 max-w-fit border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveCategory('data')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'data'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
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
                  <Layers className="w-5 h-5 text-emerald-500" />
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
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                  title={t.btnImportTagsFull}
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{t.btnImportTags}</span>
                </button>
                <ExportTiaDropdown
                  onExportXlsx={handleExportTiaXlsx}
                  onExportCsv={handleExportTiaCsv}
                  lang={lang}
                  themeColor="emerald"
                  buttonLabel={lang === 'ru' ? 'Экспорт TIA' : 'Export TIA'}
                  tooltipTitle={t.btnExportTia}
                />
                <button
                  onClick={handleAddTag}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">{lang === 'ru' ? 'Тег' : 'Tag'}</span>
                  <span className="hidden sm:inline">{t.btnAddTag}</span>
                </button>
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
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
                <ExportTiaDropdown
                  onExportXlsx={handleExportTiaAlarmXlsx}
                  onExportCsv={handleExportTiaAlarmCsv}
                  lang={lang}
                  themeColor="amber"
                  buttonLabel={lang === 'ru' ? 'Экспорт TIA' : 'Export TIA'}
                  tooltipTitle={lang === 'ru' ? 'Экспорт аварийных сигналов в TIA Portal' : 'Export alarm tags to TIA Portal'}
                />
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
              <Filter className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>{t.filterDataLogPrefix}</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveDataLogFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                activeDataLogFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
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
                      ? 'bg-emerald-600 text-white shadow-xs'
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
                    <th className="p-3 font-mono text-emerald-600 dark:text-emerald-400">{t.colDataLog}</th>
                  )}
                  <th className="p-3">{t.colType}</th>
                  <th className="p-3">{t.colMode}</th>
                  <th className="p-3">{t.colCycle}</th>
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
                        <td colSpan={dataLogs.length > 1 || activeDataLogFilter === 'all' ? 7 : 6} className="p-6 text-center text-xs text-slate-500 dark:text-slate-300">
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
                          className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </td>

                      {(dataLogs.length > 1 || activeDataLogFilter === 'all') && (
                        <td className="p-2.5">
                          <select
                            value={tag.dataLogId || dataLogs[0]?.id || 'default_data_log'}
                            onChange={(e) => handleUpdateTag(tag.id, { dataLogId: e.target.value })}
                            className="p-1.5 text-xs font-mono font-medium rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 max-w-[140px]"
                          >
                            {dataLogs.map(dl => (
                              <option key={dl.id} value={dl.id}>{dl.name}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      <td className="p-2.5">
                        <select
                          value={tag.dataType || 'Real'}
                          onChange={(e) => handleUpdateTag(tag.id, { dataType: e.target.value as ComfortTag['dataType'] })}
                          className="p-1.5 text-xs font-mono font-medium rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="Real">Real (4B)</option>
                          <option value="LReal">LReal (8B)</option>
                          <option value="DInt">DInt (4B)</option>
                          <option value="Int">Int (2B)</option>
                          <option value="Bool">Bool (1B)</option>
                          <option value="String">String</option>
                        </select>
                      </td>

                      <td className="p-2.5">
                        <select
                          value={tag.mode}
                          onChange={(e) => handleUpdateTag(tag.id, { mode: e.target.value as 'cyclic' | 'onchange' })}
                          className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="cyclic">{t.modeCyclic}</option>
                          <option value="onchange">{t.modeOnChange}</option>
                        </select>
                      </td>

                      <td className="p-2.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            min="0.1"
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
                            className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-40"
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
                          className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
                            className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono"
                          />
                        </td>

                        {(alarmLogs.length > 1 || activeAlarmLogFilter === 'all') && (
                          <td className="p-2.5">
                            <select
                              value={at.alarmLogId || alarmLogs[0]?.id || 'alarms_log'}
                              onChange={(e) => handleUpdateAlarmTag(at.id, { alarmLogId: e.target.value })}
                              className="p-1.5 text-xs font-mono font-medium rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-amber-500 max-w-[140px]"
                            >
                              {alarmLogs.map(al => (
                                <option key={al.id} value={al.id}>{al.name}</option>
                              ))}
                            </select>
                          </td>
                        )}

                        <td className="p-2.5">
                          <select
                            value={at.alarmClass || 'Alarm'}
                            onChange={(e) => handleUpdateAlarmTag(at.id, { alarmClass: e.target.value as 'Alarm' | 'Warning' | 'Event' })}
                            className="p-1.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="Alarm">{t.alarmClassAlarm}</option>
                            <option value="Warning">{t.alarmClassWarning}</option>
                            <option value="Event">{t.alarmClassEvent}</option>
                          </select>
                        </td>

                        <td className="p-2.5">
                          <select
                            value={at.triggerType || 'digital'}
                            onChange={(e) => handleUpdateAlarmTag(at.id, { triggerType: e.target.value as 'digital' | 'analog' })}
                            className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="digital">{t.triggerDigital}</option>
                            <option value="analog">{t.triggerAnalog}</option>
                          </select>
                        </td>

                        <td className="p-2.5">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={at.eventsPerDay !== undefined ? at.eventsPerDay : ''}
                            onChange={(e) => handleUpdateAlarmTag(at.id, { eventsPerDay: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-18 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                          />
                        </td>

                        <td className="p-2.5">
                          <input
                            type="number"
                            min="1"
                            value={at.count || 1}
                            onChange={(e) => handleUpdateAlarmTag(at.id, { count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                          />
                        </td>

                        <td className="p-2.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                          ~{totalEv}
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

      {/* Comfort Results Cards */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            {t.resultsTitle}
          </h2>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
            {result.logItems.length > 1
              ? `${result.logItems.filter(l => l.enabled).length} ${lang === 'ru' ? 'активных архивов' : 'active logs'}`
              : `${formatPlural(result.recommendedLogFiles, lang, ['файл архива', 'файла архива', 'файлов архива'], ['archive file', 'archive files'])} ${lang === 'ru' ? 'за' : 'over'} ${formatPlural(config.retentionDays, lang, ['день', 'дня', 'дней'], ['day', 'days'])}`}
          </span>
        </div>

        {/* TIA Portal Multi-Log Specification Table */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t.multiLogSpecTitle}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'ru'
                  ? 'Точные значения для Historical Data → Data logs / Alarm logs в TIA Portal V14–V21+'
                  : 'Exact values for Historical Data → Data logs / Alarm logs in TIA Portal V14–V21+'}
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
              TIA Portal V14–V21+
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">{t.colLogName}</th>
                  <th className="p-3">{t.colLogCategory}</th>
                  <th className="p-3">{t.colLogEntries}</th>
                  <th className="p-3">{lang === 'ru' ? 'Период' : 'Retention'}</th>
                  <th className="p-3 font-mono text-emerald-600 dark:text-emerald-400">{t.comfortRecordsPerFileLabel}</th>
                  <th className="p-3 font-mono text-emerald-700 dark:text-emerald-300">{t.comfortSequenceFilesLabel}</th>
                  <th className="p-3 font-mono">{lang === 'ru' ? 'Путь хранения' : 'Storage Path'}</th>
                  <th className="p-3">{lang === 'ru' ? 'Формат' : 'Format'}</th>
                  <th className="p-3 text-right">{lang === 'ru' ? 'Объем' : 'Size'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {result.logItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                      {item.category === 'data' ? (
                        <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Bell className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span>{item.name}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.category === 'data'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {lang === 'ru' ? item.categoryNameRu : item.categoryNameEn}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">
                      {item.category === 'data'
                        ? `~${item.entriesPerDay.toLocaleString()} зап/день`
                        : `~${item.entriesPerDay.toLocaleString()} соб/день`
                      }
                    </td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                      {item.retentionDays} {lang === 'ru' ? 'дней' : 'd'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                          {item.recordsPerLog.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyValue(`rec_${item.id}`, item.recordsPerLog)}
                          title={t.comfortCopyRecordsTooltip}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {copiedCellKey === `rec_${item.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {item.recommendedLogFiles}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyValue(`files_${item.id}`, item.recommendedLogFiles)}
                          title={t.comfortCopySequenceTooltip}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {copiedCellKey === `files_${item.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {item.path}
                    </td>
                    <td className="p-3 uppercase font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300">
                      {item.format}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {item.totalLogGb >= 1 ? `${item.totalLogGb.toFixed(2)} GB` : `${item.totalLogMb.toFixed(0)} MB`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-semibold border-t-2 border-slate-300 dark:border-slate-700">
                <tr>
                  <td colSpan={6} className="p-3 text-slate-800 dark:text-slate-200">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-emerald-700 dark:text-emerald-400">
                      {lang === 'ru' ? 'Общий объем всех архивов Comfort' : 'Total Storage Occupied by Comfort Logs'} ({config.storageSizeGb || (config.storageMediumMb / 1024)} GB):
                    </span>
                  </td>
                  <td colSpan={3} className="p-3 text-right font-mono">
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                        {result.totalStorageUsedGb >= 1 ? `${result.totalStorageUsedGb.toFixed(2)} GB` : `${result.totalStorageUsedMb} MB`}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${result.storageOccupancyPct > 100 ? 'bg-red-500 text-white dark:bg-red-900 dark:text-red-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
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
          {/* Card 1: Entries per Day & Traffic Gauge */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.entriesPerDayLabel}
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.recordsPerDay.toLocaleString()}
            </div>
            <div className="mt-2">
              <TrafficGauge 
                rate={result.entriesPerSec} 
                lang={lang}
                warnThreshold={config.deviceType === 'comfort_panel' ? 15 : 100}
                critThreshold={config.deviceType === 'comfort_panel' ? 50 : 250}
                maxRate={config.deviceType === 'comfort_panel' ? 100 : 300}
              />
            </div>
          </div>

          {/* Card 2 & Card 3: TIA Portal Parameters (Records per file & Sequence files) */}
          {(() => {
            const activeKpiLogs = result.logItems.filter((i) => i.enabled && (i.totalLogMb > 0 || i.entriesPerDay > 0));
            const fallbackKpiLogs = activeKpiLogs.length > 0 ? activeKpiLogs : result.logItems;
            const maxRecordsLog = fallbackKpiLogs.reduce((max, cur) => (
              cur.recordsPerLog > max.recordsPerLog ? cur : max
            ), fallbackKpiLogs[0]);
            const maxFilesLog = fallbackKpiLogs.reduce((max, cur) => (
              cur.recommendedLogFiles > max.recommendedLogFiles ? cur : max
            ), fallbackKpiLogs[0]);
            const currentRecordsLog = selectedKpiLogId === 'max'
              ? maxRecordsLog
              : (fallbackKpiLogs.find(l => l.id === selectedKpiLogId) || maxRecordsLog);
            const currentFilesLog = selectedKpiLogId === 'max'
              ? maxFilesLog
              : (fallbackKpiLogs.find(l => l.id === selectedKpiLogId) || maxFilesLog);

            return (
              <>
                {/* Card 2: Records per file (recordsPerLog) */}
                <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-600/5 dark:bg-emerald-500/10 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 leading-tight" title={t.recordsPerLogLabel}>
                        {t.recordsPerLogLabel}
                      </div>
                      {activeKpiLogs.length > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                          {activeKpiLogs.length} {lang === 'ru' ? 'лог.' : 'logs'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <div className="text-2xl font-black font-mono text-emerald-800 dark:text-emerald-300">
                        {currentRecordsLog ? currentRecordsLog.recordsPerLog.toLocaleString() : config.recordsPerLog.toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyValue('kpi_rec', currentRecordsLog ? currentRecordsLog.recordsPerLog : config.recordsPerLog)}
                        title={t.comfortCopyRecordsTooltip}
                        className="p-1 rounded hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 cursor-pointer transition-colors"
                      >
                        {copiedCellKey === 'kpi_rec' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {activeKpiLogs.length > 1 && currentRecordsLog && (
                        <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[130px]" title={currentRecordsLog.name}>
                          ({selectedKpiLogId === 'max' ? `${lang === 'ru' ? 'Макс:' : 'Max:'} ${currentRecordsLog.name}` : currentRecordsLog.name})
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {lang === 'ru' ? 'Max. data records (TIA Inspector)' : 'Max. data records (TIA Inspector)'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                      <span>
                        {lang === 'ru' ? 'Размер файла:' : 'File size:'}{' '}
                        <span className="font-mono font-medium">
                          {currentRecordsLog ? currentRecordsLog.fileSizeMb.toFixed(1) : result.fileSizeMb.toFixed(1)} MB
                        </span>
                      </span>
                      {currentRecordsLog && (
                        <span className="text-slate-400 font-mono text-[10px] uppercase">
                          {currentRecordsLog.format}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multi-log Records Breakdown Chips */}
                  {activeKpiLogs.length > 1 && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-500/15 dark:border-emerald-500/20">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span>{lang === 'ru' ? 'Записи по архивам (TIA):' : 'Records by log (TIA):'}</span>
                        {selectedKpiLogId !== 'max' && (
                          <button
                            type="button"
                            onClick={() => setSelectedKpiLogId('max')}
                            className="text-[9px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
                          >
                            {lang === 'ru' ? 'Сброс (Max)' : 'Reset (Max)'}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 pr-0.5">
                        {activeKpiLogs.map((l) => {
                          const isSelected = (selectedKpiLogId === l.id) || (selectedKpiLogId === 'max' && l.id === maxRecordsLog?.id);
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => setSelectedKpiLogId(l.id)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-700 text-white font-bold shadow-xs ring-1 ring-emerald-600'
                                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50'
                              }`}
                              title={`${l.name}: ${l.recordsPerLog.toLocaleString()} rec`}
                            >
                              {l.category === 'data' ? (
                                <Database className="w-2.5 h-2.5 shrink-0" />
                              ) : (
                                <Bell className="w-2.5 h-2.5 shrink-0" />
                              )}
                              <span className="truncate max-w-[85px]">{l.name}:</span>
                              <span className="font-bold">{l.recordsPerLog.toLocaleString()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 3: Files in sequence (Sequence of log files) */}
                <div className="p-4 rounded-xl border-2 border-indigo-500/40 dark:border-indigo-400/30 bg-indigo-50/15 dark:bg-indigo-950/10 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 leading-tight" title={t.comfortFilesNeeded}>
                        {t.comfortFilesNeeded}
                      </div>
                      {activeKpiLogs.length > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                          {activeKpiLogs.length} {lang === 'ru' ? 'лог.' : 'logs'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <div className="text-2xl font-black font-mono text-indigo-900 dark:text-indigo-200">
                        {currentFilesLog ? currentFilesLog.recommendedLogFiles : result.recommendedLogFiles}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyValue('kpi_files', currentFilesLog ? currentFilesLog.recommendedLogFiles : result.recommendedLogFiles)}
                        title={t.comfortCopySequenceTooltip}
                        className="p-1 rounded hover:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 cursor-pointer transition-colors"
                      >
                        {copiedCellKey === 'kpi_files' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {activeKpiLogs.length > 1 && currentFilesLog && (
                        <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[130px]" title={currentFilesLog.name}>
                          ({selectedKpiLogId === 'max' ? `${lang === 'ru' ? 'Макс:' : 'Max:'} ${currentFilesLog.name}` : currentFilesLog.name})
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                      <span>
                        {currentFilesLog ? (
                          <>
                            {currentFilesLog.recommendedLogFiles}{' '}
                            {lang === 'ru' ? 'файлов по' : 'files ×'}{' '}
                            <span className="font-mono font-medium">{currentFilesLog.fileSizeMb.toFixed(1)} MB</span>
                          </>
                        ) : (
                          `${result.recommendedLogFiles} ${lang === 'ru' ? 'файлов' : 'files'}`
                        )}
                      </span>
                      {currentFilesLog && (
                        <span className="text-slate-400 font-mono text-[10px]">
                          {currentFilesLog.retentionDays} {lang === 'ru' ? 'дней' : 'd'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multi-log Files Breakdown Chips */}
                  {activeKpiLogs.length > 1 && (
                    <div className="mt-2.5 pt-2 border-t border-indigo-500/15 dark:border-indigo-500/20">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span>{lang === 'ru' ? 'Файлы по архивам (TIA):' : 'Files by log (TIA):'}</span>
                        {selectedKpiLogId !== 'max' && (
                          <button
                            type="button"
                            onClick={() => setSelectedKpiLogId('max')}
                            className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                          >
                            {lang === 'ru' ? 'Сброс (Max)' : 'Reset (Max)'}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 pr-0.5">
                        {activeKpiLogs.map((l) => {
                          const isSelected = (selectedKpiLogId === l.id) || (selectedKpiLogId === 'max' && l.id === maxFilesLog?.id);
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => setSelectedKpiLogId(l.id)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white font-bold shadow-xs ring-1 ring-indigo-600'
                                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50'
                              }`}
                              title={`${l.name}: ${l.recommendedLogFiles} files (${l.totalLogMb.toFixed(0)} MB)`}
                            >
                              {l.category === 'data' ? (
                                <Database className="w-2.5 h-2.5 shrink-0" />
                              ) : (
                                <Bell className="w-2.5 h-2.5 shrink-0" />
                              )}
                              <span className="truncate max-w-[85px]">{l.name}:</span>
                              <span className="font-bold">{l.recommendedLogFiles}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Card 3 Footer: Limit status badge */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {config.deviceType === 'comfort_panel' ? t.comfortLimitComfortFiles : t.comfortLimitRtAdvFiles}
                    </span>
                    {(config.deviceType === 'comfort_panel' ? result.recommendedLogFiles <= 100 : result.recommendedLogFiles <= 400) ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>OK</span>
                      </span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{lang === 'ru' ? 'Превышен' : 'Exceeded'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Card 4: Storage Occupancy & Flash Wear */}
          <div className={`p-4 rounded-xl border ${result.storageOccupancyPct > 100 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50'}`}>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.storageUsageLabel} ({config.storageSizeGb || (config.storageMediumMb / 1024)} GB)
            </div>
            <div className={`text-2xl font-bold font-mono ${result.storageOccupancyPct > 100 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
              {result.storageOccupancyPct.toFixed(1)}%
            </div>
            
            {/* Storage bar */}
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5 mb-2">
              <div 
                className={`h-full transition-all duration-300 ${
                  result.storageOccupancyPct > 100 ? 'bg-red-600' : result.storageOccupancyPct > 85 ? 'bg-rose-500' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, result.storageOccupancyPct)}%` }}
              />
            </div>

            {result.storageOccupancyPct > 100 && (
              <div className="mt-2 mb-2 p-2 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 text-[10px] font-bold leading-tight">
                {lang === 'ru' 
                  ? `⚠️ КРИТИЧНО: Архив (${(result.totalStorageUsedMb / 1024).toFixed(1)} GB) превышает ёмкость носителя (${config.storageSizeGb || (config.storageMediumMb / 1024)} GB)!`
                  : `⚠️ CRITICAL: Archive (${(result.totalStorageUsedMb / 1024).toFixed(1)} GB) exceeds storage capacity (${config.storageSizeGb || (config.storageMediumMb / 1024)} GB)!`}
              </div>
            )}

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>
                {config.deviceType === 'rt_advanced'
                  ? t.flashLifeLabelSsd
                  : (config.storageMedium && config.storageMedium.includes('usb'))
                  ? t.flashLifeLabelUsb
                  : t.flashLifeLabelSd}:
              </span>
              <span className={`font-bold ${!result.flashLifeApplicable && result.flashLifeReason === 'overflow' ? 'text-red-600 dark:text-red-400 text-[10px] font-sans' : 'text-slate-800 dark:text-slate-200 font-mono'}`}>
                {config.deviceType === 'rt_advanced'
                  ? 'N/A'
                  : !result.flashLifeApplicable && result.flashLifeReason === 'overflow'
                  ? t.flashLifeOverflow
                  : !result.flashLifeApplicable && result.flashLifeReason === 'zero_writes'
                  ? t.flashLifeZeroWrites
                  : `~${result.estimatedFlashLifeYears.toFixed(1)} ${lang === 'ru' ? 'лет' : 'yrs'}`}
              </span>
            </div>

            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{lang === 'ru' ? 'Запись в сутки:' : 'Daily writes:'}</span>
              <span className="font-mono">{result.dailyWrittenGb.toFixed(2)} GB/day</span>
            </div>
          </div>
        </div>

        {/* Industrial Ethernet Network Load */}
        <div className="mb-6">
          <NetworkBandwidthCard network={result.network} lang={lang} />
        </div>

        {/* ISA-18.2 / EEMUA 191 Alarm Rate Assessment */}
        {result.isa18AlarmAssessment && (
          <div className="mb-6 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {lang === 'ru' ? 'Оценка потока сигнализации (ISA-18.2 / EEMUA 191)' : 'Alarm Rate Assessment (ISA-18.2 / EEMUA 191)'}
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                result.isa18AlarmAssessment.status === 'acceptable'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : result.isa18AlarmAssessment.status === 'manageable'
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                  : result.isa18AlarmAssessment.status === 'demanding'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30'
              }`}>
                {lang === 'ru' ? result.isa18AlarmAssessment.labelRu : result.isa18AlarmAssessment.labelEn}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-slate-600 dark:text-slate-300">
                {lang === 'ru' ? result.isa18AlarmAssessment.descRu : result.isa18AlarmAssessment.descEn}
              </div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                {result.isa18AlarmAssessment.alarmsPerHour} {lang === 'ru' ? 'алармов/час' : 'alarms/hour'} (~{result.isa18AlarmAssessment.totalAlarmsPerDay} {lang === 'ru' ? 'в сут.' : '/day'})
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="space-y-2">
            {result.warnings.map((w, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs">
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
        tab="comfort"
        lang={lang}
      />

      {/* Bulk Add Modal */}
      <BulkAddModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onAdd={handleBulkAddSubmit}
        tab="comfort"
        lang={lang}
      />

      {/* Bulk Add Alarm Modal */}
      <BulkAddAlarmModal
        isOpen={isBulkAlarmModalOpen}
        onClose={() => setIsBulkAlarmModalOpen(false)}
        onAdd={handleBulkAlarmSubmit}
        alarmLogs={alarmLogs}
        lang={lang}
        tab="comfort"
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
});

ComfortTab.displayName = 'ComfortTab';
