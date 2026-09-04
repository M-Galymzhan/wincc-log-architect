'use client';
import React, { useState, useEffect } from 'react';
import { Language, ActiveTab, DataType } from '../lib/types';
import { translations } from '../lib/i18n';
import { Layers, X, Plus, Sparkles, Activity } from 'lucide-react';

export interface BulkAddConfig {
  prefix: string;
  count: number;
  mode?: 'cyclic' | 'onchange';
  cycleSec: number;
  dataType?: DataType;
  archiveType?: 'fast' | 'slow';
}

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: BulkAddConfig) => void;
  lang: Language;
  platform: ActiveTab;
}

export const BulkAddModal: React.FC<BulkAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  lang,
  platform,
}) => {
  const t = translations[lang];

  const defaultPrefix = platform === 'unified' 
    ? 'Analog_Tag' 
    : platform === 'comfort' 
      ? 'Comfort_Tag' 
      : 'SCADA_Tag';

  const [prefix, setPrefix] = useState(defaultPrefix);
  const [count, setCount] = useState<number>(50);
  const [mode, setMode] = useState<'cyclic' | 'onchange'>('cyclic');
  const [cycleSec, setCycleSec] = useState<number>(1);
  const [dataType, setDataType] = useState<DataType>('Real');

  useEffect(() => {
    if (isOpen) {
      setPrefix(defaultPrefix);
      setCount(50);
      setMode('cyclic');
      setCycleSec(platform === 'professional' ? 2 : 1);
      setDataType('Real');
    }
  }, [isOpen, defaultPrefix, platform]);

  if (!isOpen) return null;

  const effectiveCycle = mode === 'onchange' ? 60 : Math.max(0.1, cycleSec || 1);
  const entriesPerSecPerTag = mode === 'onchange' ? 0.0167 : 1 / effectiveCycle;
  const safeCount = Math.max(1, Math.min(10000, count || 1));
  const totalBatchTraffic = entriesPerSecPerTag * safeCount;
  const totalBatchDailyEntries = Math.round(totalBatchTraffic * 86400);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: BulkAddConfig = {
      prefix: prefix.trim() || defaultPrefix,
      count: safeCount,
      cycleSec: effectiveCycle,
    };
    if (platform === 'unified') {
      config.mode = mode;
      config.dataType = dataType;
    } else if (platform === 'comfort') {
      config.mode = mode;
    } else if (platform === 'professional') {
      config.archiveType = effectiveCycle < 60 ? 'fast' : 'slow';
    }
    onAdd(config);
    onClose();
  };

  const quickCounts = [10, 50, 100, 250, 500];
  const quickCycles = platform === 'professional' 
    ? [0.5, 1, 2, 5, 10, 60, 300] 
    : [0.2, 0.5, 1, 2, 5, 10, 30, 60];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg p-6 rounded-3xl shadow-2xl relative border border-white/20 dark:border-slate-700 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00646E]/10 text-[#00A3B5] border border-[#00646E]/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                {t.bulkModalTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.bulkModalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Prefix */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              {t.bulkNamePrefix}
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-[#00646E] outline-none font-medium"
              placeholder="Sensor_Tag"
              required
            />
          </div>

          {/* Count with Quick buttons */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.bulkCount}
              </label>
              <span className="text-[11px] font-mono text-slate-400">1 ... 10,000</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="10000"
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-32 p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 font-mono font-bold focus:border-[#00646E] outline-none"
              />
              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto">
                {quickCounts.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCount(val)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      count === val
                        ? 'bg-[#00646E] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Platform Specific Fields */}
          {platform !== 'professional' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {t.bulkMode}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('cyclic')}
                  className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    mode === 'cyclic'
                      ? 'border-[#00646E] bg-[#00646E]/10 text-[#00646E] dark:text-[#00A3B5]'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {t.modeCyclic}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('onchange')}
                  className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    mode === 'onchange'
                      ? 'border-[#00646E] bg-[#00646E]/10 text-[#00646E] dark:text-[#00A3B5]'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {t.modeOnChange}
                </button>
              </div>
            </div>
          )}

          {/* Cycle Time (if cyclic) */}
          {(mode === 'cyclic' || platform === 'professional') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.bulkCycle}
                </label>
                {platform === 'professional' && (
                  <span className="text-[11px] font-mono text-purple-500 font-semibold">
                    {effectiveCycle < 60 ? t.bulkArchiveFast : t.bulkArchiveSlow}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={cycleSec}
                  onChange={(e) => setCycleSec(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  className="w-28 p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 font-mono font-bold focus:border-[#00646E] outline-none"
                />
                <div className="flex-1 flex items-center gap-1 overflow-x-auto">
                  {quickCycles.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCycleSec(val)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                        cycleSec === val
                          ? 'bg-[#00646E] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {val}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Data Type (Unified only) */}
          {platform === 'unified' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {t.bulkDataType}
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['Real', 'DInt', 'Int', 'Bool', 'String'] as DataType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDataType(type)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer ${
                      dataType === type
                        ? 'bg-[#00646E] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Batch Impact Preview Card */}
          <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-[#00A3B5]" />
              <span>{t.bulkPreview}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">{t.bulkTotalRate}</span>
              <span className="font-mono font-bold text-[#00646E] dark:text-[#00A3B5]">
                ~{totalBatchTraffic.toFixed(1)} {lang === 'ru' ? 'зап/сек' : 'rec/s'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{t.bulkTotalEntries}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {totalBatchDailyEntries.toLocaleString()} {lang === 'ru' ? 'зап/день' : 'rec/day'}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t.bulkBtnCancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#00646E] hover:bg-[#004D54] shadow-md shadow-[#00646E]/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.bulkBtnAdd}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
