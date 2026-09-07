'use client';
import React, { useState, useEffect } from 'react';
import { ActiveTab, Language, UnifiedResult, UnifiedConfig, ComfortResult, ComfortConfig, ProfessionalResult, ProfessionalConfig } from '../lib/types';
import { translations, formatPlural } from '../lib/i18n';
import { X, Printer, FileText, CheckCircle2, Cpu, HardDrive, Database, Package, Activity } from 'lucide-react';
import { getSiemensArticle } from '../lib/calculator/mlfbCatalog';

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

  const [customProjectName, setCustomProjectName] = useState<string | null>(null);
  const [customEngineerName, setCustomEngineerName] = useState<string | null>(null);

  const projectName = customProjectName !== null
    ? customProjectName
    : (lang === 'ru' ? 'Проект автоматизации Siemens' : 'Siemens Automation Project');

  const engineerName = customEngineerName !== null
    ? customEngineerName
    : (lang === 'ru' ? 'Инженер АСУ ТП' : 'Siemens Certified Engineer');

  const [viewMode, setViewMode] = useState<'active' | 'all'>('active');

  const dateStr = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
                  onChange={(e) => setCustomProjectName(e.target.value)}
                  className="p-1 px-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-slate-100 text-right outline-none focus:ring-1 focus:ring-[#00646E]"
                />
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <span>{t.reportEngineer}</span>
                <input
                  type="text"
                  value={engineerName}
                  onChange={(e) => setCustomEngineerName(e.target.value)}
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
                      {unifiedData.config.storageMedium === 'sd_custom_x52' && (
                        <span className="ml-1.5 inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          High Endurance / Industrial
                        </span>
                      )}
                      {unifiedData.config.deviceType === 'ucp' && unifiedData.config.storageMedium === 'sd_custom_x52' && (unifiedData.config.storageSizeGb || 0) > 32 && (
                        <span className="ml-1.5 inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                          NTFS / FAT32 (exFAT not supported)
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{t.reportFlashEndurance}</td>
                    <td className="py-2 font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      {unifiedData.config.deviceType === 'pc_rt' ? 'N/A' : `~${unifiedData.result.estimatedFlashLifeYears.toFixed(1)} ${lang === 'ru' ? 'лет' : 'yrs'}`}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Multi-Log Specification Breakdown */}
              {unifiedData.result.logItems && unifiedData.result.logItems.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    {lang === 'ru' ? 'Спецификация баз данных журналов (Data logs & Alarm logs)' : 'Databases Specification (Data logs & Alarm logs)'}
                  </div>
                  <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-[10px] uppercase">
                      <tr>
                        <th className="p-2">{lang === 'ru' ? 'Имя в TIA' : 'Name in TIA'}</th>
                        <th className="p-2">{lang === 'ru' ? 'Тип' : 'Category'}</th>
                        <th className="p-2">{lang === 'ru' ? 'Событий/сутки' : 'Load (ev/day)'}</th>
                        <th className="p-2">{lang === 'ru' ? 'Срок' : 'Retention'}</th>
                        <th className="p-2">{lang === 'ru' ? 'Сегмент' : 'Segment'}</th>
                        <th className="p-2 font-mono text-[#00646E] dark:text-[#00A3B5]">Max Segment</th>
                        <th className="p-2 font-mono">Max Log</th>
                        <th className="p-2 text-right">{lang === 'ru' ? 'Объем' : 'Footprint'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                      {unifiedData.result.logItems.map(item => (
                        <tr key={item.id}>
                          <td className="p-2 font-bold font-mono">{item.name}</td>
                          <td className="p-2">{lang === 'ru' ? item.categoryNameRu : item.categoryNameEn}</td>
                          <td className="p-2">~{item.entriesPerDay.toLocaleString()}</td>
                          <td className="p-2">{item.retentionDays} d</td>
                          <td className="p-2">{item.segmentHours} h</td>
                          <td className="p-2 font-bold text-[#00646E] dark:text-[#00A3B5]">{item.sqliteSegmentMb} MB</td>
                          <td className="p-2 font-bold">{item.totalLogMb} MB</td>
                          <td className="p-2 text-right font-bold">{item.totalLogGb >= 1 ? `${item.totalLogGb.toFixed(2)} GB` : `${item.totalLogMb} MB`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                      {comfortData.config.deviceType === 'comfort_panel' && (
                        <span className="ml-1.5 inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Max 32 GB (FAT32)
                        </span>
                      )}
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

          {/* Section: Siemens Hardware Bill of Materials (BoM) */}
          <div className="mb-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>{t.mlfbCardTitle}</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-2.5">{lang === 'ru' ? 'Подсистема' : 'Subsystem'}</th>
                    <th className="p-2.5">{lang === 'ru' ? 'Наименование компонента' : 'Component Name'}</th>
                    <th className="p-2.5 font-mono">{t.mlfbSiemensArticle}</th>
                    <th className="p-2.5">{lang === 'ru' ? 'Емкость' : 'Capacity'}</th>
                    <th className="p-2.5">{lang === 'ru' ? 'Рекомендация Siemens' : 'Recommended For'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {showUnified && (() => {
                    const art = getSiemensArticle(unifiedData.config.storageMedium);
                    const effectiveGb = (unifiedData.config.storageMedium === 'ssd_custom' || unifiedData.config.storageMedium === 'sd_custom_x52')
                      ? unifiedData.config.storageSizeGb
                      : art.capacityGb;
                    return (
                      <tr>
                        <td className="p-2.5 font-semibold text-[#00646E] dark:text-[#00A3B5]">WinCC Unified</td>
                        <td className="p-2.5">
                          {unifiedData.config.storageMedium === 'sd_custom_x52'
                            ? (lang === 'ru' ? 'Пользовательская SDHC/SDXC (Слот X52 Data)' : art.name)
                            : art.name}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{art.mlfb}</td>
                        <td className="p-2.5">{effectiveGb} GB</td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400">{art.recommendedFor}</td>
                      </tr>
                    );
                  })()}
                  {showComfort && (() => {
                    const mediumKey = comfortData.config.storageMediumMb === 512 ? 'sd_512m' : comfortData.config.storageMediumMb >= 32768 ? 'usb_128g' : 'sd_2g';
                    const art = getSiemensArticle(mediumKey);
                    return (
                      <tr>
                        <td className="p-2.5 font-semibold text-emerald-600 dark:text-emerald-400">WinCC Comfort</td>
                        <td className="p-2.5">{art.name}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{art.mlfb}</td>
                        <td className="p-2.5">{art.capacityGb} GB</td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400">{art.recommendedFor}</td>
                      </tr>
                    );
                  })()}
                  {showProfessional && (() => {
                    const art = getSiemensArticle('ssd_custom');
                    return (
                      <tr>
                        <td className="p-2.5 font-semibold text-purple-600 dark:text-purple-400">WinCC Professional</td>
                        <td className="p-2.5">{art.name}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{art.mlfb}</td>
                        <td className="p-2.5">{art.capacityGb} GB</td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400">{art.recommendedFor}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Industrial Ethernet Network Bandwidth Assessment */}
          <div className="mb-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>{t.networkReportTitle}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {t.networkReportDesc}
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 mb-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-2.5">{lang === 'ru' ? 'Подсистема' : 'Subsystem'}</th>
                    <th className="p-2.5">{t.networkBandwidth}</th>
                    <th className="p-2.5">{t.networkSaturation}</th>
                    <th className="p-2.5">{t.networkDailyVolume}</th>
                    <th className="p-2.5">{t.networkPacketsPerSec}</th>
                    <th className="p-2.5">{lang === 'ru' ? 'Статус сети' : 'Network Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {showUnified && (
                    <tr>
                      <td className="p-2.5 font-semibold text-[#00646E] dark:text-[#00A3B5]">WinCC Unified</td>
                      <td className="p-2.5 font-mono font-bold">
                        {unifiedData.result.network.bandwidthKbps >= 1000
                          ? `${unifiedData.result.network.bandwidthMbps} Mbps`
                          : `${unifiedData.result.network.bandwidthKbps} Kbps`}
                      </td>
                      <td className="p-2.5 font-mono">{unifiedData.result.network.fastEthernetSaturationPct}%</td>
                      <td className="p-2.5 font-mono">{unifiedData.result.network.dailyTrafficMb} MB/day</td>
                      <td className="p-2.5 font-mono">~{unifiedData.result.network.telegramsPerSec} pkt/s</td>
                      <td className="p-2.5 font-medium">
                        {unifiedData.result.network.networkStatus === 'safe'
                          ? t.networkStatusSafe
                          : unifiedData.result.network.networkStatus === 'warning'
                          ? t.networkStatusWarning
                          : t.networkStatusCritical}
                      </td>
                    </tr>
                  )}
                  {showComfort && (
                    <tr>
                      <td className="p-2.5 font-semibold text-emerald-600 dark:text-emerald-400">WinCC Comfort</td>
                      <td className="p-2.5 font-mono font-bold">
                        {comfortData.result.network.bandwidthKbps >= 1000
                          ? `${comfortData.result.network.bandwidthMbps} Mbps`
                          : `${comfortData.result.network.bandwidthKbps} Kbps`}
                      </td>
                      <td className="p-2.5 font-mono">{comfortData.result.network.fastEthernetSaturationPct}%</td>
                      <td className="p-2.5 font-mono">{comfortData.result.network.dailyTrafficMb} MB/day</td>
                      <td className="p-2.5 font-mono">~{comfortData.result.network.telegramsPerSec} pkt/s</td>
                      <td className="p-2.5 font-medium">
                        {comfortData.result.network.networkStatus === 'safe'
                          ? t.networkStatusSafe
                          : comfortData.result.network.networkStatus === 'warning'
                          ? t.networkStatusWarning
                          : t.networkStatusCritical}
                      </td>
                    </tr>
                  )}
                  {showProfessional && (
                    <tr>
                      <td className="p-2.5 font-semibold text-purple-600 dark:text-purple-400">WinCC Professional</td>
                      <td className="p-2.5 font-mono font-bold">
                        {proData.result.network.bandwidthKbps >= 1000
                          ? `${proData.result.network.bandwidthMbps} Mbps`
                          : `${proData.result.network.bandwidthKbps} Kbps`}
                      </td>
                      <td className="p-2.5 font-mono">{proData.result.network.fastEthernetSaturationPct}%</td>
                      <td className="p-2.5 font-mono">{proData.result.network.dailyTrafficMb} MB/day</td>
                      <td className="p-2.5 font-mono">~{proData.result.network.telegramsPerSec} pkt/s</td>
                      <td className="p-2.5 font-medium">
                        {proData.result.network.networkStatus === 'safe'
                          ? t.networkStatusSafe
                          : proData.result.network.networkStatus === 'warning'
                          ? t.networkStatusWarning
                          : t.networkStatusCritical}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Top active recommendation */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold">{t.networkRecommendationTitle}: </span>
              {activeTab === 'unified' && (lang === 'ru' ? unifiedData.result.network.recommendationRu : unifiedData.result.network.recommendationEn)}
              {activeTab === 'comfort' && (lang === 'ru' ? comfortData.result.network.recommendationRu : comfortData.result.network.recommendationEn)}
              {activeTab === 'professional' && (lang === 'ru' ? proData.result.network.recommendationRu : proData.result.network.recommendationEn)}
            </div>
          </div>

          {/* Section: Siemens Storage Commissioning & Operation Requirements */}
          <div className="mb-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <HardDrive className="w-4 h-4 text-[#00A3B5]" />
              <span>{t.reportStorageReqsTitle}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {t.reportStorageReqsSub}
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-2.5 w-12 text-center">#</th>
                    <th className="p-2.5 w-1/4">{lang === 'ru' ? 'Правило / Параметр' : 'Rule / Parameter'}</th>
                    <th className="p-2.5 w-28">{lang === 'ru' ? 'Стандарт' : 'Standard'}</th>
                    <th className="p-2.5">{lang === 'ru' ? 'Инженерное требование Siemens (SIOS)' : 'Siemens Engineering Requirement (SIOS)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr>
                    <td className="p-2.5 text-center font-bold font-mono text-[#00646E] dark:text-[#00A3B5]">1</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{t.storageChecklistRule1Title}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{t.storageChecklistRule1Badge}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{t.storageChecklistRule1Desc}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-center font-bold font-mono text-[#00646E] dark:text-[#00A3B5]">2</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{t.storageChecklistRule2Title}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{t.storageChecklistRule2Badge}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{t.storageChecklistRule2Desc}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-center font-bold font-mono text-[#00646E] dark:text-[#00A3B5]">3</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{t.storageChecklistRule3Title}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{t.storageChecklistRule3Badge}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{t.storageChecklistRule3Desc}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-center font-bold font-mono text-[#00646E] dark:text-[#00A3B5]">4</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{t.storageChecklistRule4Title}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{t.storageChecklistRule4Badge}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{t.storageChecklistRule4Desc}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-center font-bold font-mono text-[#00646E] dark:text-[#00A3B5]">5</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{t.storageChecklistRule5Title}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{t.storageChecklistRule5Badge}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{t.storageChecklistRule5Desc}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-center font-bold font-mono text-[#00646E] dark:text-[#00A3B5]">6</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{t.storageChecklistRule6Title}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{t.storageChecklistRule6Badge}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{t.storageChecklistRule6Desc}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

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
