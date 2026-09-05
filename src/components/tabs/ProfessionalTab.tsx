'use client';
import React, { useState } from 'react';
import { ProfessionalTag, ProfessionalConfig, ProfessionalResult, Language, ToastMessage } from '../../lib/types';
import { translations, formatPlural } from '../../lib/i18n';
import { BulkAddModal } from '../BulkAddModal';
import { ConfirmModal } from '../ConfirmModal';
import { Plus, Trash2, Database, AlertTriangle, CheckCircle2, RefreshCw, Zap, Server } from 'lucide-react';

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
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleAddTag = () => {
    const newTag: ProfessionalTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `Pro_Tag_${tags.length + 1}`,
      cycleSec: 2,
      count: 1,
      archiveType: 'fast',
    };
    setTags([...tags, newTag]);
    if (onShowToast) onShowToast(lang === 'ru' ? 'Тег добавлен' : 'Tag added', 'success');
  };

  const handleBulkAddSubmit = (params: {
    count: number;
    prefix: string;
    cycleSec: number;
    archiveType?: 'fast' | 'slow';
  }) => {
    const determinedType = params.archiveType || (params.cycleSec < 60 ? 'fast' : 'slow');
    const newTag: ProfessionalTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `${params.prefix}${params.count}x`,
      cycleSec: params.cycleSec,
      count: params.count,
      archiveType: determinedType,
    };
    setTags(prev => [...prev, newTag]);
    if (onShowToast) onShowToast(t.toastBulkAdded, 'success');
  };

  const handleLoadSample = () => {
    setTags([
      { id: '1', description: lang === 'ru' ? 'Вибрация и обороты турбины (0.5с Fast)' : 'Turbine Vibration & RPM (0.5s Fast)', cycleSec: 0.5, count: 50, archiveType: 'fast' },
      { id: '2', description: lang === 'ru' ? 'Давление в паровом котле (2с Fast)' : 'Boiler Pressures (2s Fast)', cycleSec: 2, count: 200, archiveType: 'fast' },
      { id: '3', description: lang === 'ru' ? 'Температура окружающей среды (60с Slow)' : 'Ambient Weather & Shifts (60s Slow)', cycleSec: 60, count: 150, archiveType: 'slow' },
      { id: '4', description: lang === 'ru' ? 'Суточные экологические выбросы (300с Slow)' : 'Daily Environmental Totals (300s Slow)', cycleSec: 300, count: 100, archiveType: 'slow' },
    ]);
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
    setTags([]);
    if (onShowToast) onShowToast(t.toastCleared, 'info');
  };

  return (
    <div className="space-y-6">
      {/* SQL Server Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SQL Server Edition */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-purple-500" />
              {t.proSqlEdition}
            </h2>

            <div className="space-y-2.5">
              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.sqlEdition === 'express'
                  ? 'border-purple-600 bg-purple-600/5 dark:bg-purple-500/10 ring-1 ring-purple-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="sqlEdition"
                  checked={config.sqlEdition === 'express'}
                  onChange={() => setConfig({ ...config, sqlEdition: 'express' })}
                  className="accent-purple-600 w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.proSqlExpress}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'ru' ? 'Поставляется в комплекте, жесткое ограничение 10 GB на базу' : 'Bundled with WinCC, hard 10 GB limit per database'}
                  </div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.sqlEdition === 'standard_enterprise'
                  ? 'border-purple-600 bg-purple-600/5 dark:bg-purple-500/10 ring-1 ring-purple-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}>
                <input
                  type="radio"
                  name="sqlEdition"
                  checked={config.sqlEdition === 'standard_enterprise'}
                  onChange={() => setConfig({ ...config, sqlEdition: 'standard_enterprise' })}
                  className="accent-purple-600 w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.proSqlStandard}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'ru' ? 'Промышленная SCADA, многотерабайтные архивы без ограничений' : 'Enterprise SCADA, multi-terabyte storage without 10 GB cap'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
            <label className="text-xs font-semibold block mb-1.5 text-slate-700 dark:text-slate-300">
              {t.proSegmentPeriod}:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['day', 'week', 'month'] as const).map(period => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setConfig({ ...config, segmentPeriod: period })}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    config.segmentPeriod === period
                      ? 'border-purple-600 bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {period === 'day' ? t.proPeriodDay : period === 'week' ? t.proPeriodWeek : t.proPeriodMonth}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Retention & Alarms Settings */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-500" />
              {lang === 'ru' ? 'Параметры хранения SCADA' : 'SCADA Storage Parameters'}
            </h2>
            <button
              onClick={handleLoadSample}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
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
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Срок хранения в БД' : 'Retention period'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.proAlarmsPerHour}
              </label>
              <input
                type="number"
                min="0"
                value={config.alarmsPerHour !== undefined ? config.alarmsPerHour : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                  setConfig({ ...config, alarmsPerHour: val });
                }}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Alarm Logging ({t.proAlarmsUnit})</span>
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
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{lang === 'ru' ? 'Резерв фрагментации' : 'Index headroom'}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200">
            <span className="font-bold">{lang === 'ru' ? 'Siemens SCADA Архитектура: ' : 'Siemens SCADA Architecture: '}</span>
            {lang === 'ru'
              ? 'В WinCC Professional теги с циклом < 1 мин автоматически направляются в Fast Tag Logging (высокочастотные архивы), а теги с циклом ≥ 1 мин — в Slow Tag Logging. Вы можете вручную переключить режим любого тега кликом по бейджу.'
              : 'In WinCC Professional, tags with cycle < 1 min are routed to Fast Tag Logging, while tags with cycle ≥ 1 min go to Slow Tag Logging. You can toggle any tag archive type by clicking its badge.'}
          </div>
        </div>
      </div>

      {/* Tags Table */}
      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              {lang === 'ru'
                ? `Теги SCADA (${formatPlural(tags.length, lang, ['группа', 'группы', 'групп'], ['group', 'groups'])} / ${formatPlural(tags.reduce((acc, tItem) => acc + tItem.count, 0), lang, ['тег', 'тега', 'тегов'], ['tag', 'tags'])})`
                : `SCADA Tags (${tags.length} groups / ${tags.reduce((acc, tItem) => acc + tItem.count, 0)} tags)`}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddTag}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.btnAddTag}
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 transition-all"
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
                <th className="p-3">{lang === 'ru' ? 'Тип архива в SQL' : 'SQL Archive Type'}</th>
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
                tags.map((tag) => {
                  const effectiveArchiveType = tag.archiveType || (tag.cycleSec < 60 ? 'fast' : 'slow');
                  return (
                  <tr key={tag.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={tag.description}
                        onChange={(e) => handleUpdateTag(tag.id, { description: e.target.value })}
                        className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none font-medium"
                      />
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
                        className="w-20 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                      />
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
                        className="w-16 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
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

      {/* Results Dashboard */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-purple-500" />
          {t.resultsTitle}
        </h2>

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

          {/* Total MDF */}
          <div className="p-4 rounded-xl border-2 border-purple-600 bg-purple-600/5 dark:bg-purple-500/10 shadow-sm">
            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
              {t.proMdfTotal} ({lang === 'ru' ? 'Все базы' : 'Total MDF'})
            </div>
            <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-300">
              {result.totalMdfSizeGb.toFixed(2)} GB
            </div>
            {config.sqlEdition === 'express' && (
              <div className="mt-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  result.expressLimitExceeded ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {result.expressLimitExceeded
                    ? (lang === 'ru' ? 'ПРЕВЫШЕН ЛИМИТ 10 GB!' : 'EXCEEDS 10 GB LIMIT!')
                    : (lang === 'ru' ? 'В пределах 10 GB Express' : 'Within 10 GB Express limit')}
                </span>
              </div>
            )}
          </div>

          {/* Total Disk Space */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.proTotalDiskSpace} (MDF + LDF)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {result.totalStorageGb.toFixed(2)} GB
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {lang === 'ru' ? 'Включая журнал LDF:' : 'Including LDF:'} ~{result.estimatedLdfSizeGb.toFixed(2)} GB
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
