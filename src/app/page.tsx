'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { ActiveTab, Language, Theme, UnifiedTag, UnifiedConfig, ComfortTag, ComfortConfig, ProfessionalTag, ProfessionalConfig, ToastMessage, MasterLoggingTag } from '../lib/types';
import { calculateUnified } from '../lib/calculator/unifiedEngine';
import { calculateComfort } from '../lib/calculator/comfortEngine';
import { calculateProfessional } from '../lib/calculator/professionalEngine';
import {
  adaptMasterTagToUnified,
  adaptMasterTagToComfort,
  adaptMasterTagToProfessional,
  adaptUnifiedToMasterTag,
  adaptComfortToMasterTag,
  adaptProfessionalToMasterTag,
} from '../lib/calculator/smoothingEngine';
import { translations } from '../lib/i18n';
import { Header } from '../components/Header';
import { NavigationTabs } from '../components/NavigationTabs';
import { UnifiedTab } from '../components/tabs/UnifiedTab';
import { ComfortTab } from '../components/tabs/ComfortTab';
import { ProfessionalTab } from '../components/tabs/ProfessionalTab';
import { MasterTagsTab } from '../components/tabs/MasterTagsTab';
import { SeoFaqSection } from '../components/SeoFaqSection';
import { IndustryPreset } from '../lib/presets';
import { Toast } from '../components/Toast';

const TiaCheatSheetModal = dynamic(
  () => import('../components/TiaCheatSheetModal').then((m) => m.TiaCheatSheetModal),
  { ssr: false }
);
const ReportModal = dynamic(
  () => import('../components/ReportModal').then((m) => m.ReportModal),
  { ssr: false }
);
const IndustryPresetsModal = dynamic(
  () => import('../components/IndustryPresetsModal').then((m) => m.IndustryPresetsModal),
  { ssr: false }
);

