'use client';
import React, { useState } from 'react';
import { 
  ProfessionalTag, ProfessionalConfig, ProfessionalResult, Language, ToastMessage,
  ProfessionalAlarmTag
} from '../../lib/types';
import { translations, formatPlural } from '../../lib/i18n';
import { TrafficGauge } from '../TrafficGauge';
import { BulkAddModal } from '../BulkAddModal';
import { BulkAddAlarmModal } from '../BulkAddAlarmModal';
import { ConfirmModal } from '../ConfirmModal';
import { ImportTagsModal } from '../ImportTagsModal';
import { 
  Plus, Trash2, Database, AlertTriangle, CheckCircle2, RefreshCw, Zap, Server, Upload,
  HardDrive, Bell, Copy, Check, ShieldAlert, ShieldCheck, Cpu, Activity
} from 'lucide-react';
import { getSiemensArticle } from '../../lib/calculator/mlfbCatalog';
import { 
  generateTiaPortalCsv, 
  generateTiaPortalXlsx, 
  generateTiaPortalAlarmCsv, 
  generateTiaPortalAlarmXlsx, 
  downloadFile, 
  downloadXlsxFile 
} from '../../lib/tiaExporter';
import { convertToProfessionalTags, ParsedTagItem } from '../../lib/tagImporter';
import { NetworkBandwidthCard } from '../NetworkBandwidthCard';
import { ExportTiaDropdown } from '../ExportTiaDropdown';

interface ProfessionalTabProps {
  tags: ProfessionalTag[];
  setTags: React.Dispatch<React.SetStateAction<ProfessionalTag[]>>;
  config: ProfessionalConfig;
  setConfig: React.Dispatch<React.SetStateAction<ProfessionalConfig>>;
  result: ProfessionalResult;
  lang: Language;
  onShowToast?: (message: string, type?: ToastMessage['type']) => void;
}

