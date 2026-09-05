'use client';
import React, { useState } from 'react';
import { UnifiedTag, UnifiedConfig, UnifiedResult, Language, ToastMessage } from '../../lib/types';
import { translations, formatPlural } from '../../lib/i18n';
import { TrafficGauge } from '../TrafficGauge';
import { BulkAddModal } from '../BulkAddModal';
import { ConfirmModal } from '../ConfirmModal';
import { 
  Plus, Trash2, Layers, AlertTriangle, CheckCircle2, 
  ShieldCheck, Bell, Cpu, Clock, RefreshCw 
} from 'lucide-react';

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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleAddTag = () => {
    const newTag: UnifiedTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `Tag_${tags.length + 1}`,
      mode: 'cyclic',
      cycleSec: 1,
      entriesPerSec: 1,
      count: 1,
      dataType: 'Real',
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

    const newTag: UnifiedTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `${params.prefix}${params.count}x`,
      mode: params.mode,
      cycleSec: params.cycleSec,
      entriesPerSec,
      count: params.count,
      dataType: params.dataType || 'Real',
    };
    setTags(prev => [...prev, newTag]);
    if (onShowToast) onShowToast(t.toastBulkAdded, 'success');
  };

  const handleLoadSample = () => {
    setTags([
      { id: '1', description: lang === 'ru' ? 'Давление ПИД-контуров (0.5с)' : 'Fast PID Pressures (0.5s)', mode: 'cyclic', cycleSec: 0.5, entriesPerSec: 2, count: 40, dataType: 'Real' },
      { id: '2', description: lang === 'ru' ? 'Температуры обмоток и подшипников (2с)' : 'Motor Temperatures (2s)', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 120, dataType: 'Real' },
      { id: '3', description: lang === 'ru' ? 'Уровни в резервуарах (5с)' : 'Tank Levels & Flow (5s)', mode: 'cyclic', cycleSec: 5, entriesPerSec: 0.2, count: 80, dataType: 'Real' },
      { id: '4', description: lang === 'ru' ? 'Концевики и клапаны (По изм.)' : 'Valve States (On Change)', mode: 'onchange', cycleSec: 60, entriesPerSec: 0.0167, count: 200, dataType: 'Bool' },
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
                  else if (val === 'ssd_custom') gb = config.storageSizeGb || 256;
                  setConfig({ ...config, storageMedium: val, storageSizeGb: gb });
                }}
                className="col-span-2 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none"
              >
                <option value="sd_512m">SIMATIC SD Card 512 MB</option>
                <option value="sd_2g">SIMATIC SD Card 2 GB</option>
                <option value="sd_12g">{t.storageSdCard12gUcp}</option>
                <option value="sd_32g">SIMATIC SD Card 32 GB</option>
                <option value="usb_128g">Industrial USB Flash 128 GB</option>
                <option value="ssd_custom">{t.storageCustomSsd}</option>
              </select>

              {config.storageMedium === 'ssd_custom' && (
                <div className="col-span-2 flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-700 dark:text-slate-300">{t.storageCustom}:</span>
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Parameters Card */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00A3B5]" />
              {t.globalParams}
            </h2>
            <button
              onClick={handleLoadSample}
              className="text-xs text-[#00646E] dark:text-[#00A3B5] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              {lang === 'ru' ? 'Загрузить демо-теги' : 'Load Demo Tags'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-4">
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
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none"
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
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.headroomHelper}</span>
            </div>
          </div>

          {/* Alarm & Audit Trail Addons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
            {/* Alarms */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{t.alarmsToggle}</div>
                  <input
                    type="number"
                    min="0"
                    disabled={!config.includeAlarms}
                    value={config.alarmsPerDay}
                    onChange={(e) => setConfig({ ...config, alarmsPerDay: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    className="w-20 p-0.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 mt-1 disabled:opacity-50 focus:ring-1 focus:ring-[#00646E] outline-none"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">{t.alarmsPerDay}</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.includeAlarms}
                onChange={(e) => setConfig({ ...config, includeAlarms: e.target.checked })}
                className="w-4 h-4 accent-[#00646E] cursor-pointer"
              />
            </div>

            {/* Audit Trail */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{t.auditToggle}</div>
                  <input
                    type="number"
                    min="0"
                    disabled={!config.includeAudit}
                    value={config.auditEntriesPerDay}
                    onChange={(e) => setConfig({ ...config, auditEntriesPerDay: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    className="w-20 p-0.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 mt-1 disabled:opacity-50 focus:ring-1 focus:ring-[#00646E] outline-none"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">{t.auditPerDay}</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#00A3B5]" />
              {t.tagListTitle}
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {formatPlural(result.totalTags, lang, ['тег', 'тега', 'тегов'], ['tag', 'tags'])}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddTag}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00646E] text-white hover:bg-[#004D54] flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.btnAddTag}
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.btnAddBulk}
            </button>
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
            >
              {t.btnClearAll}
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">{t.colDesc}</th>
                <th className="p-3">{t.colType}</th>
                <th className="p-3">{t.colMode}</th>
                <th className="p-3">{t.colCycle}</th>
                <th className="p-3">{t.colRate}</th>
                <th className="p-3">{t.colCount}</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {tags.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-xs text-slate-500 dark:text-slate-300">
                    {lang === 'ru' ? 'Список тегов пуст. Нажмите «+ Добавить тег» или «+ Пакет тегов».' : 'Tag list is empty. Click "+ Add Tag" or "+ Bulk Tags" to configure.'}
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={tag.description}
                        onChange={(e) => handleUpdateTag(tag.id, { description: e.target.value })}
                        className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-1 focus:ring-[#00646E] outline-none font-medium"
                      />
                    </td>
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
                        className="w-20 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-[#00646E] focus:ring-1 focus:ring-[#00646E] outline-none disabled:opacity-40"
                      />
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
                ))
              )}
            </tbody>
          </table>
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
            {formatPlural(result.totalSegments, lang, ['сегмент', 'сегмента', 'сегментов'], ['segment', 'segments'])} {lang === 'ru' ? 'за' : 'over'} {formatPlural(config.retentionDays, lang, ['день', 'дня', 'дней'], ['day', 'days'])}
          </span>
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
              {result.totalLogGb >= 1 ? `${result.totalLogGb.toFixed(2)} GB` : `${result.totalLogMb} MB`}
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

      {/* Bulk Add Modal */}
      <BulkAddModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onAdd={handleBulkAddSubmit}
        tab="unified"
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
