'use client';
import React, { useState, useEffect } from 'react';
import { ActiveTab, Language, UnifiedTag } from '../lib/types';
import { translations } from '../lib/i18n';
import { Layers, X, Plus } from 'lucide-react';

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (params: {
    count: number;
    prefix: string;
    cycleSec: number;
    mode: 'cyclic' | 'onchange';
    dataType?: UnifiedTag['dataType'];
    archiveType?: 'fast' | 'slow';
  }) => void;
  tab: ActiveTab;
  lang: Language;
}

export const BulkAddModal: React.FC<BulkAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  tab,
  lang,
}) => {
  const t = translations[lang];
  const [count, setCount] = useState<number | ''>(50);
  const [prefix, setPrefix] = useState<string>(
    tab === 'unified' ? 'Unified_Sensor_' : tab === 'comfort' ? 'Comfort_Tag_' : 'SCADA_Signal_'
  );
  const [cycleSec, setCycleSec] = useState<number | ''>(2);
  const [mode, setMode] = useState<'cyclic' | 'onchange'>('cyclic');
  const [dataType, setDataType] = useState<UnifiedTag['dataType']>('Real');
  const [archiveType, setArchiveType] = useState<'fast' | 'slow'>('fast');

  useEffect(() => {
    if (tab === 'unified') setPrefix('Unified_Sensor_');
    else if (tab === 'comfort') setPrefix('Comfort_Tag_');
    else setPrefix('SCADA_Signal_');
  }, [tab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeCount = Math.max(1, Math.min(10000, typeof count === 'number' ? count : 1));
    const safeCycle = Math.max(0.01, typeof cycleSec === 'number' ? cycleSec : 1);
    onAdd({
      count: safeCount,
      prefix: prefix.trim() || 'Tag_',
      cycleSec: safeCycle,
      mode,
      dataType,
      archiveType: tab === 'professional' ? archiveType : undefined,
    });
    onClose();
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-add-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="glass-panel w-full max-w-lg p-6 rounded-3xl shadow-2xl relative border border-white/20 dark:border-slate-700">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00646E]/10 text-[#00646E] dark:text-[#00A3B5] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 id="bulk-add-modal-title" className="font-bold text-base text-slate-900 dark:text-white">
                {t.modalBulkTitle}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {tab === 'unified' ? 'WinCC Unified (SQLite)' : tab === 'comfort' ? 'WinCC Comfort (RDB/CSV)' : 'WinCC Professional (SQL Server)'}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tag Count with Quick Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.bulkCount}
              </label>
              <div className="flex items-center gap-1">
                {[10, 50, 100, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCount(preset)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                      count === preset
                        ? 'bg-[#00646E] text-white border-[#00646E]'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min="1"
              max="10000"
              required
              autoFocus
              value={count}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1);
                setCount(val);
              }}
              onBlur={() => {
                if (count === '' || count < 1) setCount(50);
              }}
              className="w-full p-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none"
            />
          </div>

          {/* Name Prefix */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              {t.bulkNamePrefix}
            </label>
            <input
              type="text"
              required
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full p-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {lang === 'ru' ? `Теги будут созданы в виде: ${prefix || 'Tag_'}1, ${prefix || 'Tag_'}2...` : `Tags will be created as: ${prefix || 'Tag_'}1, ${prefix || 'Tag_'}2...`}
            </p>
          </div>

          {/* Cycle Time with Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.bulkCycle} {mode === 'onchange' && `(${t.modeOnChange})`}
              </label>
              <div className="flex items-center gap-1">
                {[0.5, 1, 2, 5, 10, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    disabled={mode === 'onchange'}
                    onClick={() => {
                      setCycleSec(sec);
                      if (tab === 'professional') setArchiveType(sec < 60 ? 'fast' : 'slow');
                    }}
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      cycleSec === sec
                        ? 'bg-[#00646E] text-white border-[#00646E]'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              step="0.1"
              min="0.01"
              required
              disabled={mode === 'onchange'}
              value={cycleSec}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
                setCycleSec(val);
                if (tab === 'professional' && typeof val === 'number' && val > 0) {
                  setArchiveType(val < 60 ? 'fast' : 'slow');
                }
              }}
              onBlur={() => {
                if (cycleSec === '' || cycleSec <= 0) setCycleSec(1);
              }}
              className="w-full p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 focus:border-[#00646E] focus:ring-2 focus:ring-[#00646E]/20 outline-none disabled:opacity-40"
            />
          </div>

          {/* Tab Specific Options */}
          {tab === 'unified' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t.bulkMode}
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'cyclic' | 'onchange')}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 outline-none"
                >
                  <option value="cyclic">{t.modeCyclic}</option>
                  <option value="onchange">{t.modeOnChange}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t.bulkDataType}
                </label>
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value as UnifiedTag['dataType'])}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 outline-none"
                >
                  <option value="Real">Real (Float 4B)</option>
                  <option value="LReal">LReal (Double 8B)</option>
                  <option value="DInt">DInt (32-bit 4B)</option>
                  <option value="Int">Int (16-bit 2B)</option>
                  <option value="Bool">Bool (1B)</option>
                  <option value="String">String (Text)</option>
                </select>
              </div>
            </div>
          )}

          {tab === 'comfort' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {t.bulkMode}
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'cyclic' | 'onchange')}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 outline-none"
              >
                <option value="cyclic">{t.modeCyclic}</option>
                <option value="onchange">{t.modeOnChange}</option>
              </select>
            </div>
          )}

          {tab === 'professional' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {t.bulkArchiveType}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setArchiveType('fast')}
                  className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    archiveType === 'fast'
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.bulkFastDesc}
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveType('slow')}
                  className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    archiveType === 'slow'
                      ? 'bg-blue-100 dark:bg-blue-950/60 border-blue-500 text-blue-800 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.bulkSlowDesc}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t.btnCancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#00646E] hover:bg-[#004D54] text-white flex items-center gap-1.5 shadow-md shadow-[#00646E]/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.btnAdd}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
