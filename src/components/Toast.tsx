'use client';
import React, { useEffect } from 'react';
import { ToastMessage } from '../lib/types';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  let borderClass = 'border-emerald-500/50 text-emerald-900 dark:text-emerald-100 bg-emerald-50/90 dark:bg-emerald-950/90';
  let Icon = CheckCircle2;
  let iconColor = 'text-emerald-500';

  if (toast.type === 'error') {
    borderClass = 'border-rose-500/50 text-rose-900 dark:text-rose-100 bg-rose-50/90 dark:bg-rose-950/90';
    Icon = AlertCircle;
    iconColor = 'text-rose-500';
  } else if (toast.type === 'warning') {
    borderClass = 'border-amber-500/50 text-amber-900 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-950/90';
    Icon = AlertTriangle;
    iconColor = 'text-amber-500';
  } else if (toast.type === 'info') {
    borderClass = 'border-[#00A3B5]/50 text-cyan-900 dark:text-cyan-100 bg-cyan-50/90 dark:bg-cyan-950/90';
    Icon = Info;
    iconColor = 'text-[#00A3B5]';
  }

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 transform translate-y-0 opacity-100 animate-in slide-in-from-bottom-2 ${borderClass}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
        <p className="text-xs font-semibold leading-snug break-words">
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div 
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
