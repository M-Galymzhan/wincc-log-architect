'use client';
import React from 'react';
import { ActiveTab, Language } from '../lib/types';
import { translations } from '../lib/i18n';
import { Layers, HardDrive, Database } from 'lucide-react';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  lang: Language;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, setActiveTab, lang }) => {
  const t = translations[lang];

  const tabs = [
    {
      id: 'unified' as ActiveTab,
      label: t.tabUnified,
      badge: t.tabUnifiedBadge,
      icon: Layers,
      color: '#00A3B5',
    },
    {
      id: 'comfort' as ActiveTab,
      label: t.tabComfort,
      badge: t.tabComfortBadge,
      icon: HardDrive,
      color: '#10B981',
    },
    {
      id: 'professional' as ActiveTab,
      label: t.tabProfessional,
      badge: t.tabProfessionalBadge,
      icon: Database,
      color: '#8B5CF6',
    },
  ];

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-panel max-w-4xl mx-auto mb-6 shadow-md overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-[#00646E] to-[#00828F] text-white shadow-lg shadow-[#00646E]/30 scale-[1.01]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-slate-800/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isActive
                  ? 'bg-white/20 text-white border-white/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
              }`}
            >
              {tab.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
};
