'use client';
import React, { useState } from 'react';
import { ComfortTag, ComfortConfig, ComfortResult, Language, ToastMessage } from '../../lib/types';
import { translations, formatPlural } from '../../lib/i18n';
import { BulkAddModal } from '../BulkAddModal';
import { ConfirmModal } from '../ConfirmModal';
import { Plus, Trash2, HardDrive, AlertTriangle, CheckCircle2, RefreshCw, FileSpreadsheet, Layers, Download } from 'lucide-react';
import { getSiemensArticle } from '../../lib/calculator/mlfbCatalog';
import { generateTiaPortalCsv, downloadFile } from '../../lib/tiaExporter';

interface ComfortTabProps {
  tags: ComfortTag[];
  setTags: React.Dispatch<React.SetStateAction<ComfortTag[]>>;
  config: ComfortConfig;
  setConfig: React.Dispatch<React.SetStateAction<ComfortConfig>>;
  result: ComfortResult;
  lang: Language;
  onShowToast?: (message: string, type?: ToastMessage['type']) => void;
}

export const ComfortTab: React.FC<ComfortTabProps> = ({
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
    const newTag: ComfortTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `Tag_${tags.length + 1}`,
      mode: 'cyclic',
      cycleSec: 2,
      count: 1,
    };
    setTags([...tags, newTag]);
    if (onShowToast) onShowToast(lang === 'ru' ? 'Тег добавлен' : 'Tag added', 'success');
  };

  const handleBulkAddSubmit = (params: {
    count: number;
    prefix: string;
    cycleSec: number;
    mode: 'cyclic' | 'onchange';
  }) => {
    const newTag: ComfortTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `${params.prefix}${params.count}x`,
      mode: params.mode,
      cycleSec: params.cycleSec,
      count: params.count,
    };
    setTags(prev => [...prev, newTag]);
    if (onShowToast) onShowToast(t.toastBulkAdded, 'success');
  };

  const handleLoadSample = () => {
    setTags([
      { id: '1', description: lang === 'ru' ? 'Температуры зон печи (1с)' : 'Oven Zone Temperatures (1s)', mode: 'cyclic', cycleSec: 1, count: 20 },
      { id: '2', description: lang === 'ru' ? 'Давление и скорость линии (2с)' : 'Line Pressures & Speed (2s)', mode: 'cyclic', cycleSec: 2, count: 50 },
      { id: '3', description: lang === 'ru' ? 'Суточные счетчики продукции (10с)' : 'Daily Counters (10s)', mode: 'cyclic', cycleSec: 10, count: 30 },
      { id: '4', description: lang === 'ru' ? 'Действия оператора (По изм.)' : 'Operator Actions (On change)', mode: 'onchange', cycleSec: 60, count: 100 },
    ]);
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
    const csv = generateTiaPortalCsv('comfort', tags, 'Comfort_DataLog');
    downloadFile(csv, `TIA_WinCC_Comfort_Tags_${new Date().toISOString().slice(0, 10)}.csv`);
    if (onShowToast) onShowToast(t.exportTiaSuccess, 'success');
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
                  ? 'border-emerald-600 bg-emerald-600/5 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30'
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
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.comfortPanel}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Windows CE, SIMATIC SD Card (X51 slot)</div>
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
                  onChange={() => setConfig({ ...config, deviceType: 'rt_advanced', storageMediumMb: 32768 })}
                  className="accent-emerald-600 w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.comfortRtAdv}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Windows PC, local HDD/SSD or Network share</div>
                </div>
              </label>
            </div>
          </div>

          {/* Format selection: RDB vs CSV */}
          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
            <label className="text-xs font-semibold block mb-2 text-slate-700 dark:text-slate-300">
              {lang === 'ru' ? 'Формат архива (Log format):' : 'Log format (Storage type):'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfig({ ...config, format: 'rdb' })}
                className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                  config.format === 'rdb'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold">{t.formatRdb}</div>
                <div className="text-[10px] text-slate-500 font-normal">{t.comfortFormatRdbSub}</div>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, format: 'csv' })}
                className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                  config.format === 'csv'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold">{t.formatCsv}</div>
                <div className="text-[10px] text-slate-500 font-normal">{t.comfortFormatCsvSub}</div>
              </button>
            </div>
          </div>
        </div>

        {/* Comfort Global Parameters */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              {lang === 'ru' ? 'Параметры ротации и емкости' : 'Archive Rotation & Capacity'}
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
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Период хранения' : 'Retention days'}</span>
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
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.recordsPerLogHelper}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.comfortStorageCapacity}
              </label>
              <select
                value={config.storageMediumMb}
                onChange={(e) => setConfig({ ...config, storageMediumMb: parseInt(e.target.value, 10) || 2048 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="512">SIMATIC SD 512 MB</option>
                <option value="2048">SIMATIC SD 2 GB ({t.comfortStorageStandard})</option>
                <option value="4096">SIMATIC SD 4 GB</option>
                <option value="8192">SIMATIC SD 8 GB</option>
                <option value="16384">SIMATIC SD 16 GB</option>
                <option value="32768">USB Flash 32 GB</option>
              </select>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.comfortStorageCardHelp}</span>
            </div>
          </div>

          {/* Siemens MLFB Article Info */}
          {(() => {
            const mediumKey = config.storageMediumMb === 512 ? 'sd_512m' : config.storageMediumMb >= 32768 ? 'usb_128g' : 'sd_2g';
            const article = getSiemensArticle(mediumKey);
            return (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    {t.mlfbSiemensArticle}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-600/10 dark:bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-600/20 dark:border-emerald-400/20">
                    {article.mlfb}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  {lang === 'ru' ? article.descriptionRu : article.descriptionEn}
                </div>
              </div>
            );
          })()}

          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {lang === 'ru' ? 'Правило TIA Portal: ' : 'TIA Portal Rule: '}
            </span>
            {lang === 'ru'
              ? 'В WinCC Comfort архивы разделяются на цепочку последовательных файлов (Sequence of log files). Рекомендуется держать размер одного файла до 100 000 записей для быстрого открытия графиков Trends на панели.'
              : 'In WinCC Comfort, historical data is divided into a circular sequence of log files. Keeping individual files under 100,000 records ensures instant trend display performance without panel UI freeze.'}
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500" />
            {t.tagListTitle} ({formatPlural(result.totalTags, lang, ['тег', 'тега', 'тегов'], ['tag', 'tags'])})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportTiaCsv}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title={t.btnExportTiaCsv}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.btnExportTiaCsv}</span>
            </button>
            <button
              onClick={handleAddTag}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.btnAddTag}
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.btnAddBulk}
            </button>
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-all"
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
              {tags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-xs text-slate-500 dark:text-slate-300">
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
                        className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
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
                ))
              )}
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
              {lang === 'ru' ? `Всего записей за ${config.retentionDays} дн.` : `Total records for ${config.retentionDays} days`}
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.totalRecordsForPeriod.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              ~{result.entriesPerSec.toFixed(2)} {lang === 'ru' ? 'зап/сек' : 'rec/s'} ({result.recordsPerDay.toLocaleString()} {lang === 'ru' ? 'в сут' : 'per day'})
            </div>
          </div>

          {/* Files Needed */}
          <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-600/5 dark:bg-emerald-500/10 shadow-sm">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
              {t.comfortFilesNeeded}
            </div>
            <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
              {formatPlural(result.recommendedLogFiles, lang, ['файл', 'файла', 'файлов'], ['file', 'files'])}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'ru' ? `По ${config.recordsPerLog.toLocaleString()} записей на файл` : `${config.recordsPerLog.toLocaleString()} records/file`}
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
              {lang === 'ru' ? 'Всего:' : 'Total:'} {result.totalArchiveSizeMb > 1024 ? `${result.totalArchiveSizeGb.toFixed(2)} GB` : `${result.totalArchiveSizeMb.toFixed(0)} MB`}
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

      {/* Bulk Add Modal */}
      <BulkAddModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onAdd={handleBulkAddSubmit}
        tab="comfort"
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