export const ProfessionalTab: React.FC<ProfessionalTabProps> = ({
  tags,
  setTags,
  config,
  setConfig,
  result,
  lang,
  onShowToast,
}) => {
  const t = translations[lang];
  const [activeCategory, setActiveCategory] = useState<'data' | 'alarms'>('data');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkAlarmModalOpen, setIsBulkAlarmModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [alarmFilter, setAlarmFilter] = useState<'all' | 'Alarm' | 'Warning' | 'Event'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (onShowToast) onShowToast(t.toastCopied, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleImportTags = (parsedTags: ParsedTagItem[], mode: 'append' | 'replace') => {
    const converted = convertToProfessionalTags(parsedTags);
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
    const newTag: ProfessionalTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `Pro_Tag_${tags.length + 1}`,
      cycleSec: 2,
      count: 1,
      archiveType: 'fast',
      dataType: 'Real',
    };
    setTags([...tags, newTag]);
    if (onShowToast) onShowToast(lang === 'ru' ? 'Тег добавлен' : 'Tag added', 'success');
  };

  const handleBulkAddSubmit = (params: {
    count: number;
    prefix: string;
    cycleSec: number;
    archiveType?: 'fast' | 'slow';
    dataType?: ProfessionalTag['dataType'];
  }) => {
    const determinedType = params.archiveType || (params.cycleSec < 60 ? 'fast' : 'slow');
    const newTag: ProfessionalTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `${params.prefix}${params.count}x`,
      cycleSec: params.cycleSec,
      count: params.count,
      archiveType: determinedType,
      dataType: params.dataType || 'Real',
    };
    setTags(prev => [...prev, newTag]);
    if (onShowToast) onShowToast(t.toastBulkAdded, 'success');
  };

  const handleLoadSample = () => {
    setTags([
      { id: '1', description: 'Turbine_Vibration_RPM', cycleSec: 0.5, count: 50, archiveType: 'fast', dataType: 'Real' },
      { id: '2', description: 'Boiler_Feed_Pressure', cycleSec: 2, count: 200, archiveType: 'fast', dataType: 'Real' },
      { id: '3', description: 'Ambient_Weather_Shift', cycleSec: 60, count: 150, archiveType: 'slow', dataType: 'Real' },
      { id: '4', description: 'Daily_Environmental_Total', cycleSec: 300, count: 100, archiveType: 'slow', dataType: 'DInt' },
    ]);
    setConfig(prev => ({
      ...prev,
      alarmTags: [
        { id: 'alm_1', name: 'Turbine_Overheat_Trip', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 5, count: 4 },
        { id: 'alm_2', name: 'Boiler_Pressure_HiHi', alarmClass: 'Alarm', triggerType: 'analog', eventsPerDay: 2, count: 2 },
        { id: 'alm_3', name: 'Operator_Setpoint_Change', alarmClass: 'Event', triggerType: 'digital', eventsPerDay: 25, count: 5 },
        { id: 'alm_4', name: 'Bearing_Temp_Warning', alarmClass: 'Warning', triggerType: 'analog', eventsPerDay: 10, count: 8 },
      ],
    }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Загружен типовой проект Professional' : 'Sample Professional tags loaded', 'info');
  };

  const handleUpdateTag = (id: string, updates: Partial<ProfessionalTag>) => {
    setTags(tags.map(tItem => {
      if (tItem.id !== id) return tItem;
      const updated = { ...tItem, ...updates };
      if (updates.cycleSec !== undefined && updates.archiveType === undefined) {
        updated.archiveType = updated.cycleSec < 60 ? 'fast' : 'slow';
      }
      return updated;
    }));
  };

  const handleRemoveTag = (id: string) => {
    setTags(tags.filter(tItem => tItem.id !== id));
  };

  const handleClearAllConfirm = () => {
    if (activeCategory === 'data') {
      setTags([]);
    } else {
      setConfig(prev => ({ ...prev, alarmTags: [] }));
    }
    if (onShowToast) onShowToast(t.toastCleared, 'info');
  };

  // Alarm Tags Management
  const alarmTags = config.alarmTags || [];
  const handleAddAlarmTag = () => {
    const newAlarm: ProfessionalAlarmTag = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Alarm_Signal_${alarmTags.length + 1}`,
      alarmClass: 'Alarm',
      triggerType: 'digital',
      eventsPerDay: 5,
      count: 1,
    };
    setConfig(prev => ({
      ...prev,
      alarmTags: [...(prev.alarmTags || []), newAlarm],
    }));
    if (onShowToast) onShowToast(lang === 'ru' ? 'Аварийный тег добавлен' : 'Alarm tag added', 'success');
  };

  const handleUpdateAlarmTag = (id: string, updates: Partial<ProfessionalAlarmTag>) => {
    setConfig(prev => ({
      ...prev,
      alarmTags: (prev.alarmTags || []).map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  };

  const handleRemoveAlarmTag = (id: string) => {
    setConfig(prev => ({
      ...prev,
      alarmTags: (prev.alarmTags || []).filter(a => a.id !== id),
    }));
  };

  const handleBulkAddAlarmSubmit = (params: {
    count: number;
    prefix: string;
    alarmClass: ProfessionalAlarmTag['alarmClass'];
    triggerType: ProfessionalAlarmTag['triggerType'];
    eventsPerDay: number;
  }) => {
    const newAlarms: ProfessionalAlarmTag[] = [];
    for (let i = 1; i <= params.count; i++) {
      newAlarms.push({
        id: Math.random().toString(36).substring(2, 9),
        name: `${params.prefix}_${i}`,
        alarmClass: params.alarmClass,
        triggerType: params.triggerType,
        eventsPerDay: params.eventsPerDay,
        count: 1,
      });
    }
    setConfig(prev => ({
      ...prev,
      alarmTags: [...(prev.alarmTags || []), ...newAlarms],
    }));
    if (onShowToast) onShowToast(t.toastBulkAdded, 'success');
  };

  const handleExportTiaCsv = () => {
    const csv = generateTiaPortalCsv('professional', tags, 'Pro_TagLogging');
    downloadFile(csv, `TIA_WinCC_Professional_Tags_${new Date().toISOString().slice(0, 10)}.csv`);
    if (onShowToast) onShowToast(t.exportTiaSuccess, 'success');
  };

  const handleExportTiaXlsx = () => {
    const xlsxData = generateTiaPortalXlsx('professional', tags, 'Pro_TagLogging');
    downloadXlsxFile(xlsxData, `TIA_WinCC_Professional_Tags_${new Date().toISOString().slice(0, 10)}.xlsx`);
    if (onShowToast) onShowToast(t.exportTiaXlsxSuccess, 'success');
  };

  const handleExportTiaAlarmCsv = () => {
    const csv = generateTiaPortalAlarmCsv(alarmTags);
    downloadFile(csv, `TIA_WinCC_Professional_Alarms_${new Date().toISOString().slice(0, 10)}.csv`);
    if (onShowToast) onShowToast(t.exportTiaSuccess, 'success');
  };

  const handleExportTiaAlarmXlsx = () => {
    const xlsxData = generateTiaPortalAlarmXlsx(alarmTags);
    downloadXlsxFile(xlsxData, `TIA_WinCC_Professional_Alarms_${new Date().toISOString().slice(0, 10)}.xlsx`);
    if (onShowToast) onShowToast(t.exportTiaXlsxSuccess, 'success');
  };

  const filteredAlarmTags = alarmTags.filter(a => {
    if (alarmFilter === 'all') return true;
    return a.alarmClass === alarmFilter;
  });

  const totalTagCount = tags.reduce((acc, tItem) => acc + (tItem.count || 1), 0);
  const totalAlarmCount = alarmTags.reduce((acc, a) => acc + (a.count || 1), 0);
  const diskOccupancy = Math.min(100, Math.max(0, result.storageOccupancyPct || 0));
  const currentDiskType = config.storageDiskType || 'nvme_ssd';
  const isHddBottleneck = currentDiskType === 'hdd_raid1' && result.requiredIops > 180;

  return (
    <div className="space-y-6">
      {/* SQL Server Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: SQL Server Edition & Storage Subsystem */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-blue-500" />
              {t.proSqlEdition}
            </h2>

            <div className="space-y-2.5 mb-4">
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.sqlEdition === 'express'
                  ? 'border-blue-600 bg-blue-600/5 dark:bg-blue-500/10 ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="sqlEdition"
                  checked={config.sqlEdition === 'express'}
                  onChange={() => setConfig({ ...config, sqlEdition: 'express' })}
                  className="accent-blue-600 w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.proSqlExpress}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'ru' ? 'Поставляется в комплекте WinCC, лимит 10 GB на базу данных' : 'Bundled with WinCC, hard 10 GB limit per database'}
                  </div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.sqlEdition === 'standard_enterprise'
                  ? 'border-blue-600 bg-blue-600/5 dark:bg-blue-500/10 ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="sqlEdition"
                  checked={config.sqlEdition === 'standard_enterprise'}
                  onChange={() => setConfig({ ...config, sqlEdition: 'standard_enterprise' })}
                  className="accent-blue-600 w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.proSqlStandard}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'ru' ? 'Промышленная SCADA, многотерабайтные архивы без ограничений' : 'Enterprise SCADA, multi-terabyte storage without 10 GB cap'}
                  </div>
                </div>
              </label>
            </div>

            {/* Storage Subsystem Selector */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                <HardDrive className="w-4 h-4 text-blue-500" />
                <span>{t.proServerStorage}</span>
              </label>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { key: 'nvme_ssd', label: t.proDiskNvme, iops: '~10 000+ IOPS' },
                  { key: 'sata_ssd', label: t.proDiskSataSsd, iops: '~1 000 IOPS' },
                  { key: 'hdd_raid1', label: t.proDiskHdd, iops: '~150-200 IOPS' },
                  { key: 'custom', label: t.proDiskCustom, iops: 'Custom' },
                ].map(disk => (
                  <button
                    key={disk.key}
                    type="button"
                    onClick={() => setConfig({ ...config, storageDiskType: disk.key as ProfessionalConfig['storageDiskType'] })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      currentDiskType === disk.key
                        ? 'border-blue-600 bg-blue-100/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500/30 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs leading-tight">{disk.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{disk.iops}</div>
                  </button>
                ))}
              </div>

              {/* Disk Capacity and Archive Path */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    {t.proDiskCapacity}
                  </label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={config.diskCapacityGb || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                      setConfig({ ...config, diskCapacityGb: val });
                    }}
                    onBlur={() => {
                      if (!config.diskCapacityGb || config.diskCapacityGb < 10) {
                        setConfig({ ...config, diskCapacityGb: 512 });
                      }
                    }}
                    className="w-full p-2 text-xs font-mono font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    {t.proArchivePath}
                  </label>
                  <input
                    type="text"
                    value={config.archivePath || 'C:\\WinCC_Project'}
                    onChange={(e) => setConfig({ ...config, archivePath: e.target.value })}
                    className="w-full p-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Siemens IPC Hardware BoM */}
          {(() => {
            const article = getSiemensArticle('ssd_custom');
            return (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    {t.mlfbSiemensArticle}
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-600/10 dark:bg-blue-400/10 px-2 py-0.5 rounded border border-blue-600/20 dark:border-blue-400/20">
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

        {/* Right Column: Retention, Segment Period, Headroom & SCADA Architecture */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-500" />
                {lang === 'ru' ? 'Параметры хранения SCADA' : 'SCADA Storage Parameters'}
              </h2>
              <button
                onClick={handleLoadSample}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                {lang === 'ru' ? 'Загрузить демо' : 'Load Sample'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
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
                      setConfig({ ...config, retentionDays: 90 });
                    }
                  }}
                  className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Срок хранения в БД' : 'Retention period'}</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.proSegmentPeriod}
                </label>
                <div className="grid grid-cols-3 gap-1 h-9">
                  {(['day', 'week', 'month'] as const).map(period => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setConfig({ ...config, segmentPeriod: period })}
                      className={`rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        config.segmentPeriod === period
                          ? 'border-blue-600 bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {period === 'day' ? t.proPeriodDay : period === 'week' ? t.proPeriodWeek : t.proPeriodMonth}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Период одного сегмента' : 'Single segment time'}</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.headroom}
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.databaseHeadroomPct !== undefined ? config.databaseHeadroomPct : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                    setConfig({ ...config, databaseHeadroomPct: val });
                  }}
                  className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Резерв фрагментации' : 'Index headroom'}</span>
              </div>
            </div>

            {/* Alarm Logging Toggle */}
            <div className="p-3 mb-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeAlarmLogging}
                  onChange={(e) => setConfig({ ...config, includeAlarmLogging: e.target.checked })}
                  className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {t.alarmsToggle} (Alarm Logging)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'ru'
                      ? `В архиве: ${totalAlarmCount} сигналов (~${Math.round(result.alarmEntriesPerDay || 0)} соб/сут)`
                      : `In archive: ${totalAlarmCount} signals (~${Math.round(result.alarmEntriesPerDay || 0)} ev/day)`}
                  </div>
                </div>
              </label>
              <button
                type="button"
                onClick={() => setActiveCategory('alarms')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 transition-all cursor-pointer flex items-center gap-1"
              >
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <span>{lang === 'ru' ? 'Настроить алармы' : 'Manage Alarms'}</span>
              </button>
            </div>

            {/* Audit Trail Toggle (GMP / 21 CFR Part 11) */}
            <div className="flex items-center justify-between p-3 mb-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{t.auditToggle}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      min="0"
                      disabled={!config.includeAudit}
                      value={config.auditEntriesPerDay || 200}
                      onChange={(e) => setConfig({ ...config, auditEntriesPerDay: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-20 p-0.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.auditPerDay}</span>
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.includeAudit || false}
                onChange={(e) => setConfig({ ...config, includeAudit: e.target.checked })}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
            <span className="font-bold">{lang === 'ru' ? 'Siemens SCADA Архитектура: ' : 'Siemens SCADA Architecture: '}</span>
            {lang === 'ru'
              ? 'В WinCC Professional теги с циклом < 1 мин направляются в Fast Tag Logging, а теги с циклом ≥ 1 мин — в Slow Tag Logging. Аварии логируются в Alarm Logging (~192 байт/событие). Журнал транзакций SQL Server (LDF) закладывает +25% дискового пространства.'
              : 'In WinCC Professional, tags with cycle < 1 min route to Fast Tag Logging, while cycles ≥ 1 min go to Slow Tag Logging. Alarms are recorded in Alarm Logging (~192 B/event). SQL Server transaction log (LDF) requires +25% disk capacity.'}
          </div>
        </div>
      </div>

      {/* Main Content Area: Category Switcher & Tables */}
      <div className="glass-panel p-5 rounded-2xl">
        {/* Category Switcher Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => setActiveCategory('data')}
            className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeCategory === 'data'
                ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-blue-500" />
            <span>{t.proCategoryData}</span>
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 font-mono">
              {totalTagCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('alarms')}
            className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeCategory === 'alarms'
                ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4 text-blue-500" />
            <span>{t.proCategoryAlarm}</span>
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 font-mono">
              {totalAlarmCount}
            </span>
          </button>
        </div>

        {/* View 1: Data Tags Table */}
        {activeCategory === 'data' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {formatPlural(totalTagCount, lang, ['тег', 'тега', 'тегов'], ['tag', 'tags'])} ({result.fastTagsCount} Fast, {result.slowTagsCount} Slow)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                  title={t.btnImportTagsFull}
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{t.btnImportTags}</span>
                </button>
                <ExportTiaDropdown
                  onExportXlsx={handleExportTiaXlsx}
                  onExportCsv={handleExportTiaCsv}
                  lang={lang}
                  themeColor="blue"
                  buttonLabel={lang === 'ru' ? 'Экспорт TIA' : 'Export TIA'}
                  tooltipTitle={t.btnExportTia}
                />
                <button
                  onClick={handleAddTag}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">{lang === 'ru' ? 'Тег' : 'Tag'}</span>
                  <span className="hidden sm:inline">{t.btnAddTag}</span>
                </button>
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">{lang === 'ru' ? 'Пакет' : 'Bulk'}</span>
                  <span className="hidden sm:inline">{t.btnAddBulk}</span>
                </button>
                <button
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-all active:scale-95 shrink-0 ml-auto sm:ml-0"
                >
                  {t.btnClearAll}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">{t.colDesc}</th>
                    <th className="p-3">{t.colType}</th>
                    <th className="p-3">{lang === 'ru' ? 'Архив SQL' : 'SQL Archive'}</th>
                    <th className="p-3">{t.colCycle}</th>
                    <th className="p-3">{t.colCount}</th>
                    <th className="p-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {tags.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-xs text-slate-500 dark:text-slate-300">
                        {lang === 'ru' ? `Список тегов пуст. Нажмите «${t.btnAddTag}» или «${t.btnAddBulk}».` : `Tag list is empty. Click "${t.btnAddTag}" or "${t.btnAddBulk}" to configure.`}
                      </td>
                    </tr>
                  ) : (
                    tags.map((tag) => {
                      const effectiveArchiveType = tag.archiveType || (tag.cycleSec < 60 ? 'fast' : 'slow');
                      return (
                        <tr key={tag.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={tag.description}
                              onChange={(e) => handleUpdateTag(tag.id, { description: e.target.value })}
                              className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                            />
                          </td>
                          <td className="p-2.5">
                            <select
                              value={tag.dataType || 'Real'}
                              onChange={(e) => handleUpdateTag(tag.id, { dataType: e.target.value as ProfessionalTag['dataType'] })}
                              className="p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 cursor-pointer"
                            >
                              <option value="Bool">Bool (36 B)</option>
                              <option value="Int">Int (40 B)</option>
                              <option value="DInt">DInt (44 B)</option>
                              <option value="Real">Real (48 B)</option>
                              <option value="LReal">LReal (56 B)</option>
                              <option value="String">String (80 B)</option>
                            </select>
                          </td>
                          <td className="p-2.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateTag(tag.id, { archiveType: effectiveArchiveType === 'fast' ? 'slow' : 'fast' })}
                              title={lang === 'ru' ? 'Нажмите, чтобы переключить Fast/Slow' : 'Click to toggle Fast/Slow'}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer ${
                                effectiveArchiveType === 'fast'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200 border border-amber-300/50'
                                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-200 border border-blue-300/50'
                              }`}
                            >
                              {effectiveArchiveType === 'fast' ? '⚡ FAST (< 1m)' : '⏱️ SLOW (≥ 1m)'}
                            </button>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="0.01"
                                value={tag.cycleSec || ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                  handleUpdateTag(tag.id, { cycleSec: val });
                                }}
                                onBlur={() => {
                                  if (!tag.cycleSec || tag.cycleSec <= 0) {
                                    handleUpdateTag(tag.id, { cycleSec: 2 });
                                  }
                                }}
                                className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                              <select
                                value={[0.1, 0.5, 1, 2, 5, 10, 30, 60, 300].includes(tag.cycleSec) ? tag.cycleSec : 'custom'}
                                onChange={(e) => {
                                  if (e.target.value !== 'custom') {
                                    handleUpdateTag(tag.id, { cycleSec: parseFloat(e.target.value) });
                                  }
                                }}
                                className="p-1 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
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
                                <option value="300">5 мин</option>
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
                              className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View 2: Alarm Tags Table */}
        {activeCategory === 'alarms' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              {/* Filter Buttons */}
              <div className="flex items-center gap-1.5">
                {(['all', 'Alarm', 'Warning', 'Event'] as const).map(filterType => (
                  <button
                    key={filterType}
                    type="button"
                    onClick={() => setAlarmFilter(filterType)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      alarmFilter === filterType
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {filterType === 'all' ? (lang === 'ru' ? 'Все' : 'All') : filterType}
                    <span className="ml-1 text-[10px] opacity-80">
                      ({filterType === 'all' ? alarmTags.length : alarmTags.filter(a => a.alarmClass === filterType).length})
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <ExportTiaDropdown
                  onExportXlsx={handleExportTiaAlarmXlsx}
                  onExportCsv={handleExportTiaAlarmCsv}
                  lang={lang}
                  themeColor="blue"
                  buttonLabel={lang === 'ru' ? 'Экспорт алармов' : 'Export Alarms'}
                  tooltipTitle={lang === 'ru' ? 'Экспорт аварийных сигналов в TIA Portal' : 'Export alarm tags to TIA Portal'}
                />
                <button
                  onClick={handleAddAlarmTag}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.proBtnAddAlarm}</span>
                </button>
                <button
                  onClick={() => setIsBulkAlarmModalOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.proBtnAddBulkAlarm}</span>
                </button>
                <button
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-all active:scale-95 shrink-0 ml-auto sm:ml-0"
                >
                  {t.btnClearAll}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">{t.colDesc}</th>
                    <th className="p-3">{t.proAlarmClass}</th>
                    <th className="p-3">{t.proTriggerType}</th>
                    <th className="p-3">{t.proEventsPerDay}</th>
                    <th className="p-3">{t.colCount}</th>
                    <th className="p-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {filteredAlarmTags.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-xs text-slate-500 dark:text-slate-300">
                        {lang === 'ru' ? 'Аварийные теги не настроены. Добавьте сигналы вручную или пакетом.' : 'No alarm tags configured. Add signals manually or via bulk tool.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAlarmTags.map((alarm) => (
                      <tr key={alarm.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={alarm.name}
                            onChange={(e) => handleUpdateAlarmTag(alarm.id, { name: e.target.value })}
                            className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={alarm.alarmClass || 'Alarm'}
                            onChange={(e) => handleUpdateAlarmTag(alarm.id, { alarmClass: e.target.value as ProfessionalAlarmTag['alarmClass'] })}
                            className={`p-1.5 text-xs font-bold rounded border outline-none cursor-pointer ${
                              alarm.alarmClass === 'Alarm'
                                ? 'text-rose-700 dark:text-rose-300 border-rose-300 bg-rose-50/50 dark:bg-rose-950/40'
                                : alarm.alarmClass === 'Warning'
                                ? 'text-amber-700 dark:text-amber-300 border-amber-300 bg-amber-50/50 dark:bg-amber-950/40'
                                : 'text-blue-700 dark:text-blue-300 border-blue-300 bg-blue-50/50 dark:bg-blue-950/40'
                            }`}
                          >
                            <option value="Alarm">Alarm (Авария)</option>
                            <option value="Warning">Warning (Предупреждение)</option>
                            <option value="Event">Event (Событие)</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <select
                            value={alarm.triggerType || 'digital'}
                            onChange={(e) => handleUpdateAlarmTag(alarm.id, { triggerType: e.target.value as ProfessionalAlarmTag['triggerType'] })}
                            className="p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                          >
                            <option value="digital">Digital (Bool)</option>
                            <option value="analog">Analog (Limit)</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="0"
                            value={alarm.eventsPerDay !== undefined ? alarm.eventsPerDay : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                              handleUpdateAlarmTag(alarm.id, { eventsPerDay: val });
                            }}
                            className="w-20 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="1"
                            value={alarm.count || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Math.max(1, parseInt(e.target.value, 10) || 1);
                              handleUpdateAlarmTag(alarm.id, { count: val });
                            }}
                            className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleRemoveAlarmTag(alarm.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            aria-label="Remove alarm tag"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Results Dashboard */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            {t.resultsTitle}
          </h2>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
            {formatPlural(config.retentionDays, lang, ['день хранения', 'дня хранения', 'дней хранения'], ['day retention', 'days retention'])}
          </span>
        </div>

        {/* 4 Main KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Fast Logging MDF */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.proFastLogging} (MDF)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.fastDatabaseSizeGb.toFixed(2)} GB
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {result.fastTagsCount} {lang === 'ru' ? 'тегов' : 'tags'}, {result.fastEntriesPerDay.toLocaleString()} {lang === 'ru' ? 'зап/сут' : 'rec/day'}
            </div>
          </div>

          {/* Slow Logging MDF */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.proSlowLogging} (MDF)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.slowDatabaseSizeGb.toFixed(2)} GB
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {result.slowTagsCount} {lang === 'ru' ? 'тегов' : 'tags'}, {result.slowEntriesPerDay.toLocaleString()} {lang === 'ru' ? 'зап/сут' : 'rec/day'}
            </div>
          </div>

          {/* Alarm Logging MDF */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Alarm Logging (MDF)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.alarmDatabaseSizeGb.toFixed(2)} GB
            </div>
            <div className="text-xs text-slate-500 mt-1">
              ~{Math.round(result.alarmEntriesPerDay || 0).toLocaleString()} {lang === 'ru' ? 'соб/сут' : 'events/day'} ({result.isa18AlarmAssessment?.alarmsPerHour || 0}/ч)
            </div>
          </div>

          {/* Total Disk Space */}
          <div className="p-4 rounded-xl border-2 border-blue-600 bg-blue-600/5 dark:bg-blue-500/10 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                {t.proTotalDiskSpace} (MDF + LDF)
              </div>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-800 dark:text-blue-200">
                {diskOccupancy.toFixed(1)}% {lang === 'ru' ? 'диска' : 'disk'}
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-blue-700 dark:text-blue-300">
              {result.totalStorageGb.toFixed(2)} GB
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>{lang === 'ru' ? 'LDF журнал:' : 'LDF log:'} ~{result.estimatedLdfSizeGb.toFixed(2)} GB</span>
              {config.sqlEdition === 'express' && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  result.expressLimitExceeded ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {result.expressLimitExceeded
                    ? (lang === 'ru' ? 'ПРЕВЫШЕН 10 GB!' : 'EXCEEDS 10 GB!')
                    : (lang === 'ru' ? 'Лимит 10 GB OK' : '10 GB Limit OK')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Middle Performance & Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Traffic Gauge */}
          <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-500" />
              <span>{lang === 'ru' ? 'Интенсивность потока SQL' : 'SQL Throughput Rate'}</span>
            </div>
            <TrafficGauge
              rate={result.totalRatePerSec}
              maxRate={2500}
              warnThreshold={500}
              critThreshold={2000}
              lang={lang}
            />
            <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-2">
              {lang === 'ru' ? 'Порог предупреждения: 500 зап/сек, критический: 2000 зап/сек' : 'Warning threshold: 500 rec/s, Critical: 2000 rec/s'}
            </div>
          </div>

          {/* Disk IOPS & Performance Sizing */}
          <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-500" />
                  <span>{t.proRequiredIops}</span>
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  {result.requiredIops} {t.proIopsUnit}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                {lang === 'ru'
                  ? 'Суммарная нагрузка на дисковую подсистему Microsoft SQL Server с учетом пакетного сброса 8 KB страниц (checkpoint) и индексов.'
                  : 'Total Microsoft SQL Server disk I/O load accounting for 8 KB page checkpoint flushes, write-ahead logging, and B-tree indexes.'}
              </div>
            </div>

            <div className={`p-2.5 rounded-xl border text-xs ${
              isHddBottleneck
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
                : 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {isHddBottleneck ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{t.proIopsWarning}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === 'ru' ? 'Дисковая подсистема справляется' : 'Disk Array Capacity OK'}</span>
                  </>
                )}
              </div>
              <div className="text-[11px] leading-tight">
                {isHddBottleneck
                  ? (lang === 'ru'
                      ? 'HDD RAID 1 ограничен ~150-200 IOPS. Рекомендуется переход на Enterprise SATA или NVMe SSD для исключения задержек очереди записи SQL!'
                      : 'HDD RAID 1 is capped at ~150-200 IOPS. Upgrade to Enterprise SATA or NVMe SSD to avoid SQL Server write queue latency!')
                  : (lang === 'ru'
                      ? `Текущий массив (${currentDiskType === 'nvme_ssd' ? 'NVMe RAID 10' : currentDiskType === 'sata_ssd' ? 'SATA SSD RAID 1' : 'HDD RAID 1'}) полностью обеспечивает требуемые ${result.requiredIops} IOPS.`
                      : `Configured storage (${currentDiskType === 'nvme_ssd' ? 'NVMe RAID 10' : currentDiskType === 'sata_ssd' ? 'SATA SSD RAID 1' : 'HDD RAID 1'}) fully covers the required ${result.requiredIops} IOPS.`)}
              </div>
            </div>
          </div>

          {/* ISA-18.2 Alarm Workload Assessment */}
          <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-blue-500" />
                  <span>ISA-18.2 / EEMUA 191</span>
                </span>
                {result.isa18AlarmAssessment && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    result.isa18AlarmAssessment.status === 'acceptable'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/20'
                      : result.isa18AlarmAssessment.status === 'manageable'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/20'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-500/20'
                  }`}>
                    {lang === 'ru' ? result.isa18AlarmAssessment.labelRu : result.isa18AlarmAssessment.labelEn}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                {result.isa18AlarmAssessment
                  ? (lang === 'ru' ? result.isa18AlarmAssessment.descRu : result.isa18AlarmAssessment.descEn)
                  : (lang === 'ru' ? 'Аварийный архив отключен или отсутствуют активные сигналы тревог.' : 'Alarm Logging is disabled or no alarm signals are configured.')}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">{lang === 'ru' ? 'Частота событий:' : 'Alarm frequency:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {result.isa18AlarmAssessment?.alarmsPerHour || 0} {t.proAlarmsUnit}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">{lang === 'ru' ? 'За 10 минут:' : 'Per 10 mins:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {Math.round(((result.isa18AlarmAssessment?.alarmsPerHour || 0) / 6) * 10) / 10}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TIA Portal SQL Server Databases Specification Table (Inspector) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                <span>{t.proTiaInspectorTitle}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.proTiaInspectorSubtitle}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">{t.proColArchive}</th>
                  <th className="p-3">{t.proColType}</th>
                  <th className="p-3">{t.proColSegment}</th>
                  <th className="p-3">{t.proColSize}</th>
                  <th className="p-3">{t.proColRetention}</th>
                  <th className="p-3">{t.proColPath}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {result.archiveItems && result.archiveItems.map((arch) => {
                  const segmentLabel = arch.segmentPeriod === 'day' ? t.proPeriodDay : arch.segmentPeriod === 'week' ? t.proPeriodWeek : t.proPeriodMonth;
                  const sizeLabel = `${arch.sizeGb.toFixed(2)} GB`;
                  const retentionLabel = `${arch.retentionDays} ${lang === 'ru' ? 'дней' : 'days'}`;

                  return (
                    <tr key={arch.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        <div>{arch.name}</div>
                        <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                          {lang === 'ru' ? arch.descriptionRu : arch.descriptionEn}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          arch.archiveType === 'fast'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40'
                            : arch.archiveType === 'slow'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300/40'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300/40'
                        }`}>
                          {arch.archiveType.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{segmentLabel}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`seg_${arch.id}`, segmentLabel)}
                            title={t.proCopyParamTooltip}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {copiedKey === `seg_${arch.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-300">
                        <div className="flex items-center gap-1.5">
                          <span>{sizeLabel}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`size_${arch.id}`, sizeLabel)}
                            title={t.proCopyParamTooltip}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {copiedKey === `size_${arch.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{retentionLabel}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`ret_${arch.id}`, String(arch.retentionDays))}
                            title={t.proCopyParamTooltip}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {copiedKey === `ret_${arch.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[200px]" title={arch.path}>{arch.path}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`path_${arch.id}`, arch.path)}
                            title={t.proCopyParamTooltip}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {copiedKey === `path_${arch.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Industrial Ethernet Network Load */}
        <div className="mb-6">
          <NetworkBandwidthCard network={result.network} lang={lang} />
        </div>

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
        tab="professional"
        lang={lang}
      />

      {/* Bulk Add Modal */}
      <BulkAddModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onAdd={handleBulkAddSubmit}
        tab="professional"
        lang={lang}
      />

      {/* Bulk Add Alarms Modal */}
      <BulkAddAlarmModal
        isOpen={isBulkAlarmModalOpen}
        onClose={() => setIsBulkAlarmModalOpen(false)}
        onAdd={handleBulkAddAlarmSubmit}
        alarmLogs={[{ id: 'AlarmLogging', name: 'AlarmLogging' }]}
        defaultAlarmLogId="AlarmLogging"
        tab="professional"
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
