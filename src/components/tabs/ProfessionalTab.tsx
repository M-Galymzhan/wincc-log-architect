'use client';
import React from 'react';
import { ProfessionalTag, ProfessionalConfig, ProfessionalResult, Language } from '../../lib/types';
import { translations } from '../../lib/i18n';
import { Plus, Trash2, Database, AlertTriangle, CheckCircle2, RefreshCw, Zap, Server } from 'lucide-react';

interface ProfessionalTabProps {
  tags: ProfessionalTag[];
  setTags: React.Dispatch<React.SetStateAction<ProfessionalTag[]>>;
  config: ProfessionalConfig;
  setConfig: React.Dispatch<React.SetStateAction<ProfessionalConfig>>;
  result: ProfessionalResult;
  lang: Language;
}

export const ProfessionalTab: React.FC<ProfessionalTabProps> = ({
  tags,
  setTags,
  config,
  setConfig,
  result,
  lang,
}) => {
  const t = translations[lang];

  const handleAddTag = () => {
    const newTag: ProfessionalTag = {
      id: Math.random().toString(36).substring(2, 9),
      description: `Pro_Tag_${tags.length + 1}`,
      cycleSec: 2,
      count: 1,
      archiveType: 'fast',
    };
    setTags([...tags, newTag]);
  };

  const handleAddBulk = () => {
    const count = parseInt(prompt(lang === 'ru' ? 'Сколько одинаковых тегов добавить?' : 'How many bulk tags?', '100') || '0', 10);
    if (count > 0) {
      const newTag: ProfessionalTag = {
        id: Math.random().toString(36).substring(2, 9),
        description: `SCADA_Analog_Signals_${count}x`,
        cycleSec: 2,
        count: count,
        archiveType: 'fast',
      };
      setTags([...tags, newTag]);
    }
  };

  const handleLoadSample = () => {
    setTags([
      { id: '1', description: 'Turbine Vibration & RPM (0.5s Fast)', cycleSec: 0.5, count: 50, archiveType: 'fast' },
      { id: '2', description: 'Boiler Pressures (2s Fast)', cycleSec: 2, count: 200, archiveType: 'fast' },
      { id: '3', description: 'Ambient Weather & Shifts (60s Slow)', cycleSec: 60, count: 150, archiveType: 'slow' },
      { id: '4', description: 'Daily Environmental Totals (300s Slow)', cycleSec: 300, count: 100, archiveType: 'slow' },
    ]);
  };

  const handleUpdateTag = (id: string, updates: Partial<ProfessionalTag>) => {
    setTags(tags.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...updates };
      if (updates.cycleSec !== undefined) {
        updated.archiveType = updated.cycleSec < 60 ? 'fast' : 'slow';
      }
      return updated;
    }));
  };

  const handleRemoveTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
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
                  ? 'border-purple-600 bg-purple-600/5 dark:bg-purple-500/10 shadow-xs'
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
                  <div className="text-sm font-semibold">{t.proSqlExpress}</div>
                  <div className="text-xs text-slate-500">Поставляется в комплекте, ограничение 10 GB</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                config.sqlEdition === 'standard_enterprise'
                  ? 'border-purple-600 bg-purple-600/5 dark:bg-purple-500/10 shadow-xs'
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
                  <div className="text-sm font-semibold">{t.proSqlStandard}</div>
                  <div className="text-xs text-slate-500">Промышленная SCADA, многотерабайтные архивы</div>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
            <label className="text-xs font-semibold block mb-1">{t.proSegmentPeriod}:</label>
            <div className="grid grid-cols-3 gap-2">
              {(['day', 'week', 'month'] as const).map(period => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setConfig({ ...config, segmentPeriod: period })}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    config.segmentPeriod === period
                      ? 'border-purple-600 bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200'
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
              Параметры хранения SCADA
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
                value={config.retentionDays}
                onChange={(e) => setConfig({ ...config, retentionDays: parseInt(e.target.value, 10) || 90 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 outline-none"
              />
              <span className="text-[10px] text-slate-400">Срок хранения в БД</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.proAlarmsPerHour}
              </label>
              <input
                type="number"
                min="0"
                value={config.alarmsPerHour}
                onChange={(e) => setConfig({ ...config, alarmsPerHour: parseInt(e.target.value, 10) || 100 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 outline-none"
              />
              <span className="text-[10px] text-slate-400">Alarm Logging (соб/час)</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Запас индексов БД, %
              </label>
              <input
                type="number"
                min="0"
                value={config.databaseHeadroomPct}
                onChange={(e) => setConfig({ ...config, databaseHeadroomPct: parseInt(e.target.value, 10) || 25 })}
                className="p-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 outline-none"
              />
              <span className="text-[10px] text-slate-400">Резерв фрагментации</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200">
            <span className="font-bold">Siemens SCADA Архитектура:</span>
            В WinCC Professional теги с циклом &lt; 1 мин автоматически помещаются в <strong>Fast Tag Logging</strong> (высокочастотные архивы), 
            а теги с циклом ≥ 1 мин — в <strong>Slow Tag Logging</strong>. Это оптимизирует работу таблиц и индексов в MS SQL Server.
          </div>
        </div>
      </div>

      {/* Tags Table */}
      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              Теги SCADA ({tags.length} групп / {tags.reduce((acc, t) => acc + t.count, 0)} тегов)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddTag}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1 cursor-pointer"
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
                <th className="p-3">Тип архива в SQL</th>
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
                      className="w-full p-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 outline-none font-medium"
                    />
                  </td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      tag.archiveType === 'fast'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    }`}>
                      {tag.archiveType === 'fast' ? 'FAST (< 1m)' : 'SLOW (≥ 1m)'}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={tag.cycleSec}
                      onChange={(e) => handleUpdateTag(tag.id, { cycleSec: parseFloat(e.target.value) || 1 })}
                      className="w-20 p-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 outline-none"
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
              {result.fastTagsCount} тегов, {result.fastEntriesPerDay.toLocaleString()} зап/сут
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
              {result.slowTagsCount} тегов, {result.slowEntriesPerDay.toLocaleString()} зап/сут
            </div>
          </div>

          {/* Total MDF */}
          <div className="p-4 rounded-xl border-2 border-purple-600 bg-purple-600/5 dark:bg-purple-500/10 shadow-sm">
            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
              {t.proMdfTotal} (Все базы)
            </div>
            <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-300">
              {result.totalMdfSizeGb.toFixed(2)} GB
            </div>
            {config.sqlEdition === 'express' && (
              <div className="mt-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  result.expressLimitExceeded ? 'bg-rose-500 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {result.expressLimitExceeded ? 'ПРЕВЫШЕН ЛИМИТ 10 GB!' : 'В пределах 10 GB Express'}
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
              Включая журнал LDF: ~{result.estimatedLdfSizeGb.toFixed(2)} GB
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