export default function Home() {
  const isLoadedRef = useRef(false);
  const [lang, setLangState] = useState<Language>('ru');
  const [theme, setTheme] = useState<Theme>('dark');
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTabState] = useState<ActiveTab>('unified');

  const [visitedTabs, setVisitedTabs] = useState<Record<ActiveTab, boolean>>({
    unified: true,
    comfort: false,
    professional: false,
    master_tags: false,
  });

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', l);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setVisitedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
    startTransition(() => {
      setActiveTabState(tab);
    });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const t = translations[lang];

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
    dataLogs: [
      { id: 'default_data_log', name: 'Trend_Logs', retentionDays: 30, segmentHours: 24, enabled: true },
    ],
    alarmLogs: [
      { id: 'alarms_log', name: 'Alarms_log', entriesPerDay: 50, retentionDays: 30, segmentHours: 24, enabled: true },
      { id: 'events_log', name: 'Events_log', entriesPerDay: 100, retentionDays: 30, segmentHours: 24, enabled: true },
    ],
    alarmTags: [
      { id: 'alm_1', name: 'M101_Trip_Overload', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 2, count: 4, alarmLogId: 'alarms_log' },
      { id: 'alm_2', name: 'Tank_Level_HighHigh', alarmClass: 'Alarm', triggerType: 'analog', eventsPerDay: 1, count: 2, alarmLogId: 'alarms_log' },
      { id: 'alm_3', name: 'Emergency_Stop_Pushed', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 0.5, count: 2, alarmLogId: 'alarms_log' },
      { id: 'alm_4', name: 'Operator_Setpoint_Change', alarmClass: 'Event', triggerType: 'digital', eventsPerDay: 20, count: 5, alarmLogId: 'events_log' },
      { id: 'alm_5', name: 'Pump_Start_Stop_Event', alarmClass: 'Event', triggerType: 'digital', eventsPerDay: 30, count: 4, alarmLogId: 'events_log' },
      { id: 'alm_6', name: 'System_Warning_Battery', alarmClass: 'Warning', triggerType: 'digital', eventsPerDay: 1, count: 1, alarmLogId: 'events_log' },
    ],
    includeAlarms: true,
    alarmsPerDay: 650,
    includeAudit: false,
    auditEntriesPerDay: 200,
    storageMedium: 'sd_12g',
    storageSizeGb: 12,
  });

  // 2. Comfort State
  const [comfortTags, setComfortTags] = useState<ComfortTag[]>([
    { id: '1', description: 'Zone Pressures (1s)', mode: 'cyclic', cycleSec: 1, count: 20, dataType: 'Real', dataLogId: 'default_data_log' },
    { id: '2', description: 'Pump Status (2s)', mode: 'cyclic', cycleSec: 2, count: 40, dataType: 'Int', dataLogId: 'default_data_log' },
    { id: '3', description: 'Total Flow Counters (10s)', mode: 'cyclic', cycleSec: 10, count: 30, dataType: 'DInt', dataLogId: 'default_data_log' },
  ]);

  const [comfortConfig, setComfortConfig] = useState<ComfortConfig>({
    deviceType: 'comfort_panel',
    format: 'rdb',
    retentionDays: 30,
    recordsPerLog: 50000,
    logMethod: 'segmented',
    storageMediumMb: 2048,
    storageMedium: 'sd_2g',
    storageSizeGb: 2,
    dataLogs: [
      { id: 'default_data_log', name: 'Data_Log_1', retentionDays: 30, recordsPerLog: 50000, enabled: true },
    ],
    alarmLogs: [
      { id: 'alarms_log', name: 'Alarms_log', entriesPerDay: 50, retentionDays: 30, recordsPerLog: 20000, enabled: true },
      { id: 'events_log', name: 'Events_log', entriesPerDay: 100, retentionDays: 30, recordsPerLog: 20000, enabled: true },
    ],
    includeAudit: false,
    auditEntriesPerDay: 200,
    alarmTags: [
      { id: 'alm_1', name: 'M101_Trip_Overload', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 2, count: 4, alarmLogId: 'alarms_log' },
      { id: 'alm_2', name: 'Tank_Level_HighHigh', alarmClass: 'Alarm', triggerType: 'analog', eventsPerDay: 1, count: 2, alarmLogId: 'alarms_log' },
      { id: 'alm_3', name: 'Emergency_Stop_Pushed', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 0.5, count: 2, alarmLogId: 'alarms_log' },
      { id: 'alm_4', name: 'Operator_Setpoint_Change', alarmClass: 'Event', triggerType: 'digital', eventsPerDay: 20, count: 5, alarmLogId: 'events_log' },
      { id: 'alm_5', name: 'Pump_Start_Stop_Event', alarmClass: 'Event', triggerType: 'digital', eventsPerDay: 30, count: 4, alarmLogId: 'events_log' },
      { id: 'alm_6', name: 'System_Warning_Battery', alarmClass: 'Warning', triggerType: 'digital', eventsPerDay: 1, count: 1, alarmLogId: 'events_log' },
    ],
  });

  // 3. Professional State
  const [proTags, setProTags] = useState<ProfessionalTag[]>([
    { id: '1', description: 'Turbine_Vibration_RPM', cycleSec: 0.5, count: 40, archiveType: 'fast', dataType: 'Real' },
    { id: '2', description: 'Boiler_Feed_Pressure', cycleSec: 2, count: 180, archiveType: 'fast', dataType: 'Real' },
    { id: '3', description: 'Hourly_Environmental_Avg', cycleSec: 60, count: 120, archiveType: 'slow', dataType: 'Real' },
  ]);

  const [proConfig, setProConfig] = useState<ProfessionalConfig>({
    sqlEdition: 'express',
    retentionDays: 90,
    segmentPeriod: 'month',
    includeAlarmLogging: true,
    alarmsPerHour: 150,
    includeAudit: false,
    auditEntriesPerDay: 200,
    databaseHeadroomPct: 25,
    storageDiskType: 'nvme_ssd',
    diskCapacityGb: 512,
    archivePath: 'C:\\WinCC_Project',
    alarmTags: [
      { id: 'pro_alm_1', name: 'Turbine_Overheat_Trip', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 5, count: 4 },
      { id: 'pro_alm_2', name: 'Boiler_Pressure_HiHi', alarmClass: 'Alarm', triggerType: 'analog', eventsPerDay: 2, count: 2 },
      { id: 'pro_alm_3', name: 'Operator_Setpoint_Change', alarmClass: 'Event', triggerType: 'digital', eventsPerDay: 25, count: 5 },
      { id: 'pro_alm_4', name: 'Bearing_Temp_Warning', alarmClass: 'Warning', triggerType: 'analog', eventsPerDay: 10, count: 8 },
    ],
  });

  // 4. Master Tags State (TIA Portal V14–V21+ Inspector Hub)
  const [masterTags, setMasterTags] = useState<MasterLoggingTag[]>([
    {
      id: 'mt_1',
      name: 'BearingDE',
      processTag: 'PLC1_BearingDE_AI_DB_ai.status.scaledValue',
      description: 'Drive-End Bearing Temp',
      dataType: 'Real',
      loggingMode: 'cyclic',
      cycleSec: 1,
      cycleFactor: 1,
      limitScope: 'no_limits',
      smoothingMode: 'no_smoothing',
      compressionMode: 'no_compression',
      count: 1,
      targetLogName: 'Trend_Logs',
    },
    {
      id: 'mt_2',
      name: 'BearingNDE',
      processTag: 'PLC1_BearingNDE_AI_DB_ai.status.scaledValue',
      description: 'Non-Drive-End Bearing Temp',
      dataType: 'Real',
      loggingMode: 'cyclic',
      cycleSec: 1,
      cycleFactor: 1,
      limitScope: 'no_limits',
      smoothingMode: 'no_smoothing',
      compressionMode: 'no_compression',
      count: 1,
      targetLogName: 'Trend_Logs',
    },
    {
      id: 'mt_3',
      name: 'Current',
      processTag: 'PLC1_Current_AI_DB_ai.status.scaledValue',
      description: 'Motor Stator Current (0-500A)',
      dataType: 'Real',
      loggingMode: 'cyclic',
      cycleSec: 1,
      cycleFactor: 1,
      limitScope: 'no_limits',
      smoothingMode: 'no_smoothing',
      compressionMode: 'no_compression',
      count: 1,
      targetLogName: 'Trend_Logs',
    },
    {
      id: 'mt_4',
      name: 'Frequency',
      processTag: 'PLC1_Frequency_AI_DB_ai.status.scaledValue',
      description: 'VFD Output Frequency (0-50Hz)',
      dataType: 'Real',
      loggingMode: 'cyclic',
      cycleSec: 1,
      cycleFactor: 1,
      limitScope: 'no_limits',
      smoothingMode: 'no_smoothing',
      compressionMode: 'no_compression',
      count: 1,
      targetLogName: 'Trend_Logs',
    },
    {
      id: 'mt_5',
      name: 'MainBearing1',
      processTag: 'PLC1_MainBearing1_AI_DB_ai.status.scaledValue',
      description: 'Primary Thrust Bearing Temp',
      dataType: 'Real',
      loggingMode: 'cyclic',
      cycleSec: 1,
      cycleFactor: 1,
      limitScope: 'greater_or_equal',
      highLimit: 85,
      useTagLimits: true,
      smoothingMode: 'value',
      smoothingDelta: 0.5,
      count: 1,
      targetLogName: 'Trend_Logs',
    },
    {
      id: 'mt_6',
      name: 'MotorWindingsU1',
      processTag: 'PLC1_MotorWindingsU1_AI_DB_ai.status.scaledValue',
      description: 'Motor Winding Phase U1',
      dataType: 'Real',
      loggingMode: 'cyclic',
      cycleSec: 2,
      cycleFactor: 1,
      limitScope: 'no_limits',
      smoothingMode: 'value',
      smoothingDelta: 1.0,
      count: 6,
      targetLogName: 'Trend_Logs',
    },
    {
      id: 'mt_7',
      name: 'moisture',
      processTag: 'PLC1_OWEN_PVE110-RS_DB_owen.status.moisture:moisture',
      description: 'Chamber Relative Moisture',
      dataType: 'Real',
      loggingMode: 'onchange',
      cycleSec: 10,
      cycleFactor: 1,
      limitScope: 'no_limits',
      smoothingMode: 'value',
      smoothingDelta: 0.5,
      maxTimeSec: 600,
      minTimeSec: 2,
      count: 1,
      targetLogName: 'Trend_Logs',
    },
    {
      id: 'mt_8',
      name: 'temperature',
      processTag: 'PLC1_OWEN_PVE110-RS_DB_owen.status.temperature:temperature',
      description: 'Process Ambient Temperature',
      dataType: 'Real',
      loggingMode: 'onchange',
      cycleSec: 10,
      cycleFactor: 1,
      limitScope: 'no_limits',
      smoothingMode: 'value',
      smoothingDelta: 0.5,
      maxTimeSec: 600,
      minTimeSec: 2,
      count: 1,
      targetLogName: 'Trend_Logs',
    },
    {
      id: 'mt_9',
      name: 'Pressure',
      processTag: 'PLC1_Pressure_AI_DB_ai.status.scaledValue:Pressure',
      description: 'Discharge Pipeline Pressure',
      dataType: 'Real',
      loggingMode: 'ondemand',
      triggerMode: 'rising_edge',
      triggerTag: 'selMode',
      triggerBit: 0,
      cycleSec: 1,
      cycleFactor: 1,
      limitScope: 'no_limits',
      smoothingMode: 'no_smoothing',
      compressionMode: 'no_compression',
      count: 1,
      targetLogName: 'Trend_Logs',
    },
    {
      id: 'mt_10',
      name: 'VolumeAirFlow',
      processTag: 'PLC1_VolumeAirFlow_AI_DB_ai.status.scaledValue',
      description: 'Ventilation Air Flow Rate (m3/h)',
      dataType: 'Real',
      loggingMode: 'cyclic',
      cycleSec: 1,
      cycleFactor: 1,
      limitScope: 'no_limits',
      smoothingMode: 'swinging_door',
      smoothingDelta: 2.0,
      maxTimeSec: 300,
      count: 1,
      targetLogName: 'Trend_Logs',
    },
  ]);

  // Master Tag Sync Handlers
  const handlePushToUnified = useCallback((tags: MasterLoggingTag[], targetDataLogId?: string) => {
    const converted = tags.map((t) => adaptMasterTagToUnified(t, {
      targetDataLogId,
      dataLogs: unifiedConfig.dataLogs,
    }));
    setUnifiedTags(converted);
  }, [unifiedConfig.dataLogs]);

  const handlePushToComfort = useCallback((tags: MasterLoggingTag[], targetDataLogId?: string) => {
    const converted = tags.map((t) => adaptMasterTagToComfort(t, {
      targetDataLogId,
      dataLogs: comfortConfig.dataLogs,
    }).tag);
    setComfortTags(converted);
  }, [comfortConfig.dataLogs]);

  const handlePushToProfessional = useCallback((tags: MasterLoggingTag[]) => {
    const converted = tags.map((t) => adaptMasterTagToProfessional(t).tag);
    setProTags(converted);
  }, []);

  const handlePullFromRuntime = useCallback((runtime: 'unified' | 'comfort' | 'professional') => {
    let sourceTags: MasterLoggingTag[] = [];
    let runtimeLabel = '';

    if (runtime === 'unified') {
      runtimeLabel = 'WinCC Unified';
      sourceTags = unifiedTags.map((t, idx) => adaptUnifiedToMasterTag(t, idx, { dataLogs: unifiedConfig.dataLogs }));
    } else if (runtime === 'comfort') {
      runtimeLabel = 'WinCC Comfort';
      sourceTags = comfortTags.map((t, idx) => adaptComfortToMasterTag(t, idx, { dataLogs: comfortConfig.dataLogs }));
    } else if (runtime === 'professional') {
      runtimeLabel = 'WinCC Professional';
      sourceTags = proTags.map(adaptProfessionalToMasterTag);
    }

    if (sourceTags.length > 0) {
      setMasterTags(sourceTags);
      const msg = lang === 'ru'
        ? `Загружено ${sourceTags.length} тегов из ${runtimeLabel}`
        : `Successfully pulled ${sourceTags.length} tags from ${runtimeLabel}`;
      addToast(msg, 'success');
    } else {
      const msg = lang === 'ru'
        ? `Во вкладке ${runtimeLabel} нет настроенных тегов для загрузки`
        : `No tags configured in ${runtimeLabel} to pull`;
      addToast(msg, 'warning');
    }
  }, [unifiedTags, comfortTags, proTags, unifiedConfig.dataLogs, comfortConfig.dataLogs, addToast, lang]);

  // Load from LocalStorage & URL parameters on client mount
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('wincc_theme') as Theme;
        if (savedTheme) {
          setTheme(savedTheme);
          document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        } else {
          document.documentElement.classList.add('dark');
        }

        // Sync language from URL parameter or localStorage
        const params = new URLSearchParams(window.location.search);
        const urlLang = params.get('lang') as Language;
        if (urlLang === 'ru' || urlLang === 'en') {
          setLangState(urlLang);
        } else {
          const savedLang = localStorage.getItem('wincc_lang') as Language;
          if (savedLang === 'ru' || savedLang === 'en') {
            setLangState(savedLang);
          }
        }

        // Sync tab from URL parameter
        const urlTab = params.get('tab') as ActiveTab;
        if (urlTab === 'unified' || urlTab === 'comfort' || urlTab === 'professional' || urlTab === 'master_tags') {
          setActiveTabState(urlTab);
          setVisitedTabs((prev) => (prev[urlTab] ? prev : { ...prev, [urlTab]: true }));
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
          if (Array.isArray(parsed.masterTags)) setMasterTags(parsed.masterTags);
        }
      }
    } catch (e) {
      console.error('LocalStorage load error:', e);
    } finally {
      isLoadedRef.current = true;
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!isLoadedRef.current) return;
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
        masterTags,
      };
      localStorage.setItem('wincc_project_data', JSON.stringify(payload));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }, [lang, theme, unifiedTags, unifiedConfig, comfortTags, comfortConfig, proTags, proConfig, masterTags]);

  // Export Project JSON
  const handleExportJson = () => {
    const payload = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      unified: { tags: unifiedTags, config: unifiedConfig },
      comfort: { tags: comfortTags, config: comfortConfig },
      professional: { tags: proTags, config: proConfig },
      masterTags,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wincc-log-architect-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(t.toastExportSuccess, 'success');
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

          // Master tags
          const mTags = parsed.masterTags;
          if (Array.isArray(mTags)) {
            setMasterTags(mTags);
            loaded = true;
          }

          if (loaded) {
            addToast(t.toastImportSuccess, 'success');
          } else {
            addToast(t.toastImportError, 'error');
          }
        } catch {
          addToast(t.toastImportError, 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleApplyPreset = (preset: IndustryPreset) => {
    setVisitedTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
    if (activeTab === 'unified') {
      setUnifiedTags(preset.unifiedTags.map((t, i) => ({ ...t, id: `${preset.id}_${i + 1}` })));
    } else if (activeTab === 'comfort') {
      setComfortTags(preset.comfortTags.map((t, i) => ({ ...t, id: `${preset.id}_${i + 1}` })));
    } else {
      setProTags(preset.proTags.map((t, i) => ({ ...t, id: `${preset.id}_${i + 1}` })));
    }
    addToast(t.presetAppliedToast, 'success');
  };

  // Calculations with active language for localized warnings (memoized to eliminate redundant recalculation)
  const unifiedResult = useMemo(
    () => calculateUnified(unifiedTags, unifiedConfig, lang),
    [unifiedTags, unifiedConfig, lang]
  );
  const comfortResult = useMemo(
    () => calculateComfort(comfortTags, comfortConfig, lang),
    [comfortTags, comfortConfig, lang]
  );
  const proResult = useMemo(
    () => calculateProfessional(proTags, proConfig, lang),
    [proTags, proConfig, lang]
  );

  const navWarnings = useMemo(
    () => ({
      unified: unifiedResult.warnings.length > 0,
      comfort: comfortResult.warnings.length > 0,
      professional: proResult.warnings.length > 0,
    }),
    [unifiedResult.warnings.length, comfortResult.warnings.length, proResult.warnings.length]
  );

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
      <main className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">
        {/* Navigation Tabs with Warnings Indicator */}
        <NavigationTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lang={lang}
          warnings={navWarnings}
        />

        {/* Tab Panels with Keep-Alive Lazy Mounting */}
        <div className="tab-panels-container relative">
          {visitedTabs.unified && (
            <div
              role="tabpanel"
              id="tabpanel-unified"
              aria-labelledby="tab-unified"
              className={activeTab === 'unified' ? 'block' : 'hidden'}
            >
              <UnifiedTab
                tags={unifiedTags}
                setTags={setUnifiedTags}
                config={unifiedConfig}
                setConfig={setUnifiedConfig}
                result={unifiedResult}
                lang={lang}
                onShowToast={addToast}
              />
            </div>
          )}

          {visitedTabs.comfort && (
            <div
              role="tabpanel"
              id="tabpanel-comfort"
              aria-labelledby="tab-comfort"
              className={activeTab === 'comfort' ? 'block' : 'hidden'}
            >
              <ComfortTab
                tags={comfortTags}
                setTags={setComfortTags}
                config={comfortConfig}
                setConfig={setComfortConfig}
                result={comfortResult}
                lang={lang}
                onShowToast={addToast}
              />
            </div>
          )}

          {visitedTabs.professional && (
            <div
              role="tabpanel"
              id="tabpanel-professional"
              aria-labelledby="tab-professional"
              className={activeTab === 'professional' ? 'block' : 'hidden'}
            >
              <ProfessionalTab
                tags={proTags}
                setTags={setProTags}
                config={proConfig}
                setConfig={setProConfig}
                result={proResult}
                lang={lang}
                onShowToast={addToast}
              />
            </div>
          )}

          {visitedTabs.master_tags && (
            <div
              role="tabpanel"
              id="tabpanel-master_tags"
              aria-labelledby="tab-master_tags"
              className={activeTab === 'master_tags' ? 'block' : 'hidden'}
            >
              <MasterTagsTab
                masterTags={masterTags}
                setMasterTags={setMasterTags}
                onPushToUnified={handlePushToUnified}
                onPushToComfort={handlePushToComfort}
                onPushToProfessional={handlePushToProfessional}
                onPullFromRuntime={handlePullFromRuntime}
                unifiedTagsCount={unifiedTags.length}
                comfortTagsCount={comfortTags.length}
                proTagsCount={proTags.length}
                unifiedDataLogs={unifiedConfig.dataLogs}
                comfortDataLogs={comfortConfig.dataLogs}
                lang={lang}
                addToast={addToast}
              />
            </div>
          )}
        </div>

        {/* SEO Technical Guide & FAQ Section (Subtree Isolated) */}
        <SeoFaqSection lang={lang} />
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
