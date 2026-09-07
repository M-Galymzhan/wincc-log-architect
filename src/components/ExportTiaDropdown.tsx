'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, Sparkles } from 'lucide-react';
import { Language } from '../lib/types';
import { translations } from '../lib/i18n';

interface ExportTiaDropdownProps {
  onExportXlsx: () => void;
  onExportCsv: () => void;
  lang: Language;
  themeColor?: 'emerald' | 'amber' | 'purple';
  buttonLabel?: string;
  tooltipTitle?: string;
  className?: string;
  align?: 'left' | 'right';
}

export const ExportTiaDropdown: React.FC<ExportTiaDropdownProps> = ({
  onExportXlsx,
  onExportCsv,
  lang,
  themeColor = 'emerald',
  buttonLabel,
  tooltipTitle,
  className = '',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const buttonBg = themeColor === 'amber'
    ? 'bg-amber-600 hover:bg-amber-500 text-white'
    : themeColor === 'purple'
    ? 'bg-purple-600 hover:bg-purple-500 text-white'
    : 'bg-emerald-600 hover:bg-emerald-500 text-white';

  const label = buttonLabel || (lang === 'ru' ? 'Экспорт TIA' : 'Export TIA');
  const title = tooltipTitle || t.btnExportTia;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold ${buttonBg} flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0`}
        title={title}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-1.5 w-72 sm:w-80 rounded-xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/10 dark:ring-white/10 border border-slate-200/80 dark:border-slate-800 p-2 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100`}>
          <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.exportTiaDropdownTitle}
            </span>
          </div>

          <div className="space-y-1">
            {/* XLSX Option (Recommended) */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportXlsx();
              }}
              className="w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 transition-all cursor-pointer group border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/40"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {t.exportTiaXlsxLabel}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5 shrink-0">
                    <Sparkles className="w-2.5 h-2.5" />
                    {t.exportTiaXlsxBadge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  {t.exportTiaXlsxDesc}
                </p>
              </div>
            </button>

            {/* CSV Option */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportCsv();
              }}
              className="w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-500/15 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-white">
                    {t.exportTiaCsvLabel}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {t.exportTiaCsvBadge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  {t.exportTiaCsvDesc}
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
