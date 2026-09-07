'use client';
import React, { useState, useEffect } from 'react';
import { Language, UnifiedAlarmLogConfig, UnifiedAlarmTag } from '../lib/types';
import { translations } from '../lib/i18n';
import { Bell, X, Plus } from 'lucide-react';

interface BulkAddAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (params: {
    count: number;
    prefix: string;
    alarmClass: UnifiedAlarmTag['alarmClass'];
    triggerType: UnifiedAlarmTag['triggerType'];
    eventsPerDay: number;
    alarmLogId: string;
  }) => void;
  alarmLogs: UnifiedAlarmLogConfig[];
  defaultAlarmLogId?: string;
  lang: Language;
}

export const BulkAddAlarmModal: React.FC<BulkAddAlarmModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  alarmLogs,
  defaultAlarmLogId,
  lang,
}) => {
  const t = translations[lang];
  const [count, setCount] = useState<number | ''>(10);
  const [prefix, setPrefix] = useState<string>('Alarm_M');
  const [alarmLogId, setAlarmLogId] = useState<string>(
    defaultAlarmLogId || alarmLogs[0]?.id || 'alarms_log'
  );
  const [alarmClass, setAlarmClass] = useState<UnifiedAlarmTag['alarmClass']>('Alarm');
  const [triggerType, setTriggerType] = useState<UnifiedAlarmTag['triggerType']>('digital');
  const [eventsPerDay, setEventsPerDay] = useState<number | ''>(5);

  useEffect(() => {
    if (isOpen) {
      setAlarmLogId(defaultAlarmLogId || alarmLogs[0]?.id || 'alarms_log');
    }
  }, [isOpen, defaultAlarmLogId, alarmLogs]);

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
    const safeCount = Math.max(1, Math.min(5000, typeof count === 'number' ? count : 1));
    const safeEvents = Math.max(0, typeof eventsPerDay === 'number' ? eventsPerDay : 0);
    const targetLogId = alarmLogId || alarmLogs[0]?.id || 'alarms_log';

    onAdd({
      count: safeCount,
      prefix: prefix.trim() || 'Alarm_',
      alarmClass,
      triggerType,
      eventsPerDay: safeEvents,
      alarmLogId: targetLogId,
    });
    onClose();
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-add-alarm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="glass-panel w-full max-w-lg p-6 rounded-3xl shadow-2xl relative border border-white/20 dark:border-slate-700">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 id="bulk-add-alarm-modal-title" className="font-bold text-base text-slate-900 dark:text-white">
                {t.modalBulkAlarmTitle}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                WinCC Unified HMI Alarms & Events (SQLite)
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
          {/* Target Alarm Log */}
          {alarmLogs.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.bulkAlarmLog}
              </label>
              <select
                value={alarmLogId}
                onChange={(e) => setAlarmLogId(e.target.value)}
                className="p-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                {alarmLogs.map((al) => (
                  <option key={al.id} value={al.id}>
                    {al.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Number of Alarm Signals */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.bulkAlarmCount}
              </label>
              <div className="flex items-center gap-1">
                {[5, 10, 25, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCount(num)}
                    className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-500/15 hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min="1"
              max="5000"
              required
              value={count}
              onChange={(e) => setCount(e.target.value === '' ? '' : parseInt(e.target.value, 10) || '')}
              className="p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Prefix */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.bulkAlarmPrefix}
            </label>
            <input
              type="text"
              required
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Alarm Class & Trigger Type in 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.bulkAlarmClass}
              </label>
              <select
                value={alarmClass}
                onChange={(e) => setAlarmClass(e.target.value as UnifiedAlarmTag['alarmClass'])}
                className="p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="Alarm">{t.alarmClassAlarm}</option>
                <option value="Warning">{t.alarmClassWarning}</option>
                <option value="Event">{t.alarmClassEvent}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.bulkAlarmTrigger}
              </label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as UnifiedAlarmTag['triggerType'])}
                className="p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="digital">{t.triggerDigital}</option>
                <option value="analog">{t.triggerAnalog}</option>
              </select>
            </div>
          </div>

          {/* Events Per Day */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.bulkAlarmEventsPerDay}
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 5, 10, 20].map((ev) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => setEventsPerDay(ev)}
                    className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-500/15 hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              step="0.1"
              min="0"
              required
              value={eventsPerDay}
              onChange={(e) => setEventsPerDay(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
              className="p-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {t.btnCancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.bulkAlarmBtnSubmit}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
