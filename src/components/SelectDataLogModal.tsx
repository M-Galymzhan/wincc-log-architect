'use client';
import React, { useState, useEffect } from 'react';
import { Database, X, Check, Layers, HardDrive } from 'lucide-react';
import { Language } from '../lib/types';
import { translations } from '../lib/i18n';

interface SelectDataLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedLogId: string) => void;
  targetRuntime: 'unified' | 'comfort';
  dataLogs: { id: string; name: string }[];
  tagsCount: number;
  lang: Language;
}

export const SelectDataLogModal: React.FC<SelectDataLogModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetRuntime,
  dataLogs,
  tagsCount,
  lang,
}) => {
  const t = translations[lang];
  const [selectedOption, setSelectedOption] = useState<string>('keep_config');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const runtimeLabel = targetRuntime === 'unified' ? 'WinCC Unified' : 'WinCC Comfort';
  const runtimeIcon = targetRuntime === 'unified' 
    ? <Layers className="w-5 h-5 text-[#00A3B5]" />
    : <HardDrive className="w-5 h-5 text-emerald-500" />;

  const handleConfirm = () => {
    onConfirm(selectedOption);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-datalog-title"
        className="glass-panel w-full max-w-lg p-6 rounded-3xl shadow-2xl relative border border-white/20 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95"
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00646E]/10 dark:bg-[#00A3B5]/15 flex items-center justify-center border border-[#00646E]/20 dark:border-[#00A3B5]/30">
              {runtimeIcon}
            </div>
            <div>
              <h3 id="select-datalog-title" className="font-bold text-base text-slate-900 dark:text-white">
                {t.selectDataLogModalTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {runtimeLabel} • {t.selectDataLogModalDesc.replace('{n}', String(dataLogs.length))}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {/* Option 1: Match by config */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedOption === 'keep_config'
                ? 'bg-[#00646E]/10 dark:bg-[#00A3B5]/15 border-[#00646E] dark:border-[#00A3B5] ring-1 ring-[#00646E] dark:ring-[#00A3B5]'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <input
              type="radio"
              name="datalog_choice"
              value="keep_config"
              checked={selectedOption === 'keep_config'}
              onChange={() => setSelectedOption('keep_config')}
              className="mt-1 text-[#00646E] focus:ring-[#00646E]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {t.selectDataLogKeepConfig}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00646E]/10 text-[#00646E] dark:text-[#00A3B5] font-semibold">
                  {lang === 'ru' ? 'Рекомендуется' : 'Recommended'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {lang === 'ru'
                  ? 'Теги будут разложены по архивам в соответствии со свойством «Data log» каждого тега. Если архив не найден, тег попадет в основной архив.'
                  : 'Tags will be routed according to each tag\'s configured "Data log" property. Unmatched tags will be placed in the primary log.'}
              </p>
            </div>
          </label>

          {/* Option 2..N: Specific Data Logs */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 px-1">
              {t.selectDataLogAllTo}
            </span>
            <div className="space-y-2">
              {dataLogs.map((log) => (
                <label
                  key={log.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedOption === log.id
                      ? 'bg-[#00646E]/10 dark:bg-[#00A3B5]/15 border-[#00646E] dark:border-[#00A3B5] ring-1 ring-[#00646E] dark:ring-[#00A3B5]'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="datalog_choice"
                      value={log.id}
                      checked={selectedOption === log.id}
                      onChange={() => setSelectedOption(log.id)}
                      className="text-[#00646E] focus:ring-[#00646E]"
                    />
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                        {log.name}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    ID: {log.id}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t.selectDataLogBtnCancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00646E] hover:bg-[#005159] text-white transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            {t.selectDataLogBtnConfirm} ({tagsCount})
          </button>
        </div>
      </div>
    </div>
  );
};
