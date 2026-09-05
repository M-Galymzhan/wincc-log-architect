'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, Language, Theme, UnifiedTag, UnifiedConfig, ComfortTag, ComfortConfig, ProfessionalTag, ProfessionalConfig, ToastMessage } from '../lib/types';
import { calculateUnified } from '../lib/calculator/unifiedEngine';
import { calculateComfort } from '../lib/calculator/comfortEngine';
import { calculateProfessional } from '../lib/calculator/professionalEngine';
import { translations } from '../lib/i18n';
import { Header } from '../components/Header';
import { NavigationTabs } from '../components/NavigationTabs';
import { UnifiedTab } from '../components/tabs/UnifiedTab';
import { ComfortTab } from '../components/tabs/ComfortTab';
import { ProfessionalTab } from '../components/tabs/ProfessionalTab';
import { TiaCheatSheetModal } from '../components/TiaCheatSheetModal';
import { ReportModal } from '../components/ReportModal';
import { IndustryPresetsModal } from '../components/IndustryPresetsModal';
import { IndustryPreset } from '../lib/presets';
import { Toast } from '../components/Toast';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('ru');
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState<ActiveTab>('unified');

  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 1. Unified State
  const [unifiedTags, setUnifiedTags] = useState<UnifiedTag[]>([
    { id: '1', description: 'Main Header Pressures (0.5s)', mode: 'cyclic', cycleSec: 0.5, entriesPerSec: 2, count: 30, dataType: 'Real' },
    { id: '2', description: 'Bearing & Winding Temps (2s)', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 90, dataType: 'Real' },
    { id: '3', description: 'Tank Storage Levels (5s)', mode: 'cyclic', cycleSec: 5, entriesPerSec: 0.2, count: 60, dataType: 'Real' },
    { id: '4', description: 'Safety Valve Interlocks (On Change)', mode: 'onchange', cycleSec: 60, entriesPerSec: 0.0167, count: 120, dataType: 'Bool' },
  ]);

  const [unifiedConfig, setUnifiedConfig] = useState<UnifiedConfig>({
    deviceType: 'ucp',
    retentionDays: 30,
    segmentHours: 24,
    perEntryBytes: 50,
    headroomPct: 30,
    includeAlarms: true,
    alarmsPerDay: 500,
    includeAudit: false,
    auditEntriesPerDay: 200,
    storageMedium: 'sd_12g',
    storageSizeGb: 12,
  });

  // 2. Comfort State
  const [comfortTags, setComfortTags] = useState<ComfortTag[]>([
    { id: '1', description: 'Zone Pressures (1s)', mode: 'cyclic', cycleSec: 1, count: 20 },
    { id: '2', description: 'Pump Status (2s)', mode: 'cyclic', cycleSec: 2, count: 40 },
    { id: '3', description: 'Total Flow Counters (10s)', mode: 'cyclic', cycleSec: 10, count: 30 },
  ]);

  const [comfortConfig, setComfortConfig] = useState<ComfortConfig>({
    deviceType: 'comfort_panel',
    format: 'rdb',
    retentionDays: 30,
    recordsPerLog: 50000,
    logMethod: 'segmented',
    storageMediumMb: 2048,
  });

  // 3. Professional State
  const [proTags, setProTags] = useState<ProfessionalTag[]>([
    { id: '1', description: 'Turbine Vibration & RPM (0.5s Fast)', cycleSec: 0.5, count: 40, archiveType: 'fast' },
    { id: '2', description: 'Boiler Feed Pressures (2s Fast)', cycleSec: 2, count: 180, archiveType: 'fast' },
    { id: '3', description: 'Hourly Environmental Averages (60s Slow)', cycleSec: 60, count: 120, archiveType: 'slow' },
  ]);

  const [proConfig, setProConfig] = useState<ProfessionalConfig>({
    sqlEdition: 'express',
    retentionDays: 90,
    segmentPeriod: 'month',
    includeAlarmLogging: true,
    alarmsPerHour: 150,
    databaseHeadroomPct: 25,
  });

  // Load from LocalStorage
  useEffect(() => {
    setMounted(true);
    try {
      const savedLang = localStorage.getItem('wincc_lang') as Language;
      if (savedLang === 'ru' || savedLang === 'en') setLang(savedLang);
      const savedTheme = localStorage.getItem('wincc_theme') as Theme;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } else {
        document.documentElement.classList.add('dark');
      }
      const savedData = localStorage.getItem('wincc_project_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed.unifiedTags)) setUnifiedTags(parsed.unifiedTags);
        if (parsed.unifiedConfig && typeof parsed.unifiedConfig === 'object') setUnifiedConfig(parsed.unifiedConfig);
        if (Array.isArray(parsed.comfortTags)) setComfortTags(parsed.comfortTags);
        if (parsed.comfortConfig && typeof parsed.comfortConfig === 'object') setComfortConfig(parsed.comfortConfig);
        if (Array.isArray(parsed.proTags)) setProTags(parsed.proTags);
        if (parsed.proConfig && typeof parsed.proConfig === 'object') setProConfig(parsed.proConfig);
      }
    } catch (e) {
      console.error('LocalStorage load error:', e);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('wincc_lang', lang);
      localStorage.setItem('wincc_theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
      const payload = {
        unifiedTags,
        unifiedConfig,
        comfortTags,
        comfortConfig,
        proTags,
        proConfig,
      };
      localStorage.setItem('wincc_project_data', JSON.stringify(payload));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }, [lang, theme, unifiedTags, unifiedConfig, comfortTags, comfortConfig, proTags, proConfig, mounted]);

  // Export Project JSON
  const handleExportJson = () => {
    const payload = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      unified: { tags: unifiedTags, config: unifiedConfig },
      comfort: { tags: comfortTags, config: comfortConfig },
      professional: { tags: proTags, config: proConfig },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wincc-log-architect-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(translations[lang].toastExportSuccess, 'success');
  };

  // Import Project JSON with strict schema validation
  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          let loaded = false;

          // Unified tags & config (supports both nested and flat schema)
          const uTags = parsed.unified?.tags || parsed.unifiedTags;
          if (Array.isArray(uTags)) {
            setUnifiedTags(uTags);
            loaded = true;
          }
          const uConfig = parsed.unified?.config || parsed.unifiedConfig;
          if (uConfig && typeof uConfig === 'object') {
            setUnifiedConfig(prev => ({ ...prev, ...uConfig }));
            loaded = true;
          }

          // Comfort tags & config (supports both nested and flat schema)
          const cTags = parsed.comfort?.tags || parsed.comfortTags;
          if (Array.isArray(cTags)) {
            setComfortTags(cTags);
            loaded = true;
          }
          const cConfig = parsed.comfort?.config || parsed.comfortConfig;
          if (cConfig && typeof cConfig === 'object') {
            setComfortConfig(prev => ({ ...prev, ...cConfig }));
            loaded = true;
          }

          // Professional tags & config (supports both nested and flat schema)
          const pTags = parsed.professional?.tags || parsed.proTags;
          if (Array.isArray(pTags)) {
            setProTags(pTags);
            loaded = true;
          }
          const pConfig = parsed.professional?.config || parsed.proConfig;
          if (pConfig && typeof pConfig === 'object') {
            setProConfig(prev => ({ ...prev, ...pConfig }));
            loaded = true;
          }

          if (loaded) {
            addToast(translations[lang].toastImportSuccess, 'success');
          } else {
            addToast(translations[lang].toastImportError, 'error');
          }
        } catch {
          addToast(translations[lang].toastImportError, 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleApplyPreset = (preset: IndustryPreset) => {
    if (activeTab === 'unified') {
      setUnifiedTags(preset.unifiedTags.map((t, i) => ({ ...t, id: `${preset.id}_${i + 1}` })));
    } else if (activeTab === 'comfort') {
      setComfortTags(preset.comfortTags.map((t, i) => ({ ...t, id: `${preset.id}_${i + 1}` })));
    } else {
      setProTags(preset.proTags.map((t, i) => ({ ...t, id: `${preset.id}_${i + 1}` })));
    }
    addToast(translations[lang].presetAppliedToast, 'success');
  };

  // Calculations with active language for localized warnings
  const unifiedResult = calculateUnified(unifiedTags, unifiedConfig, lang);
  const comfortResult = calculateComfort(comfortTags, comfortConfig, lang);
  const proResult = calculateProfessional(proTags, proConfig, lang);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen pb-16">
      {/* Ambient background glowing blobs (Siemens Petrol & Cyan) */}
      <div 
        className="ambient-blob w-[500px] h-[500px] -top-32 -left-32 bg-[#00646E]"
        style={{ animationDelay: '0s' }}
      />
      <div 
        className="ambient-blob w-[450px] h-[450px] top-1/3 -right-32 bg-[#00A3B5]"
        style={{ animationDelay: '-5s' }}
      />
      <div 
        className="ambient-blob w-[400px] h-[400px] -bottom-24 left-1/3 bg-[#10B981]"
        style={{ animationDelay: '-10s' }}
      />

      {/* Application Header */}
      <Header
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 relative z-10">
        {/* Navigation Tabs with Warnings Indicator */}
        <NavigationTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lang={lang}
          warnings={{
            unified: unifiedResult.warnings.length > 0,
            comfort: comfortResult.warnings.length > 0,
            professional: proResult.warnings.length > 0,
          }}
        />

        {/* Tab Panels */}
        <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {/* Tab 1: WinCC Unified */}
          {activeTab === 'unified' && (
            <UnifiedTab
              tags={unifiedTags}
              setTags={setUnifiedTags}
              config={unifiedConfig}
              setConfig={setUnifiedConfig}
              result={unifiedResult}
              lang={lang}
              onShowToast={addToast}
            />
          )}

          {/* Tab 2: WinCC Comfort / Advanced */}
          {activeTab === 'comfort' && (
            <ComfortTab
              tags={comfortTags}
              setTags={setComfortTags}
              config={comfortConfig}
              setConfig={setComfortConfig}
              result={comfortResult}
              lang={lang}
              onShowToast={addToast}
            />
          )}

          {/* Tab 3: WinCC Professional */}
          {activeTab === 'professional' && (
            <ProfessionalTab
              tags={proTags}
              setTags={setProTags}
              config={proConfig}
              setConfig={setProConfig}
              result={proResult}
              lang={lang}
              onShowToast={addToast}
            />
          )}
        </div>
      </main>

      {/* TIA Portal Cheat Sheet Modal */}
      <TiaCheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        activeTab={activeTab}
        lang={lang}
        unifiedData={{ config: unifiedConfig, result: unifiedResult }}
        comfortData={{ config: comfortConfig, result: comfortResult }}
        proData={{ config: proConfig, result: proResult }}
        onShowToast={addToast}
      />

      {/* Project Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        lang={lang}
        activeTab={activeTab}
        unifiedData={{ config: unifiedConfig, result: unifiedResult }}
        comfortData={{ config: comfortConfig, result: comfortResult }}
        proData={{ config: proConfig, result: proResult }}
      />

      {/* Industry Presets Modal */}
      <IndustryPresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleApplyPreset}
        activeTab={activeTab}
        lang={lang}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
