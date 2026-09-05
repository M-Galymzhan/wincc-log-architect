'use client';
import React, { useState, useEffect } from 'react';
import { ActiveTab, Language, UnifiedResult, UnifiedConfig, ComfortResult, ComfortConfig, ProfessionalResult, ProfessionalConfig } from '../lib/types';
import { translations, formatPlural } from '../lib/i18n';
import { X, Printer, FileText, CheckCircle2, Cpu, HardDrive, Database } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  activeTab: ActiveTab;
  unifiedData: { config: UnifiedConfig; result: UnifiedResult };
  comfortData: { config: ComfortConfig; result: ComfortResult };
  proData: { config: ProfessionalConfig; result: ProfessionalResult };
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  lang,
  activeTab,
  unifiedData,
  comfortData,
  proData,
}) => {
  const t = translations[lang];

  const [projectName, setProjectName] = useState(() =>
    lang === 'ru' ? 'Проект автоматизации Siemens' : 'Siemens Automation Project'
  );
  const [engineerName, setEngineerName] = useState(() =>
    lang === 'ru' ? 'Инженер АСУ ТП' : 'Siemens Certified Engineer'
  );
  const [viewMode, setViewMode] = useState<'active' | 'all'>('active');

  const dateStr = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    if (lang === 'ru' && (projectName === 'Siemens Automation Project' || !projectName)) {
      setProjectName('Проект автоматизации Siemens');
    } else if (lang === 'en' && (projectName === 'Проект автоматизации Siemens' || !projectName)) {
      setProjectName('Siemens Automation Project');
    }
    if (lang === 'ru' && (engineerName === 'Siemens Certified Engineer' || !engineerName)) {
      setEngineerName('Инженер АСУ ТП');
    } else if (lang === 'en' && (engineerName === 'Инженер АСУ ТП' || !engineerName)) {
      setEngineerName('Siemens Certified Engineer');
    }
  }, [lang]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const showUnified = viewMode === 'all' || activeTab === 'unified';
  const showComfort = viewMode === 'all' || activeTab === 'comfort';
  const showProfessional = viewMode === 'all' || activeTab === 'professional';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:static print:bg-white">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="glass-panel w-full max-w-4xl p-6 md:p-8 rounded-3xl shadow-2xl relative border border-white/20 dark:border-slate-700 my-8 max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:m-0 print:p-0"
      >
        {/* Modal Toolbar (hidden in print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-lg">
            <FileText className="w-5 h-5 text-[#00A3B5]" />
            <span id="report-modal-title">{t.reportTitle}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Filter */}
            <div className="flex items-center rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('active')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'active'
                    ? 'bg-white dark:bg-slate-700 text-[#00646E] dark:text-[#00A3B5] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t.reportViewActive}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-[#00646E] dark:text-[#00A3B5] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t.reportViewAll}
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00646E] hover:bg-[#004D54] text-white flex items-center gap-2 shadow-md shadow-[#00646E]/20 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t.btnPrint}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Engineering Document Layout */}
        <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 print:border-none print:p-0">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-[#00646E] gap-4 mb-6">
            <div>
              <div className="text-2xl font-black tracking-tight text-[#00646E] dark:text-[#00A3B5] uppercase">
                Siemens TIA Portal
              </div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {t.reportSubtitle}
              </div>
            </div>

            <div className="text-right text-xs text-slate-500 font-mono space-y-1">
              <div>{t.reportDate} <span className="font-semibold text-slate-800 dark:text-slate-200">{dateStr}</span></div>
              <div className="flex items-center justify-end gap-1.5">
                <span>{t.reportProjectName}</span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="p-1 px-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100 text-right outline-none focus:ring-1 focus:ring-[#00646E]"
                />
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <span>{t.reportEngineer}</span>
                <input
                  type="text"
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  className="p-1 px-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100 text-right outline-none focus:ring-1 focus:ring-[#00646E]"
                />
              </div>
            </div>
          </div>

          {/* Section 1: WinCC Unified Summary */}
          {showUnified && (
            <div className="mb-8">
              <h4 className="font-bold text-base text-[#00646E] dark:text-[#00A3B5] flex items-center gap-2 mb-3 pb-1 border-b border-slate-200 dark:border-slate-800">
                <Cpu className="w-4 h-4" />
                <span>1. WinCC Unified (SIMATIC Unified Comfort / PC RT)</span>
              </h4>

              <table className="w-full text-xs text-left mb-3">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportTargetPlatform}</td>
                    <td className="py-2 font-semibold">
                      {unifiedData.config.deviceType === 'ucp' ? 'SIMATIC Unified Comfort Panel (Embedded Linux)' : 'WinCC Unified PC Runtime (Windows PC)'}
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportRetention}</td>
                    <td className="py-2 font-semibold">
                      {formatPlural(unifiedData.config.retentionDays, lang, ['сутки', 'суток', 'суток'], ['day', 'days'])} ({unifiedData.config.segmentHours} {lang === 'ru' ? 'ч / сегмент' : 'h / segment'})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportTotalTagsRate}</td>
                    <td className="py-2 font-semibold">
                      {formatPlural(unifiedData.result.totalTags, lang, ['тег', 'тега', 'тегов'], ['tag', 'tags'])} (~{unifiedData.result.totalEntriesPerSec.toFixed(1)} {lang === 'ru' ? 'зап/сек' : 'rec/s'})
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportEntriesPerDay}</td>
                    <td className="py-2 font-semibold font-mono">
                      {unifiedData.result.entriesPerDay.toLocaleString()} {lang === 'ru' ? 'зап./день' : 'rec/day'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportSqliteSegment}</td>
                    <td className="py-2 font-bold font-mono text-[#00646E] dark:text-[#00A3B5]">
                      {unifiedData.result.sqliteSegmentMb} MB ({lang === 'ru' ? 'кратно 4 МБ' : 'multiple of 4 MB'})
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportTotalArchive}</td>
                    <td className="py-2 font-bold font-mono">
                      {unifiedData.result.totalLogGb >= 1 ? `${unifiedData.result.totalLogGb.toFixed(2)} GB` : `${unifiedData.result.totalLogMb} MB`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportStorageUsage}</td>
                    <td className="py-2 font-semibold">
                      {unifiedData.config.storageSizeGb} GB ({unifiedData.result.storageOccupancyPct.toFixed(1)}%)
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportFlashEndurance}</td>
                    <td className="py-2 font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      ~{unifiedData.result.estimatedFlashLifeYears.toFixed(1)} {lang === 'ru' ? 'года' : 'years'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section 2: WinCC Comfort / Advanced Summary */}
          {showComfort && (
            <div className="mb-8">
              <h4 className="font-bold text-base text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200 dark:border-slate-800">
                <HardDrive className="w-4 h-4" />
                <span>2. WinCC Comfort / Advanced (RDB / CSV Logging)</span>
              </h4>

              <table className="w-full text-xs text-left mb-3">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportDeviceFormat}</td>
                    <td className="py-2 font-semibold">
                      {comfortData.config.deviceType === 'comfort_panel' ? 'Comfort Panel (WinCE)' : 'PC RT Advanced'} / {comfortData.config.format.toUpperCase()}
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportRecordsPerLog}</td>
                    <td className="py-2 font-semibold font-mono">
                      {formatPlural(comfortData.config.recordsPerLog, lang, ['запись', 'записи', 'записей'], ['record', 'records'])}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportFilesCount}</td>
                    <td className="py-2 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatPlural(comfortData.result.recommendedLogFiles, lang, ['файл', 'файла', 'файлов'], ['file', 'files'])}
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportFileSize}</td>
                    <td className="py-2 font-semibold font-mono">
                      {comfortData.result.fileSizeMb.toFixed(1)} MB / {comfortData.result.totalArchiveSizeMb > 1024 ? `${comfortData.result.totalArchiveSizeGb.toFixed(2)} GB` : `${comfortData.result.totalArchiveSizeMb.toFixed(0)} MB`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportRetention}</td>
                    <td className="py-2 font-semibold">
                      {formatPlural(comfortData.config.retentionDays, lang, ['сутки', 'суток', 'суток'], ['day', 'days'])}
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportStorageUsage}</td>
                    <td className="py-2 font-semibold">
                      {comfortData.config.storageMediumMb} MB ({comfortData.result.storageOccupancyPct.toFixed(1)}%)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section 3: WinCC Professional Summary */}
          {showProfessional && (
            <div>
              <h4 className="font-bold text-base text-purple-600 dark:text-purple-400 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200 dark:border-slate-800">
                <Database className="w-4 h-4" />
                <span>3. WinCC Professional SCADA (Microsoft SQL Server)</span>
              </h4>

              <table className="w-full text-xs text-left mb-3">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportSqlEdition}</td>
                    <td className="py-2 font-semibold">
                      {proData.config.sqlEdition === 'express' ? 'SQL Server Express (10 GB cap)' : 'SQL Server Standard / Enterprise'}
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportSegmentPeriod}</td>
                    <td className="py-2 font-semibold">
                      {proData.config.segmentPeriod === 'day' ? t.proPeriodDay : proData.config.segmentPeriod === 'week' ? t.proPeriodWeek : t.proPeriodMonth}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportFastMdf}</td>
                    <td className="py-2 font-semibold font-mono">
                      {proData.result.fastDatabaseSizeGb.toFixed(2)} GB ({formatPlural(proData.result.fastTagsCount, lang, ['тег', 'тега', 'тегов'], ['tag', 'tags'])})
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportSlowMdf}</td>
                    <td className="py-2 font-semibold font-mono">
                      {proData.result.slowDatabaseSizeGb.toFixed(2)} GB ({formatPlural(proData.result.slowTagsCount, lang, ['тег', 'тега', 'тегов'], ['tag', 'tags'])})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportTotalMdf}</td>
                    <td className="py-2 font-bold font-mono text-purple-600 dark:text-purple-400">
                      {proData.result.totalMdfSizeGb.toFixed(2)} GB
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportTotalDisk}</td>
                    <td className="py-2 font-bold font-mono">
                      {proData.result.totalStorageGb.toFixed(2)} GB
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Verification Stamp */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t.reportVerifiedStamp}</span>
            </div>
            <div className="font-mono text-[10px] text-[#00646E] dark:text-[#00A3B5] font-bold">
              VERIFIED FOR SIEMENS TIA PORTAL V16-V20
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
