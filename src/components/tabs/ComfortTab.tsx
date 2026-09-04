'use client';
import React from 'react';
import { ComfortTag, ComfortConfig, ComfortResult, Language } from '../../lib/types';
import { translations } from '../../lib/i18n';
import { Plus, Trash2, HardDrive, AlertTriangle, CheckCircle2, RefreshCw, FileSpreadsheet, Layers } from 'lucide-react';

interface ComfortTabProps {
  tags: ComfortTag[];
  setTags: React.Dispatch<React.SetStateAction<ComfortTag[]>>;\n  config: ComfortConfig;
  setConfig: React.Dispatch<React.SetStateAction<ComfortConfig>>;
  result: ComfortResult;
  lang: Language;
}

export const ComfortTab: React.FC<ComfortTabProps> = ({
  tags,
  setTags,
  config,
  setConfig,
  result,
  lang,
}) => {
  const t = translations[lang];

  const handleAddTag = () => {
    const newTag: ComfortTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `Tag_${tags.length + 1}`,
      mode: 'cyclic',
      cycleSec: 2,
      count: 1,
    };
    setTags([...tags, newTag]);
  };

  const handleAddBulk = () => {
    const count = parseInt(prompt(lang === 'ru' ? 'Сколько одинаковых тегов добавить?' : 'Number of bulk tags to add?', '50') || '0', 10);
    if (count > 0) {
      const newTag: ComfortTag = {
        id: Math.random().toString(36).substring(2, 9),
        description: `Bulk_Comfort_Tags_${count}x`,
        mode: 'cyclic',
        cycleSec: 2,
        count: count,
      };
      setTags([...tags, newTag]);
    }
  };

  const handleLoadSample = () => {
    setTags([
      { id: '1', description: 'Oven Zone Temperatures (1s)', mode: 'cyclic', cycleSec: 1, count: 20 },
      { id: '2', description: 'Line Pressures & Speed (2s)', mode: 'cyclic', cycleSec: 2, count: 50 },
      { id: '3', description: 'Daily Counters (10s)', mode: 'cyclic', cycleSec: 10, count: 30 },
      { id: '4', description: 'Operator Actions (On change)', mode: 'onchange', cycleSec: 60, count: 100 },
    ]);
  };

  const handleUpdateTag = (id: string, updates: Partial<ComfortTag>) => {
    setTags(tags.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleRemoveTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Device & Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Device Profile & Storage */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <HardDrive className="w-5 h-5 text-emerald-500" />
              {t.comfortDeviceTitle}
            </h2>

            <div className="space-y-2.5">
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.deviceType === 'comfort_panel'
                  ? 'border-emerald-600 bg-emerald-600/5 dark:bg-emerald-500/10'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="comfortDevice"
                  checked={config.deviceType === 'comfort_panel'}
                  onChange={() => setConfig({ ...config, deviceType: 'comfort_panel', storageMediumMb: 2048 })}
                  className="accent-emerald-600 w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold">{t.comfortPanel}</div>
                  <div className="text-xs text-slate-500">Windows CE, SIMATIC SD Card (X51 slot)</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.deviceType === 'rt_advanced'
                  ? 'border-emerald-600 bg-emerald-600/5 dark:bg-emerald-500/10'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="comfortDevice"
                  checked={config.deviceType === 'rt_advanced'}
                  onChange={() => setConfig({ ...config, deviceType: 'rt_advanced', storageMediumMb: 32768 })}
                  className="accent-emerald-600 w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold">{t.comfortRtAdv}</div>
                  <div className="text-xs text-slate-500">Windows PC, local HDD/SSD or Network share</div>
                </div>
              </label>
            </div>
          </div>

          {/* Format selection: RDB vs CSV */}
          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
            <label className="text-xs font-semibold block mb-2">Формат архива (Log format):</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfig({ ...config, format: 'rdb' })}
                className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                  config.format === 'rdb'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-800 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold">{t.formatRdb}</div>
                <div className="text-[10px] text-slate-500 font-normal">~32 байт/запись</div>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, format: 'csv' })}
                className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                  config.format === 'csv'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-800 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold">{t.formatCsv}</div>
                <div className="text-[10px] text-slate-500 font-normal">~65 байт/запись</div>
              </button>
            </div>
          </div>
        </div>

        {/* Comfort Global Parameters */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              Параметры ротации и емкости
            </h2>
            <button
              onClick={handleLoadSample}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              {lang === 'ru' ? 'Загрузить демо' : 'Load Sample'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.retentionDays}
              </label>
              <input
                type="number"
                min="1"
                value={config.retentionDays}
                onChange={(e) => setConfig({ ...config, retentionDays: parseInt(e.target.value, 10) || 30 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 outline-none"
              />
              <span className="text-[10px] text-slate-400">Период хранения</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.recordsPerLogLabel}
              </label>
              <input
                type="number"
                min="1000"
                max="500000"
                step="1000"
                value={config.recordsPerLog}
                onChange={(e) => setConfig({ ...config, recordsPerLog: parseInt(e.target.value, 10) || 50000 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 outline-none"
              />
              <span className="text-[10px] text-slate-400">{t.recordsPerLogHelper}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.comfortStorageCapacity}
              </label>
              <select
                value={config.storageMediumMb}
                onChange={(e) => setConfig({ ...config, storageMediumMb: parseInt(e.target.value, 10) || 2048 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 outline-none"
              >
                <option value="512">SIMATIC SD 512 MB</option>
                <option value="2048">SIMATIC SD 2 GB (Стандарт)</option>
                <option value="4096">SIMATIC SD 4 GB</option>
                <option value="8192">SIMATIC SD 8 GB</option>
                <option value="16384">SIMATIC SD 16 GB</option>
                <option value="32768">USB Flash 32 GB</option>
              </select>
              <span className="text-[10px] text-slate-400">Емкость SD-карты X51</span>
            </div>
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Правило TIA Portal: </span>
            В WinCC Comfort архивы разделяются на цепочку последовательных файлов (<strong>Sequence of log files</strong>). 
            Рекомендуется держать размер одного файла до 100 000 записей для быстрого открытия графиков Trends на панели.
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500" />
            {t.tagListTitle} ({result.totalTags} тегов)
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddTag}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.btnAddTag}
            </button>
            <button
              onClick={handleAddBulk}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {t.btnAddBulk}
            </button>
            <button
              onClick={() => setTags([])}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
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
                <th className="p-3">{t.colMode}</th>
                <th className="p-3">{t.colCycle}</th>
                <th className="p-3">{t.colCount}</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40">
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={tag.description}
                      onChange={(e) => handleUpdateTag(tag.id, { description: e.target.value })}
                      className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 outline-none"
                    />
                  </td>
                  <td className="p-2.5">
                    <select
                      value={tag.mode}
                      onChange={(e) => handleUpdateTag(tag.id, { mode: e.target.value as any })}
                      className="p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 outline-none"
                    >
                      <option value="cyclic">{t.modeCyclic}</option>
                      <option value="onchange">{t.modeOnChange}</option>
                    </select>
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      disabled={tag.mode === 'onchange'}
                      value={tag.cycleSec}
                      onChange={(e) => handleUpdateTag(tag.id, { cycleSec: parseFloat(e.target.value) || 1 })}
                      className="w-20 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 outline-none disabled:opacity-40"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min="1"
                      value={tag.count}
                      onChange={(e) => handleUpdateTag(tag.id, { count: parseInt(e.target.value, 10) || 1 })}
                      className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 outline-none"
                    />
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
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

      {/* Comfort Results Cards */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          {t.resultsTitle}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total records */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Всего записей за {config.retentionDays} дн.
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.totalRecordsForPeriod.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              ~{result.entriesPerSec.toFixed(2)} зап/сек ({result.recordsPerDay.toLocaleString()}/сут)
            </div>
          </div>

          {/* Files Needed */}
          <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-600/5 dark:bg-emerald-500/10 shadow-sm">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
              {t.comfortFilesNeeded}
            </div>
            <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
              {result.recommendedLogFiles} файлов
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              По {config.recordsPerLog.toLocaleString()} записей на файл
            </div>
          </div>

          {/* Single File Size & Total */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.comfortFileSize}
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.fileSizeMb.toFixed(1)} MB
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              Всего: {result.totalArchiveSizeMb > 1024 ? `${result.totalArchiveSizeGb.toFixed(2)} GB` : `${result.totalArchiveSizeMb.toFixed(0)} MB`}
            </div>
          </div>

          {/* Storage Occupancy */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.storageUsageLabel} ({config.storageMediumMb} MB)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.storageOccupancyPct.toFixed(1)}%
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
              <div 
                className={`h-full transition-all duration-300 ${
                  result.storageOccupancyPct > 85 ? 'bg-rose-500' : 'bg-emerald-600'
                }`}
                style={{ width: `${result.storageOccupancyPct}%` }}
              />
            </div>
          </div>
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
    </div>
  );
};
