'use client';
import React, { useState } from 'react';
import { UnifiedTag, UnifiedConfig, UnifiedResult, Language } from '../../lib/types';
import { translations } from '../../lib/i18n';
import { TrafficGauge } from '../TrafficGauge';
import { 
  Plus, Trash2, Layers, AlertTriangle, CheckCircle2, 
  ShieldCheck, HardDrive, Bell, FileText, Cpu, Clock, RefreshCw 
} from 'lucide-react';

interface UnifiedTabProps {
  tags: UnifiedTag[];
  setTags: React.Dispatch<React.SetStateAction<UnifiedTag[]>>;
  config: UnifiedConfig;
  setConfig: React.Dispatch<React.SetStateAction<UnifiedConfig>>;
  result: UnifiedResult;
  lang: Language;
}

export const UnifiedTab: React.FC<UnifiedTabProps> = ({
  tags,
  setTags,
  config,
  setConfig,
  result,
  lang,
}) => {
  const t = translations[lang];

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
  };

  const handleAddBulk = () => {
    const count = parseInt(prompt(lang === 'ru' ? 'Сколько одинаковых тегов добавить в пакет?' : 'How many bulk tags to add?', '50') || '0', 10);
    if (count > 0) {
      const newTag: UnifiedTag = {
        id: Math.random().toString(36).substring(2, 9),
        description: `Bulk_Analog_Sensors_${count}x`,
        mode: 'cyclic',
        cycleSec: 1,
        entriesPerSec: 1,
        count: count,
        dataType: 'Real',
      };
      setTags([...tags, newTag]);
    }
  };

  const handleLoadSample = () => {
    setTags([
      { id: '1', description: 'Fast PID Pressures (0.5s)', mode: 'cyclic', cycleSec: 0.5, entriesPerSec: 2, count: 40, dataType: 'Real' },
      { id: '2', description: 'Motor Temperatures (2s)', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 120, dataType: 'Real' },
      { id: '3', description: 'Tank Levels & Flow (5s)', mode: 'cyclic', cycleSec: 5, entriesPerSec: 0.2, count: 80, dataType: 'Real' },
      { id: '4', description: 'Valve States (On Change)', mode: 'onchange', cycleSec: 60, entriesPerSec: 0.0167, count: 200, dataType: 'Bool' },
    ]);
  };

  const handleUpdateTag = (id: string, updates: Partial<UnifiedTag>) => {
    setTags(tags.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...updates };
      if (updates.mode === 'cyclic' && updated.cycleSec > 0) {
        updated.entriesPerSec = Number((1 / updated.cycleSec).toFixed(4));
      } else if (updates.mode === 'onchange') {
        updated.entriesPerSec = 0.0167; // average 1 entry per minute
      }
      return updated;
    }));
  };

  const handleRemoveTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
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
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00646E]/10 text-[#00646E] dark:text-[#00A3B5] font-semibold">
                SQLite Engine
              </span>
            </div>
            
            <div className="space-y-2.5">
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.deviceType === 'ucp'
                  ? 'border-[#00646E] bg-[#00646E]/5 dark:bg-[#00A3B5]/10 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="deviceType"
                  checked={config.deviceType === 'ucp'}
                  onChange={() => setConfig({ ...config, deviceType: 'ucp', storageSizeGb: 12 })}
                  className="accent-[#00646E] w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.ucpModel}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Embedded Linux, SIMATIC SD card / USB</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.deviceType === 'pc_rt'
                  ? 'border-[#00646E] bg-[#00646E]/5 dark:bg-[#00A3B5]/10 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="deviceType"
                  checked={config.deviceType === 'pc_rt'}
                  onChange={() => setConfig({ ...config, deviceType: 'pc_rt', storageSizeGb: 120 })}
                  className="accent-[#00646E] w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.pcRtModel}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Windows Industrial PC, High-performance SSD</div>
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
                  const val = e.target.value as any;
                  let gb = 12;
                  if (val === 'sd_512m') gb = 0.5;
                  else if (val === 'sd_2g') gb = 2;
                  else if (val === 'sd_12g') gb = 12;
                  else if (val === 'sd_32g') gb = 32;
                  else if (val === 'usb_128g') gb = 128;
                  else if (val === 'ssd_custom') gb = config.storageSizeGb || 256;
                  setConfig({ ...config, storageMedium: val, storageSizeGb: gb });
                }}
                className="col-span-2 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-xs font-medium focus:border-[#00646E] outline-none"
              >
                <option value="sd_512m">SIMATIC SD Card 512 MB</option>
                <option value="sd_2g">SIMATIC SD Card 2 GB</option>
                <option value="sd_12g">SIMATIC SD Card 12 GB (Standard UCP)</option>
                <option value="sd_32g">SIMATIC SD Card 32 GB</option>
                <option value="usb_128g">Industrial USB Flash 128 GB</option>
                <option value="ssd_custom">Custom SSD / Hard Drive</option>
              </select>

              {config.storageMedium === 'ssd_custom' && (
                <div className="col-span-2 flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">{t.storageCustom}:</span>
                  <input
                    type="number"
                    min="1"
                    value={config.storageSizeGb}
                    onChange={(e) => setConfig({ ...config, storageSizeGb: parseFloat(e.target.value) || 100 })}
                    className="p-1 px-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-24 font-mono"
                  />
                  <span className="text-xs font-semibold">GB</span>
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
                value={config.retentionDays}
                onChange={(e) => setConfig({ ...config, retentionDays: parseInt(e.target.value, 10) || 30 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 focus:border-[#00646E] outline-none"
              />
              <span className="text-[10px] text-slate-400 leading-tight">{t.retentionHelper}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t.segmentHours}
              </label>
              <input
                type="number"
                min="1"
                value={config.segmentHours}
                onChange={(e) => setConfig({ ...config, segmentHours: parseInt(e.target.value, 10) || 24 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 focus:border-[#00646E] outline-none"
              />
              <span className="text-[10px] text-slate-400 leading-tight">{t.segmentHelper}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t.entryBytes}
              </label>
              <input
                type="number"
                min="10"
                value={config.perEntryBytes}
                onChange={(e) => setConfig({ ...config, perEntryBytes: parseInt(e.target.value, 10) || 50 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 focus:border-[#00646E] outline-none"
              />
              <span className="text-[10px] text-slate-400 leading-tight">{t.entryBytesHelper}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t.headroom}
              </label>
              <input
                type="number"
                min="0"
                value={config.headroomPct}
                onChange={(e) => setConfig({ ...config, headroomPct: parseInt(e.target.value, 10) || 30 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 focus:border-[#00646E] outline-none"
              />
              <span className="text-[10px] text-slate-400 leading-tight">+30% для индексов</span>
            </div>
          </div>

          {/* Alarm & Audit Trail Addons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
            {/* Alarms */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-semibold">{t.alarmsToggle}</div>
                  <input
                    type="number"
                    disabled={!config.includeAlarms}
                    value={config.alarmsPerDay}
                    onChange={(e) => setConfig({ ...config, alarmsPerDay: parseInt(e.target.value, 10) || 0 })}
                    className="w-20 p-0.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 mt-1 disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-400 ml-1.5">{t.alarmsPerDay}</span>
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
                  <div className="text-xs font-semibold">{t.auditToggle}</div>
                  <input
                    type="number"
                    disabled={!config.includeAudit}
                    value={config.auditEntriesPerDay}
                    onChange={(e) => setConfig({ ...config, auditEntriesPerDay: parseInt(e.target.value, 10) || 0 })}
                    className="w-20 p-0.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 mt-1 disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-400 ml-1.5">{t.auditPerDay}</span>
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
              {result.totalTags} тегов
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
              onClick={handleAddBulk}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.btnAddBulk}
            </button>
            <button
              onClick={() => setTags([])}
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
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={tag.description}
                      onChange={(e) => handleUpdateTag(tag.id, { description: e.target.value })}
                      className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 focus:border-[#00646E] outline-none font-medium"
                    />
                  </td>
                  <td className="p-2.5">
                    <select
                      value={tag.dataType}
                      onChange={(e) => handleUpdateTag(tag.id, { dataType: e.target.value as any })}
                      className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 outline-none"
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
                      onChange={(e) => handleUpdateTag(tag.id, { mode: e.target.value as any })}
                      className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 outline-none font-medium"
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
                      value={tag.cycleSec}
                      onChange={(e) => handleUpdateTag(tag.id, { cycleSec: parseFloat(e.target.value) || 1 })}
                      className="w-20 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 focus:border-[#00646E] outline-none disabled:opacity-40"
                    />
                  </td>
                  <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300">
                    {tag.entriesPerSec.toFixed(3)}
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="1"
                      value={tag.count}
                      onChange={(e) => handleUpdateTag(tag.id, { count: parseInt(e.target.value, 10) || 1 })}
                      className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 focus:border-[#00646E] outline-none"
                    />
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
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
          <span className="text-xs font-mono text-slate-500">
            {result.totalSegments.toFixed(1)} сегментов за {config.retentionDays} дн.
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
              <TrafficGauge rate={result.totalEntriesPerSec} />
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
              Сырой расчет: {result.rawSegmentMb.toFixed(2)} MB
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
    </div>
  );
};
