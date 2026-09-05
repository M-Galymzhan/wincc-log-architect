'use client';
import React, { useEffect } from 'react';
import { ActiveTab, Language } from '../lib/types';
import { translations } from '../lib/i18n';
import { INDUSTRY_PRESETS, IndustryPreset } from '../lib/presets';
import { X, Droplets, Flame, ShieldCheck, Wind, Check, Sparkles, Layers } from 'lucide-react';

interface IndustryPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: IndustryPreset) => void;
  activeTab: ActiveTab;
  lang: Language;
}

export const IndustryPresetsModal: React.FC<IndustryPresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  activeTab,
  lang,
}) => {
  const t = translations[lang];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderIcon = (iconName: string) => {
    const props = { className: 'w-6 h-6 text-cyan-600 dark:text-cyan-400' };
    switch (iconName) {
      case 'Droplets':
        return <Droplets {...props} />;
      case 'Flame':
        return <Flame {...props} className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
      case 'ShieldCheck':
        return <ShieldCheck {...props} className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />;
      case 'Wind':
        return <Wind {...props} className="w-6 h-6 text-sky-600 dark:text-sky-400" />;
      default:
        return <Layers {...props} />;
    }
  };

  const getTagSummary = (preset: IndustryPreset) => {
    if (activeTab === 'unified') {
      const totalCount = preset.unifiedTags.reduce((sum, tag) => sum + tag.count, 0);
      return `${preset.unifiedTags.length} ${lang === 'ru' ? 'групп' : 'groups'} (${totalCount} ${t.presetTagCount})`;
    } else if (activeTab === 'comfort') {
      const totalCount = preset.comfortTags.reduce((sum, tag) => sum + tag.count, 0);
      return `${preset.comfortTags.length} ${lang === 'ru' ? 'групп' : 'groups'} (${totalCount} ${t.presetTagCount})`;
    } else {
      const totalCount = preset.proTags.reduce((sum, tag) => sum + tag.count, 0);
      return `${preset.proTags.length} ${lang === 'ru' ? 'групп' : 'groups'} (${totalCount} ${t.presetTagCount})`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-white"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800">
              <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {t.presetModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.presetModalSub}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INDUSTRY_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="group relative flex flex-col justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-cyan-500/50 hover:shadow-lg dark:hover:shadow-cyan-950/20 transition duration-200"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 group-hover:scale-105 transition">
                      {renderIcon(preset.icon)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {lang === 'ru' ? preset.nameRu : preset.nameEn}
                      </h3>
                      <span className="inline-block mt-0.5 text-[11px] font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-200/60 dark:border-cyan-800/60">
                        {getTagSummary(preset)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {lang === 'ru' ? preset.descRu : preset.descEn}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Siemens TIA Portal Validated
                  </span>
                  <button
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm hover:shadow transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t.presetApplyBtn}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
