'use client';
import React from 'react';
import { Language, Theme } from '../lib/types';
import { translations } from '../lib/i18n';
import { Sun, Moon, FileText, Download, Upload, Copy, Cpu, Sparkles, Coffee } from 'lucide-react';

interface HeaderProps {
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  onOpenReport: () => void;
  onOpenCheatSheet: () => void;
  onOpenPresets: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  setLang,
  theme,
  setTheme,
  onOpenReport,
  onOpenCheatSheet,
  onOpenPresets,
  onExportJson,
  onImportJson,
}) => {
  const t = translations[lang];

  React.useEffect(() => {
    try {
      localStorage.removeItem('wincc_ui_zoom');
      if (typeof document !== 'undefined') {
        document.documentElement.style.zoom = '';
      }
    } catch {}
  }, []);

  return (
    <header className="glass-header sticky top-0 z-30 py-2.5 sm:py-3 transition-colors">
      <div className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        {/* Row 1 on mobile, Left side on desktop */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#00646E] to-[#00A3B5] flex items-center justify-center text-white shadow-md shadow-[#00646E]/30 shrink-0">
              <Cpu className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-bold text-base sm:text-lg xl:text-xl tracking-tight text-slate-900 dark:text-white truncate">
                  <span className="hidden xl:inline">{t.appTitle}</span>
                  <span className="inline xl:hidden">WinCC Log Architect</span>
                </h1>
                <span className="hidden xl:inline-flex text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#00646E]/15 text-[#00646E] dark:bg-[#00A3B5]/20 dark:text-[#00A3B5] border border-[#00646E]/20 dark:border-[#00A3B5]/30 whitespace-nowrap shrink-0">
                  TIA V16-V20
                </span>
                <a
                  href="https://github.com/M-Galymzhan/wincc-log-architect/commits/main"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={lang === 'ru' ? 'Релиз v2.16.0 (кликните для просмотра коммитов на GitHub)' : 'Release v2.16.0 (click to view GitHub commits)'}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>v2.16.0</span>
                </a>
                <a
                  href="https://ko-fi.com/glmm1"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t.kofiHeaderTooltip}
                  className="hidden 2xl:flex text-xs font-semibold tracking-tight px-2 py-0.5 rounded-full bg-[#FF5E5B]/15 hover:bg-[#FF5E5B]/25 text-[#FF5E5B] dark:text-[#ff7b78] border border-[#FF5E5B]/30 items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Coffee className="w-3 h-3 text-[#FF5E5B]" />
                  <span>{lang === 'ru' ? 'На чай' : 'Ko-fi'}</span>
                </a>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden 2xl:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Mobile Top Controls: Language & Theme switch (shown strictly on mobile < sm) */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            {/* Mobile Lang Switch */}
            <div className="flex items-center rounded-lg p-0.5 bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setLang('ru')}
                className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                  lang === 'ru'
                    ? 'bg-white dark:bg-slate-700 text-[#00646E] dark:text-[#00A3B5] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                RU
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-slate-700 text-[#00646E] dark:text-[#00A3B5] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                EN
              </button>
            </div>

            {/* Mobile Theme Switch */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 text-slate-700 dark:text-amber-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              aria-label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 shrink-0" /> : <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Desktop Action Controls (hidden on mobile, single horizontal level on sm+) */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Industry Presets Library */}
          <button
            onClick={onOpenPresets}
            title={t.btnIndustryPresets}
            className="btn px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-sm shadow-cyan-600/25 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden 2xl:inline">{t.btnIndustryPresets}</span>
            <span className="inline 2xl:hidden">{lang === 'ru' ? 'Шаблоны' : 'Presets'}</span>
          </button>

          {/* TIA Portal Cheat Sheet */}
          <button
            onClick={onOpenCheatSheet}
            title={t.btnTiaCheatSheet}
            className="btn px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 bg-[#00646E] hover:bg-[#004D54] text-white shadow-sm shadow-[#00646E]/25 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden 2xl:inline">{t.btnTiaCheatSheet}</span>
            <span className="inline 2xl:hidden">{lang === 'ru' ? 'Шпаргалка' : 'Cheat Sheet'}</span>
          </button>

          {/* Project Report Button */}
          <button
            onClick={onOpenReport}
            title={t.btnReport}
            className="btn px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/60 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00A3B5] shrink-0" />
            <span className="hidden xl:inline">{t.btnReport}</span>
            <span className="inline xl:hidden">{lang === 'ru' ? 'Отчет' : 'Report'}</span>
          </button>

          {/* Separator */}
          <div className="h-5 w-px bg-slate-300/60 dark:bg-slate-700 hidden sm:block mx-0.5" />

          {/* Export JSON */}
          <button
            onClick={onExportJson}
            title={t.btnExportJson}
            aria-label={t.btnExportJson}
            className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300/60 dark:border-slate-700 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4 shrink-0" />
          </button>

          {/* Import JSON */}
          <button
            onClick={onImportJson}
            title={t.btnImportJson}
            aria-label={t.btnImportJson}
            className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300/60 dark:border-slate-700 transition-all cursor-pointer shrink-0"
          >
            <Upload className="w-4 h-4 shrink-0" />
          </button>

          {/* Language Switch */}
          <div className="flex items-center rounded-lg p-0.5 bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 text-xs font-semibold shrink-0">
            <button
              onClick={() => setLang('ru')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                lang === 'ru'
                  ? 'bg-white dark:bg-slate-700 text-[#00646E] dark:text-[#00A3B5] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              RU
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-white dark:bg-slate-700 text-[#00646E] dark:text-[#00A3B5] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Switch */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 text-slate-700 dark:text-amber-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer shrink-0"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            aria-label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 text-slate-700 shrink-0" />}
          </button>
        </div>

        {/* Row 2 on mobile: Quick Action Toolbar (visible strictly on < sm) */}
        <div className="flex sm:hidden items-center gap-1.5 w-full pt-2 border-t border-slate-200/60 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
          {/* Industry Presets Library */}
          <button
            onClick={onOpenPresets}
            title={t.btnIndustryPresets}
            className="flex-1 min-w-fit py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{lang === 'ru' ? 'Шаблоны' : 'Presets'}</span>
          </button>

          {/* TIA Portal Cheat Sheet */}
          <button
            onClick={onOpenCheatSheet}
            title={t.btnTiaCheatSheet}
            className="flex-1 min-w-fit py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-[#00646E] hover:bg-[#004D54] text-white shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Copy className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{lang === 'ru' ? 'Шпаргалка' : 'Cheat Sheet'}</span>
          </button>

          {/* Project Report Button */}
          <button
            onClick={onOpenReport}
            title={t.btnReport}
            className="flex-1 min-w-fit py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/60 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-[#00A3B5] shrink-0" />
            <span className="whitespace-nowrap">{lang === 'ru' ? 'Отчет' : 'Report'}</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={onExportJson}
            title={t.btnExportJson}
            aria-label={t.btnExportJson}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300/60 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
          </button>

          {/* Import JSON */}
          <button
            onClick={onImportJson}
            title={t.btnImportJson}
            aria-label={t.btnImportJson}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300/60 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </header>
  );
};
