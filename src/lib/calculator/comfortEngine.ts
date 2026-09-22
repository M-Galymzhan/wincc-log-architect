import { 
  ComfortTag, ComfortConfig, ComfortResult, Language, 
  CalculatedComfortLogItem, Isa18AlarmAssessment, ComfortAlarmLogConfig
} from '../types';
import { calculateComfortNetwork } from './networkEngine';
import { getMediumPeCycles } from './unifiedEngine';

export function calculateComfort(
  tags: ComfortTag[],
  config: ComfortConfig,
  lang: Language = 'ru'
): ComfortResult {
  const retentionDays = Math.max(1, Math.floor(config.retentionDays || 30));
  const globalRecordsPerLog = Math.max(1000, Math.floor(config.recordsPerLog || 50000));
  const globalFormat = config.format || 'rdb';
  const globalLogMethod = config.logMethod || 'segmented';

  // Determine storage capacity in MB
  const storageCapMb = config.storageSizeGb
    ? config.storageSizeGb * 1024
    : Math.max(64, config.storageMediumMb || 2048);
  const storageCapGb = storageCapMb / 1024;

  // 1. Setup Data Logs
  const dataLogConfigs = config.dataLogs && config.dataLogs.length > 0
    ? config.dataLogs
    : [{ id: 'default_data_log', name: 'Data_Log_1', recordsPerLog: globalRecordsPerLog, logMethod: globalLogMethod, format: globalFormat, enabled: true }];

  // 2. Setup Alarm Logs
  const alarmLogConfigs: ComfortAlarmLogConfig[] = (config.alarmLogs && config.alarmLogs.length > 0)
    ? config.alarmLogs
    : (config.includeAlarms && (config.alarmsPerDay || 0) > 0)
      ? [{ id: 'alarms_log', name: 'Alarms_log', entriesPerDay: config.alarmsPerDay || 0, recordsPerLog: 20000, logMethod: 'segmented', format: globalFormat, enabled: true }]
      : [];

  const logItems: CalculatedComfortLogItem[] = [];
  let totalRatePerSec = 0;
  let totalTagsCount = 0;

  const defaultPath = config.deviceType === 'comfort_panel' ? '\\Storage Card SD\\Logs' : 'C:\\Logs';

  // 3. Process Data Logs
  dataLogConfigs.forEach((dl, index) => {
    const assignedTags = tags.filter((tItem) => {
      if (dataLogConfigs.length === 1) return true;
      if (tItem.dataLogId) return tItem.dataLogId === dl.id;
      return index === 0;
    });

    const isEnabled = dl.enabled !== false;
    let dlRatePerSec = 0;
    let dlTagCount = 0;

    if (isEnabled) {
      assignedTags.forEach((tag) => {
        const count = Math.max(0, Math.floor(tag.count || 0));
        if (count === 0) return;

        let rate = 1 / 60; // default on change: ~1 record per minute
        if (tag.mode === 'cyclic') {
          const cycle = Math.max(0.01, tag.cycleSec || 1);
          rate = 1 / cycle;
        }
        dlRatePerSec += rate * count;
        dlTagCount += count;
      });
    }

    const dlEntriesPerDay = Math.round(dlRatePerSec * 86400);
    const dlRetentionDays = Math.max(1, Math.floor(dl.retentionDays || retentionDays));
    const dlTotalRecords = Math.round(dlEntriesPerDay * dlRetentionDays);
    const dlFormat = dl.format || globalFormat;
    const dlBytesPerRecord = dlFormat === 'rdb' ? 32 : 65;
    const dlRecordsPerLog = Math.max(1000, Math.min(500000, Math.floor(dl.recordsPerLog || globalRecordsPerLog)));
    const dlMethod = dl.logMethod || globalLogMethod;

    const dlRecommendedFiles = isEnabled && dlTotalRecords > 0
      ? (dlMethod === 'circular' ? 1 : Math.max(1, Math.ceil(dlTotalRecords / dlRecordsPerLog)))
      : 0;

    const dlSingleFileSizeMb = isEnabled && dlTotalRecords > 0
      ? (Math.min(dlTotalRecords, dlRecordsPerLog) * dlBytesPerRecord) / (1024 * 1024)
      : 0;

    const dlTotalLogMb = isEnabled && dlTotalRecords > 0
      ? (dlMethod === 'circular'
          ? dlSingleFileSizeMb
          : (dlTotalRecords * dlBytesPerRecord) / (1024 * 1024))
      : 0;

    logItems.push({
      id: dl.id,
      name: dl.name,
      category: 'data',
      categoryNameRu: 'Журнал значений (Data Log)',
      categoryNameEn: 'Process Value Archive',
      format: dlFormat,
      logMethod: dlMethod,
      entriesPerDay: dlEntriesPerDay,
      retentionDays: dlRetentionDays,
      recordsPerLog: dlRecordsPerLog,
      recommendedLogFiles: dlRecommendedFiles,
      fileSizeMb: dlSingleFileSizeMb,
      totalLogMb: dlTotalLogMb,
      totalLogGb: dlTotalLogMb / 1024,
      storageOccupancyPct: (dlTotalLogMb / storageCapMb) * 100,
      path: defaultPath,
      enabled: isEnabled,
    });

    if (isEnabled) {
      totalRatePerSec += dlRatePerSec;
      totalTagsCount += dlTagCount;
    }
  });

  // 4. Process Alarm Logs
  const alarmTags = config.alarmTags || [];
  alarmLogConfigs.forEach((al) => {
    const isEnabled = al.enabled !== false;
    let alEntriesPerDay = al.entriesPerDay || 0;

    // If alarmTags exist and are mapped to this alarm log, sum their entries
    const mappedAlarmTags = alarmTags.filter(at => at.alarmLogId === al.id);
    if (mappedAlarmTags.length > 0) {
      const tagDerived = mappedAlarmTags.reduce((acc, cur) => acc + (cur.eventsPerDay * (cur.count || 1)), 0);
      if (tagDerived > 0) alEntriesPerDay = tagDerived;
    }

    const alRatePerSec = alEntriesPerDay / 86400;
    const alRetentionDays = Math.max(1, Math.floor(al.retentionDays || retentionDays));
    const alTotalRecords = Math.round(alEntriesPerDay * alRetentionDays);
    const alFormat = al.format || globalFormat;
    const alBytesPerRecord = alFormat === 'rdb' ? 32 : 65;
    const alRecordsPerLog = Math.max(1000, Math.min(500000, Math.floor(al.recordsPerLog || 20000)));
    const alMethod = al.logMethod || 'segmented';

    const alRecommendedFiles = isEnabled && alTotalRecords > 0
      ? (alMethod === 'circular' ? 1 : Math.max(1, Math.ceil(alTotalRecords / alRecordsPerLog)))
      : 0;

    const alSingleFileSizeMb = isEnabled && alTotalRecords > 0
      ? (Math.min(alTotalRecords, alRecordsPerLog) * alBytesPerRecord) / (1024 * 1024)
      : 0;

    const alTotalLogMb = isEnabled && alTotalRecords > 0
      ? (alMethod === 'circular'
          ? alSingleFileSizeMb
          : (alTotalRecords * alBytesPerRecord) / (1024 * 1024))
      : 0;

    logItems.push({
      id: al.id,
      name: al.name,
      category: 'alarm',
      categoryNameRu: 'Аварийный журнал (Alarm Log)',
      categoryNameEn: 'Alarm & Event Archive',
      format: alFormat,
      logMethod: alMethod,
      entriesPerDay: alEntriesPerDay,
      retentionDays: alRetentionDays,
      recordsPerLog: alRecordsPerLog,
      recommendedLogFiles: alRecommendedFiles,
      fileSizeMb: alSingleFileSizeMb,
      totalLogMb: alTotalLogMb,
      totalLogGb: alTotalLogMb / 1024,
      storageOccupancyPct: (alTotalLogMb / storageCapMb) * 100,
      path: defaultPath,
      enabled: isEnabled,
    });

    if (isEnabled) {
      totalRatePerSec += alRatePerSec;
    }
  });

  // 4b. Process Audit Trail (if enabled)
  if (config.includeAudit && (config.auditEntriesPerDay || 0) > 0) {
    const auditEntriesPerDay = Math.max(0, Math.floor(config.auditEntriesPerDay || 0));
    const auditRetentionDays = retentionDays;
    const auditTotalRecords = Math.round(auditEntriesPerDay * auditRetentionDays);
    const auditFormat = globalFormat;
    // Audit records contain user, action, value change, timestamp, and crypto hash (~250 bytes)
    const auditBytesPerRecord = 250;
    const auditRecordsPerLog = Math.max(1000, Math.min(500000, globalRecordsPerLog));
    const auditMethod = globalLogMethod;

    const auditRecommendedFiles = auditTotalRecords > 0
      ? (auditMethod === 'circular' ? 1 : Math.max(1, Math.ceil(auditTotalRecords / auditRecordsPerLog)))
      : 0;

    const auditSingleFileSizeMb = auditTotalRecords > 0
      ? (Math.min(auditTotalRecords, auditRecordsPerLog) * auditBytesPerRecord) / (1024 * 1024)
      : 0;

    const auditTotalLogMb = auditTotalRecords > 0
      ? (auditMethod === 'circular'
          ? auditSingleFileSizeMb
          : (auditTotalRecords * auditBytesPerRecord) / (1024 * 1024))
      : 0;

    logItems.push({
      id: 'audit_trail',
      name: 'Audit_Trail',
      category: 'audit',
      categoryNameRu: 'Электронный аудит (Audit Trail)',
      categoryNameEn: 'Electronic Audit Trail',
      format: auditFormat,
      logMethod: auditMethod,
      entriesPerDay: auditEntriesPerDay,
      retentionDays: auditRetentionDays,
      recordsPerLog: auditRecordsPerLog,
      recommendedLogFiles: auditRecommendedFiles,
      fileSizeMb: auditSingleFileSizeMb,
      totalLogMb: auditTotalLogMb,
      totalLogGb: auditTotalLogMb / 1024,
      storageOccupancyPct: (auditTotalLogMb / storageCapMb) * 100,
      path: defaultPath,
      enabled: true,
    });

    totalRatePerSec += auditEntriesPerDay / 86400;
  }

  // 5. Total Metrics
  const activeLogItems = logItems.filter((i) => i.enabled && i.totalLogMb > 0);
  const totalStorageUsedMb = activeLogItems.reduce((acc, item) => acc + item.totalLogMb, 0);
  const totalStorageUsedGb = totalStorageUsedMb / 1024;
  const storageOccupancyPct = (totalStorageUsedMb / storageCapMb) * 100;

  const recordsPerDay = Math.round(totalRatePerSec * 86400);
  const totalRecordsForPeriod = Math.round(recordsPerDay * retentionDays);

  const maxFilesLog = activeLogItems.length > 0
    ? activeLogItems.reduce((max, cur) => cur.recommendedLogFiles > max.recommendedLogFiles ? cur : max, activeLogItems[0])
    : logItems[0];
  const recommendedLogFiles = maxFilesLog ? maxFilesLog.recommendedLogFiles : 0;
  const fileSizeMb = maxFilesLog ? maxFilesLog.fileSizeMb : 0;

  // 6. Flash Wear & Endurance
  // Daily writes with FAT32 amplification factor (~2.0x for directory updates on Windows CE)
  const totalDailyRecords = activeLogItems.reduce((acc, item) => acc + item.entriesPerDay, 0);
  const dailyWrittenMb = activeLogItems.reduce((acc, item) => {
    const bytesPerRec = item.category === 'audit' ? 250 : (item.format === 'rdb' ? 32 : 65);
    return acc + (item.entriesPerDay * bytesPerRec) / (1024 * 1024);
  }, 0);
  const dailyWrittenGb = (dailyWrittenMb * 2.0) / 1024;

  const mediumKey = config.storageMedium || (storageCapGb <= 0.5 ? 'sd_512m' : storageCapGb <= 2 ? 'sd_2g' : storageCapGb <= 4 ? 'sd_4g' : storageCapGb <= 12 ? 'sd_12g' : 'sd_32g');
  const { peCycles, maxYears } = getMediumPeCycles(mediumKey, config.nandClass);
  const totalCardTbwGb = storageCapGb * peCycles;
  const totalCardTbwTb = totalCardTbwGb / 1024;
  const peCyclesUsed = totalCardTbwGb > 0 ? (dailyWrittenGb * 365 * 10) / totalCardTbwGb : 0;

  const isOverflow = storageOccupancyPct > 100;
  const isPcRt = config.deviceType === 'rt_advanced';
  const hasZeroWrites = dailyWrittenGb <= 0 || totalDailyRecords === 0;

  let flashLifeApplicable = true;
  let flashLifeReason: 'overflow' | 'pc_rt' | 'zero_writes' | 'ok' = 'ok';

  if (isPcRt) {
    flashLifeApplicable = false;
    flashLifeReason = 'pc_rt';
  } else if (isOverflow) {
    flashLifeApplicable = false;
    flashLifeReason = 'overflow';
  } else if (hasZeroWrites) {
    flashLifeApplicable = false;
    flashLifeReason = 'zero_writes';
  }

  const estimatedFlashLifeYears = flashLifeApplicable
    ? Math.min(maxYears, totalCardTbwGb / (dailyWrittenGb * 365))
    : maxYears;

  // 7. Traffic Status (Comfort Panel vs RT Advanced)
  let trafficStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (config.deviceType === 'comfort_panel') {
    if (totalRatePerSec > 50) trafficStatus = 'critical';
    else if (totalRatePerSec > 15) trafficStatus = 'warning';
  } else {
    if (totalRatePerSec > 250) trafficStatus = 'critical';
    else if (totalRatePerSec > 100) trafficStatus = 'warning';
  }

  // 8. ISA-18.2 Alarm Assessment
  let isa18AlarmAssessment: Isa18AlarmAssessment | undefined = undefined;
  const totalAlarmsPerDay = alarmLogConfigs
    .filter(al => al.enabled)
    .reduce((acc, al) => acc + (al.entriesPerDay || 0), 0);

  if (totalAlarmsPerDay > 0) {
    const alarmsPerHour = Number((totalAlarmsPerDay / 24).toFixed(1));
    let status: 'acceptable' | 'manageable' | 'demanding' | 'overload' = 'acceptable';
    let labelRu = 'Штатная нагрузка (Acceptable)';
    let labelEn = 'Very Likely Acceptable';
    let descRu = '< 6 алармов/час (менее 150 в сутки). Оператор не перегружен.';
    let descEn = '< 6 alarms/hour (< 150/day). Normal operator load.';

    if (alarmsPerHour > 30) {
      status = 'overload';
      labelRu = 'Аварийный шторм (Overload)';
      labelEn = 'Alarm Overload';
      descRu = '> 30 алармов/час (> 720 в сутки). Риск пропуска критических аварий!';
      descEn = '> 30 alarms/hour (> 720/day). Severe operator overload!';
    } else if (alarmsPerHour > 12) {
      status = 'demanding';
      labelRu = 'Высокая нагрузка (Demanding)';
      labelEn = 'Demanding';
      descRu = '12–30 алармов/час (300–720 в сутки). Требуется рационализация.';
      descEn = '12–30 alarms/hour (300–720/day). Rationalization required.';
    } else if (alarmsPerHour > 6) {
      status = 'manageable';
      labelRu = 'Умеренная нагрузка (Manageable)';
      labelEn = 'Manageable';
      descRu = '6–12 алармов/час (150–300 в сутки). Допустимо при нормальной работе.';
      descEn = '6–12 alarms/hour (150–300/day). Manageable during normal operation.';
    }

    isa18AlarmAssessment = {
      totalAlarmsPerDay,
      alarmsPerHour,
      status,
      labelRu,
      labelEn,
      descRu,
      descEn,
    };
  }

  // 9. Warnings & Siemens Hard Limits
  const warnings: string[] = [];

  // Check individual logs for 500k limit
  logItems.forEach((item) => {
    if (item.recordsPerLog > 500000) {
      warnings.push(
        lang === 'ru'
          ? `Архив «${item.name}»: превышен жесткий лимит Siemens (макс. 500 000 записей на один файл).`
          : `Log "${item.name}": exceeded Siemens limit (max 500,000 records per file).`
      );
    }
  });

  // Sequence of files limit (100 for Comfort Panel, 400 for RT Advanced)
  const maxFiles = Math.max(0, ...logItems.map(l => l.recommendedLogFiles));
  if (config.deviceType === 'comfort_panel' && maxFiles > 100) {
    warnings.push(
      lang === 'ru'
        ? `Превышен системный лимит SIMATIC Comfort Panel: максимум 100 файлов в цепочке (Sequence of log files). Рассчитано: ${maxFiles} файлов. Увеличьте лимит записей на файл (до 500 000) или сократите срок хранения.`
        : `Exceeded SIMATIC Comfort Panel limit: maximum 100 files in log sequence. Calculated: ${maxFiles} files. Increase records per file limit (up to 500,000) or reduce retention period.`
    );
  } else if (config.deviceType === 'rt_advanced' && maxFiles > 400) {
    warnings.push(
      lang === 'ru'
        ? `Превышен системный лимит WinCC Runtime Advanced: максимум 400 файлов в цепочке (Sequence of log files). Рассчитано: ${maxFiles} файлов.`
        : `Exceeded WinCC Runtime Advanced limit: maximum 400 files in log sequence. Calculated: ${maxFiles} files.`
    );
  }

  // Number of historical logs limit (50 on Comfort, 100 on RT Advanced)
  if (config.deviceType === 'comfort_panel' && logItems.length > 50) {
    warnings.push(
      lang === 'ru'
        ? `Превышен лимит Comfort Panel: максимум 50 архивов переменных и аварий. Сконфигурировано: ${logItems.length}.`
        : `Exceeded Comfort Panel limit: maximum 50 historical logs. Configured: ${logItems.length}.`
    );
  }

  // Windows CE FAT32 limit (max 32 GB)
  if (config.deviceType === 'comfort_panel' && storageCapMb > 32768) {
    warnings.push(
      lang === 'ru'
        ? 'Аппаратное ограничение Windows CE 6.0: Панели SIMATIC Comfort аппаратно поддерживают карты памяти объемом не более 32 ГБ (SDHC, FAT32). Накопители SDXC (> 32 ГБ) не поддерживаются контроллером слота.'
        : 'Windows CE 6.0 hardware limitation: SIMATIC Comfort Panels support memory cards up to 32 GB (SDHC, FAT32). SDXC media (> 32 GB) is not supported by the panel hardware controller.'
    );
  }

  // Windows CE rate limit
  if (config.deviceType === 'comfort_panel' && totalRatePerSec > 50) {
    warnings.push(
      lang === 'ru'
        ? 'Высокая нагрузка для Windows CE: более 50 записей/сек на панелях Comfort может приводить к зависанию визуализации. Рекомендуется увеличить циклы архивации.'
        : 'High load for Windows CE: over 50 entries/sec on Comfort Panels may cause screen freeze. Increasing logging cycles is recommended.'
    );
  }

  // CSV format write amplification
  if (logItems.some(l => l.format === 'csv') && totalRecordsForPeriod > 0) {
    warnings.push(
      lang === 'ru'
        ? 'Формат CSV занимает в 2 раза больше места, чем RDB, и создает повышенный износ SD-карты на FAT32. Для промышленных панелей рекомендуется бинарный RDB.'
        : 'CSV format consumes ~2x more disk space than RDB and induces higher write wear on FAT32. Binary RDB is recommended for production panels.'
    );
  }

  // Storage Overflow
  if (totalStorageUsedMb > storageCapMb && totalRecordsForPeriod > 0) {
    warnings.push(
      lang === 'ru'
        ? `Критично: Суммарный объем архивов (${totalStorageUsedMb > 1024 ? `${totalStorageUsedGb.toFixed(1)} GB` : `${totalStorageUsedMb.toFixed(0)} MB`}) превышает емкость накопителя (${storageCapMb > 1024 ? `${(storageCapMb / 1024).toFixed(1)} GB` : `${storageCapMb} MB`})! Выберите носитель большего объема.`
        : `Critical: Total archives size (${totalStorageUsedMb > 1024 ? `${totalStorageUsedGb.toFixed(1)} GB` : `${totalStorageUsedMb.toFixed(0)} MB`}) exceeds storage capacity (${storageCapMb > 1024 ? `${(storageCapMb / 1024).toFixed(1)} GB` : `${storageCapMb} MB`})! Select a higher capacity storage medium.`
    );
  } else if (storageOccupancyPct > 85) {
    warnings.push(
      lang === 'ru'
        ? `Архивы займут ${storageOccupancyPct.toFixed(0)}% емкости карты памяти. Рекомендуется носитель большего объема.`
        : `Archives will occupy ${storageOccupancyPct.toFixed(0)}% of memory card capacity. Select a higher capacity storage medium.`
    );
  }

  // Empty tags warning
  if (totalTagsCount === 0 && (!alarmLogConfigs.some(a => a.enabled && a.entriesPerDay > 0))) {
    warnings.push(
      lang === 'ru'
        ? 'Список тегов пуст. Добавьте теги или настройте аварийные архивы для расчета.'
        : 'Tag list is empty. Add logging tags or configure alarm logs to execute calculation.'
    );
  }

  return {
    totalTags: totalTagsCount,
    entriesPerSec: totalRatePerSec,
    recordsPerDay,
    totalRecordsForPeriod,
    recommendedLogFiles,
    fileSizeMb,
    totalArchiveSizeMb: totalStorageUsedMb,
    totalArchiveSizeGb: totalStorageUsedGb,
    storageOccupancyPct,
    trafficStatus,
    network: calculateComfortNetwork(tags),
    warnings,
    logItems,
    totalStorageUsedMb,
    totalStorageUsedGb,
    dailyWrittenGb,
    estimatedFlashLifeYears,
    flashLifeApplicable,
    flashLifeReason,
    totalCardTbwTb,
    peCyclesUsed,
    isa18AlarmAssessment,
  };
}
