'use client';
import React from 'react';
import { Language, Theme } from '../lib/types';
import { translations } from '../lib/i18n';
import { Sun, Moon, FileText, Download, Upload, Copy, Database, Cpu } from 'lucide-react';

interface HeaderProps {
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  onOpenReport: () => void;
  onOpenCheatSheet: () => void;
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
  onExportJson,
  onImportJson,
}) => {
  const t = translations[lang];

  return (
    <header className="glass-header sticky top-0 z-30 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00646E] to-[#00A3B5] flex items-center justify-center text-white shadow-lg shadow-[#00646E]/30">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg lg:text-xl tracking-tight text-slate-900 dark:text-white">
                {t.appTitle}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#00646E]/15 text-[#00646E] dark:bg-[#00A3B5]/20 dark:text-[#00A3B5] border border-[#00646E]/20 dark:border-[#00A3B5]/30">
                TIA V16-V20
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* TIA Portal Cheat Sheet */}
          <button
            onClick={onOpenCheatSheet}
            className="btn px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-[#00646E] hover:bg-[#004D54] text-white shadow-md shadow-[#00646E]/25 transition-all active:scale-95 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t.btnTiaCheatSheet}</span>
          </button>

          {/* Project Report Button */}
          <button
            onClick={onOpenReport}
            className="btn px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/60 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#00A3B5]" />
            <span>{t.btnReport}</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={onExportJson}
            title={t.btnExportJson}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300/60 dark:border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Import JSON */}
          <button
            onClick={onImportJson}
            title={t.btnImportJson}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300/60 dark:border-slate-700 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
          </button>

          {/* Language Switch */}
          <div className="flex items-center rounded-lg p-0.5 bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setLang('ru')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                lang === 'ru'
                  ? 'bg-white dark:bg-slate-700 text-[#00646E] dark:text-[#00A3B5] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              RU
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-white dark:bg-slate-700 text-[#00646E] dark:text-[#00A3B5] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Switch */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 text-slate-700 dark:text-amber-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>
    </header>
  );
};
