'use client';
import React, { useState } from 'react';
import { ActiveTab, Language, UnifiedResult, UnifiedConfig, ComfortResult, ComfortConfig, ProfessionalResult, ProfessionalConfig } from '../lib/types';
import { translations } from '../lib/i18n';
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
  unifiedData,
  comfortData,
  proData,
}) => {
  const [projectName, setProjectName] = useState('Siemens Automation Project');
  const [engineerName, setEngineerName] = useState('M-Galymzhan');

  if (!isOpen) return null;
  const t = translations[lang];

  const dateStr = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl p-8 rounded-3xl shadow-2xl relative border border-white/20 dark:border-slate-700 my-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Toolbar (hidden in print) */}
        <div className="no-print flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-lg">
            <FileText className="w-5 h-5 text-[#00A3B5]" />
            <span>{t.reportTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00646E] hover:bg-[#004D54] text-white flex items-center gap-2 shadow-md shadow-[#00646E]/20 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t.btnPrint}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Engineering Document Layout */}
        <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-[#00646E] gap-4 mb-6">
            <div>
              <div className="text-2xl font-black tracking-tight text-[#00646E] dark:text-[#00A3B5] uppercase">
                Siemens TIA Portal
              </div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {t.reportDocSubtitle}
              </div>
            </div>

            <div className="text-right text-xs text-slate-500 font-mono space-y-1">
              <div>{t.reportDate}: <span className="font-semibold text-slate-800 dark:text-slate-200">{dateStr}</span></div>
              <div className="flex items-center justify-end gap-1.5">
                <span>{t.reportProjectName}</span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="p-1 px-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-transparent text-right"
                />
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <span>{t.reportEngineer}</span>
                <input
                  type="text"
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  className="p-1 px-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-transparent text-right"
                />
              </div>
            </div>
          </div>

          {/* Section 1: WinCC Unified Summary */}
          <div className="mb-8">
            <h4 className="font-bold text-base text-[#00646E] dark:text-[#00A3B5] flex items-center gap-2 mb-3 pb-1 border-b border-slate-200 dark:border-slate-800">
              <Cpu className="w-4 h-4" />
              1. WinCC Unified (SIMATIC Unified Comfort / PC RT)
            </h4>

            <table className="w-full text-xs text-left mb-3">
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr>
                  <td className="py-2 text-slate-500">{t.reportPlatform}</td>
                  <td className="py-2 font-semibold">{unifiedData.config.deviceType === 'ucp' ? 'SIMATIC Unified Comfort Panel' : 'WinCC Unified PC Runtime'}</td>
                  <td className="py-2 text-slate-500">{t.reportRetention}</td>
                  <td className="py-2 font-semibold">{unifiedData.config.retentionDays} {t.reportDays} ({unifiedData.config.segmentHours} {t.reportHoursPerSeg})</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">{t.reportTotalTagsRate}</td>
                  <td className="py-2 font-semibold">{unifiedData.result.totalTags} {t.reportTags} (~{unifiedData.result.totalEntriesPerSec.toFixed(1)} {t.reportRecPerSec})</td>
                  <td className="py-2 text-slate-500">{t.reportEntriesPerDay}</td>
                  <td className="py-2 font-semibold">{unifiedData.result.entriesPerDay.toLocaleString()} {t.reportRecPerDay}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">{t.reportSqliteSegment}</td>
                  <td className="py-2 font-bold font-mono text-[#00646E] dark:text-[#00A3B5]">{unifiedData.result.sqliteSegmentMb} MB ({t.reportMultiple4Mb})</td>
                  <td className="py-2 text-slate-500">{t.reportTotalLog}</td>
                  <td className="py-2 font-bold font-mono">{unifiedData.result.totalLogGb >= 1 ? `${unifiedData.result.totalLogGb.toFixed(2)} GB` : `${unifiedData.result.totalLogMb} MB`}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">{t.reportStorageOccupancy}</td>
                  <td className="py-2 font-semibold">{unifiedData.config.storageSizeGb} GB ({unifiedData.result.storageOccupancyPct.toFixed(1)}%)</td>
                  <td className="py-2 text-slate-500">{t.reportFlashLife}</td>
                  <td className="py-2 font-semibold text-emerald-600">~{unifiedData.result.estimatedFlashLifeYears.toFixed(1)} {t.reportYears}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: WinCC Comfort / Advanced Summary */}
          <div className="mb-8">
            <h4 className="font-bold text-base text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200 dark:border-slate-800">
              <HardDrive className="w-4 h-4" />
              2. WinCC Comfort / Advanced (RDB / CSV Logging)
            </h4>

            <table className="w-full text-xs text-left mb-3">
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr>
                  <td className="py-2 text-slate-500">{t.reportDeviceFormat}</td>
                  <td className="py-2 font-semibold">{comfortData.config.deviceType === 'comfort_panel' ? 'Comfort Panel (WinCE)' : 'PC RT Advanced'} / {comfortData.config.format.toUpperCase()}</td>
                  <td className="py-2 text-slate-500">{t.reportRecPerFile}</td>
                  <td className="py-2 font-semibold">{comfortData.config.recordsPerLog.toLocaleString()} {t.reportRecs}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">{t.reportSequenceFiles}</td>
                  <td className="py-2 font-bold font-mono text-emerald-600">{comfortData.result.recommendedLogFiles} {t.reportFiles}</td>
                  <td className="py-2 text-slate-500">{t.reportFileSizeTotal}</td>
                  <td className="py-2 font-semibold">{comfortData.result.fileSizeMb.toFixed(1)} MB / {comfortData.result.totalArchiveSizeMb.toFixed(0)} MB</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: WinCC Professional Summary */}
          <div>
            <h4 className="font-bold text-base text-purple-600 dark:text-purple-400 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200 dark:border-slate-800">
              <Database className="w-4 h-4" />
              3. WinCC Professional SCADA (Microsoft SQL Server)
            </h4>

            <table className="w-full text-xs text-left mb-3">
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr>
                  <td className="py-2 text-slate-500">{t.reportSqlEdition}</td>
                  <td className="py-2 font-semibold">{proData.config.sqlEdition === 'express' ? 'SQL Server Express (10 GB limit)' : 'SQL Server Standard / Enterprise'}</td>
                  <td className="py-2 text-slate-500">{t.reportSegPeriod}</td>
                  <td className="py-2 font-semibold">{proData.config.segmentPeriod.toUpperCase()}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">{t.reportFastMdf}</td>
                  <td className="py-2 font-semibold">{proData.result.fastDatabaseSizeGb.toFixed(2)} GB</td>
                  <td className="py-2 text-slate-500">{t.reportSlowMdf}</td>
                  <td className="py-2 font-semibold">{proData.result.slowDatabaseSizeGb.toFixed(2)} GB</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">{t.reportTotalMdf}</td>
                  <td className="py-2 font-bold font-mono text-purple-600">{proData.result.totalMdfSizeGb.toFixed(2)} GB</td>
                  <td className="py-2 text-slate-500">{t.reportTotalDisk}</td>
                  <td className="py-2 font-bold font-mono">{proData.result.totalStorageGb.toFixed(2)} GB</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Verification Stamp */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{t.reportVerifiedNote}</span>
            </div>
            <div className="font-mono text-[10px]">VERIFIED FOR TIA PORTAL V16-V20</div>
          </div>
        </div>
      </div>
    </div>
  );
};
