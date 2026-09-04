'use client';
import React, { useState, useEffect } from 'react';
import { ActiveTab, Language, Theme, UnifiedTag, UnifiedConfig, ComfortTag, ComfortConfig, ProfessionalTag, ProfessionalConfig } from '../lib/types';
import { calculateUnified } from '../lib/calculator/unifiedEngine';
import { calculateComfort } from '../lib/calculator/comfortEngine';
import { calculateProfessional } from '../lib/calculator/professionalEngine';
import { Header } from '../components/Header';
import { NavigationTabs } from '../components/NavigationTabs';
import { UnifiedTab } from '../components/tabs/UnifiedTab';
import { ComfortTab } from '../components/tabs/ComfortTab';
import { ProfessionalTab } from '../components/tabs/ProfessionalTab';
import { TiaCheatSheetModal } from '../components/TiaCheatSheetModal';
import { ReportModal } from '../components/ReportModal';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('ru');
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState<ActiveTab>('unified');

  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

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
      if (savedLang) setLang(savedLang);
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
        if (parsed.unifiedTags) setUnifiedTags(parsed.unifiedTags);
        if (parsed.unifiedConfig) setUnifiedConfig(parsed.unifiedConfig);
        if (parsed.comfortTags) setComfortTags(parsed.comfortTags);
        if (parsed.comfortConfig) setComfortConfig(parsed.comfortConfig);
        if (parsed.proTags) setProTags(parsed.proTags);
        if (parsed.proConfig) setProConfig(parsed.proConfig);
      }
    } catch (e) {
      console.error(e);
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
      console.error(e);
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
  };

  // Import Project JSON
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
          if (parsed.unified?.tags) setUnifiedTags(parsed.unified.tags);
          if (parsed.unified?.config) setUnifiedConfig(parsed.unified.config);
          if (parsed.comfort?.tags) setComfortTags(parsed.comfort.tags);
          if (parsed.comfort?.config) setComfortConfig(parsed.comfort.config);
          if (parsed.professional?.tags) setProTags(parsed.professional.tags);
          if (parsed.professional?.config) setProConfig(parsed.professional.config);
          alert('Проект успешно загружен!');
        } catch (err) {
          alert('Ошибка при чтении JSON файла конфигурации');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Calculations
  const unifiedResult = calculateUnified(unifiedTags, unifiedConfig);
  const comfortResult = calculateComfort(comfortTags, comfortConfig);
  const proResult = calculateProfessional(proTags, proConfig);

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
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 relative z-10">
        {/* Navigation Tabs */}
        <NavigationTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lang={lang}
        />

        {/* Tab 1: WinCC Unified */}
        {activeTab === 'unified' && (
          <UnifiedTab
            tags={unifiedTags}
            setTags={setUnifiedTags}
            config={unifiedConfig}
            setConfig={setUnifiedConfig}
            result={unifiedResult}
            lang={lang}
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
          />
        )}
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
    </div>
  );
}
