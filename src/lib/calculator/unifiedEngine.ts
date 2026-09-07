import { UnifiedTag, UnifiedConfig, UnifiedResult, Language } from '../types';
import { calculateUnifiedNetwork } from './networkEngine';

export function getDataTypeBytes(dataType: UnifiedTag['dataType'] | undefined, baseBytes: number = 50): number {
  const scale = baseBytes / 50;
  switch (dataType) {
    case 'Bool':
      return Math.round(38 * scale);
    case 'Int':
      return Math.round(42 * scale);
    case 'DInt':
    case 'Real':
      return Math.round(50 * scale);
    case 'LReal':
      return Math.round(58 * scale);
    case 'String':
      return Math.round(85 * scale);
    default:
      return baseBytes;
  }
}

export function calculateUnified(
  tags: UnifiedTag[],
  config: UnifiedConfig,
  lang: Language = 'ru'
): UnifiedResult {
  // 1. Sanitize config inputs
  const retentionDays = Math.max(1, Math.floor(config.retentionDays || 1));
  const segmentHours = Math.max(1, Math.floor(config.segmentHours || 24));
  const perEntryBytes = Math.max(10, Math.floor(config.perEntryBytes || 50));
  const headroomPct = Math.max(0, config.headroomPct ?? 30);
  const factor = 1 + headroomPct / 100;
  const storageSizeGb = Math.max(0.1, config.storageSizeGb || 12);
  const storageCapMb = storageSizeGb * 1024;

  // 2. Data Logs Setup
  const dataLogConfigs = config.dataLogs && config.dataLogs.length > 0
    ? config.dataLogs
    : [{ id: 'default_data_log', name: 'Trend_Logs', enabled: true }];

  // 3. Alarm Logs Setup
  let alarmLogConfigs = config.alarmLogs;
  if (!alarmLogConfigs) {
    if (config.includeAlarms && (config.alarmsPerDay || 0) > 0) {
      alarmLogConfigs = [
        { id: 'alarms_log', name: 'Alarms_log', entriesPerDay: config.alarmsPerDay, enabled: true },
      ];
    } else {
      alarmLogConfigs = [];
    }
  }

  const logItems: import('../types').CalculatedLogItem[] = [];
  let totalRatePerSec = 0;
  let totalTagsCount = 0;
  let totalBytesPerDayAllLogs = 0;

  // 4. Calculate each Data Log
  dataLogConfigs.forEach((dl, index) => {
    // Determine tags assigned to this Data Log
    // If only one data log exists, all tags belong to it
    // Otherwise match tag.dataLogId === dl.id, or fallback unassigned tags to the first log
    const assignedTags = tags.filter((tItem) => {
      if (dataLogConfigs.length === 1) return true;
      if (tItem.dataLogId) return tItem.dataLogId === dl.id;
      return index === 0;
    });

    const isEnabled = dl.enabled !== false;
    let dlRatePerSec = 0;
    let dlTagCount = 0;
    let dlWeightedBytesPerSec = 0;

    if (isEnabled) {
      assignedTags.forEach((tag) => {
        const count = Math.max(0, Math.floor(tag.count || 0));
        if (count === 0) return;

        let rate = 0;
        if (tag.mode === 'cyclic') {
          const cycle = Math.max(0.01, tag.cycleSec || 1);
          rate = 1 / cycle;
        } else {
          rate = Math.max(0, tag.entriesPerSec || 0.0167);
        }

        const entryBytes = getDataTypeBytes(tag.dataType, perEntryBytes);
        dlRatePerSec += rate * count;
        dlTagCount += count;
        dlWeightedBytesPerSec += rate * count * entryBytes;
      });
    }

    const dlEntriesPerDay = Math.round(dlRatePerSec * 86400);
    const dlBytesPerDay = dlWeightedBytesPerSec * 86400;
    const dlRetentionDays = Math.max(1, Math.floor(dl.retentionDays || retentionDays));
    const dlSegmentHours = Math.max(1, Math.floor(dl.segmentHours || segmentHours));
    const dlSegmentsPerDay = 24 / dlSegmentHours;
    const dlBytesPerSegment = dlSegmentsPerDay > 0 ? (dlBytesPerDay / dlSegmentsPerDay) * factor : 0;
    const dlRawSegmentMb = dlBytesPerSegment / (1024 * 1024);

    let dlSqliteSegmentMb = 0;
    let dlTotalSegments = 0;
    let dlTotalLogMb = 0;

    if (dlEntriesPerDay > 0 && isEnabled) {
      dlSqliteSegmentMb = Math.max(4, Math.ceil(dlRawSegmentMb / 4) * 4);
      dlTotalSegments = Math.ceil((dlRetentionDays * 24) / dlSegmentHours);
      dlTotalLogMb = Math.max(200, dlSqliteSegmentMb * Math.max(3, dlTotalSegments));
    }

    const dlTotalLogGb = dlTotalLogMb / 1024;
    const dlOccupancyPct = (dlTotalLogMb / storageCapMb) * 100;

    logItems.push({
      id: dl.id,
      name: dl.name || `DataLog_${index + 1}`,
      category: 'data',
      categoryNameRu: 'Журнал данных (Data log)',
      categoryNameEn: 'Data log',
      tagCount: dlTagCount,
      entriesPerDay: dlEntriesPerDay,
      retentionDays: dlRetentionDays,
      segmentHours: dlSegmentHours,
      totalSegments: dlTotalSegments,
      rawSegmentMb: dlRawSegmentMb,
      sqliteSegmentMb: dlSqliteSegmentMb,
      totalLogMb: dlTotalLogMb,
      totalLogGb: dlTotalLogGb,
      storageOccupancyPct: dlOccupancyPct,
      enabled: isEnabled,
    });

    if (isEnabled) {
      totalRatePerSec += dlRatePerSec;
      totalTagsCount += dlTagCount;
      totalBytesPerDayAllLogs += dlBytesPerDay;
    }
  });

  // 5. Calculate each Alarm Log
  alarmLogConfigs.forEach((al, index) => {
    const isEnabled = al.enabled !== false;
    const alEntriesPerDay = isEnabled ? Math.max(0, Math.floor(al.entriesPerDay || 0)) : 0;
    // Average Siemens SQLite alarm entry size ~180 bytes (text, timestamps, state, values)
    const alBytesPerDay = alEntriesPerDay * 180;
    const alRetentionDays = Math.max(1, Math.floor(al.retentionDays || retentionDays));
    const alSegmentHours = Math.max(1, Math.floor(al.segmentHours || segmentHours));
    const alSegmentsPerDay = 24 / alSegmentHours;
    const alBytesPerSegment = alSegmentsPerDay > 0 ? (alBytesPerDay / alSegmentsPerDay) * factor : 0;
    const alRawSegmentMb = alBytesPerSegment / (1024 * 1024);

    let alSqliteSegmentMb = 0;
    let alTotalSegments = 0;
    let alTotalLogMb = 0;

    if (alEntriesPerDay > 0 && isEnabled) {
      alSqliteSegmentMb = Math.max(4, Math.ceil(alRawSegmentMb / 4) * 4);
      alTotalSegments = Math.ceil((alRetentionDays * 24) / alSegmentHours);
      alTotalLogMb = Math.max(200, alSqliteSegmentMb * Math.max(3, alTotalSegments));
    }

    const alTotalLogGb = alTotalLogMb / 1024;
    const alOccupancyPct = (alTotalLogMb / storageCapMb) * 100;

    logItems.push({
      id: al.id,
      name: al.name || `AlarmLog_${index + 1}`,
      category: 'alarm',
      categoryNameRu: 'Журнал тревог (Alarm log)',
      categoryNameEn: 'Alarm log',
      entriesPerDay: alEntriesPerDay,
      retentionDays: alRetentionDays,
      segmentHours: alSegmentHours,
      totalSegments: alTotalSegments,
      rawSegmentMb: alRawSegmentMb,
      sqliteSegmentMb: alSqliteSegmentMb,
      totalLogMb: alTotalLogMb,
      totalLogGb: alTotalLogGb,
      storageOccupancyPct: alOccupancyPct,
      enabled: isEnabled,
    });

    if (isEnabled) {
      totalRatePerSec += alEntriesPerDay / 86400;
      totalBytesPerDayAllLogs += alBytesPerDay;
    }
  });

  // 6. Audit Trail (if enabled)
  if (config.includeAudit) {
    const auditEntriesPerDay = Math.max(0, Math.floor(config.auditEntriesPerDay || 0));
    const auditBytesPerDay = auditEntriesPerDay * 250;
    const auditRetentionDays = retentionDays;
    const auditSegmentHours = segmentHours;
    const auditSegmentsPerDay = 24 / auditSegmentHours;
    const auditBytesPerSegment = auditSegmentsPerDay > 0 ? (auditBytesPerDay / auditSegmentsPerDay) * factor : 0;
    const auditRawSegmentMb = auditBytesPerSegment / (1024 * 1024);

    let auditSqliteSegmentMb = 0;
    let auditTotalSegments = 0;
    let auditTotalLogMb = 0;

    if (auditEntriesPerDay > 0) {
      auditSqliteSegmentMb = Math.max(4, Math.ceil(auditRawSegmentMb / 4) * 4);
      auditTotalSegments = Math.ceil((auditRetentionDays * 24) / auditSegmentHours);
      auditTotalLogMb = Math.max(200, auditSqliteSegmentMb * Math.max(3, auditTotalSegments));
    }

    logItems.push({
      id: 'audit_trail',
      name: 'Audit_Trail',
      category: 'audit',
      categoryNameRu: 'Электронный аудит (Audit Trail)',
      categoryNameEn: 'Audit Trail',
      entriesPerDay: auditEntriesPerDay,
      retentionDays: auditRetentionDays,
      segmentHours: auditSegmentHours,
      totalSegments: auditTotalSegments,
      rawSegmentMb: auditRawSegmentMb,
      sqliteSegmentMb: auditSqliteSegmentMb,
      totalLogMb: auditTotalLogMb,
      totalLogGb: auditTotalLogMb / 1024,
      storageOccupancyPct: (auditTotalLogMb / storageCapMb) * 100,
      enabled: true,
    });

    totalRatePerSec += auditEntriesPerDay / 86400;
    totalBytesPerDayAllLogs += auditBytesPerDay;
  }

  // 7. Summary Metrics
  const activeLogItems = logItems.filter((i) => i.enabled && i.totalLogMb > 0);
  const totalStorageUsedMb = activeLogItems.reduce((acc, item) => acc + item.totalLogMb, 0);
  const totalStorageUsedGb = totalStorageUsedMb / 1024;
  const storageOccupancyPct = Math.min(100, (totalStorageUsedMb / storageCapMb) * 100);

  const totalEntriesPerDay = Math.round(logItems.reduce((acc, item) => item.enabled ? acc + item.entriesPerDay : acc, 0));
  const totalEntriesPerSec = totalRatePerSec;

  // Primary Data Log values for backwards-compatible fields
  const primaryDataLog = logItems.find((i) => i.category === 'data') || logItems[0];
  const rawSegmentMb = primaryDataLog ? primaryDataLog.rawSegmentMb : 0;
  const sqliteSegmentMb = primaryDataLog ? primaryDataLog.sqliteSegmentMb : 0;
  const totalSegments = primaryDataLog ? primaryDataLog.totalSegments : 0;
  const totalLogMb = totalStorageUsedMb > 0 ? totalStorageUsedMb : (primaryDataLog ? primaryDataLog.totalLogMb : 0);
  const totalLogGb = totalLogMb / 1024;

  // Flash Wear & Lifespan estimation (TBW)
  // Standard SIMATIC SD card write endurance ~ 2,000 P/E cycles
  // Write amplification with SQLite WAL journaling ~ 1.5x
  const dailyWrittenGb = (totalBytesPerDayAllLogs * factor * 1.5) / (1024 * 1024 * 1024);
  const totalCardTbwGb = storageSizeGb * 2000;
  const estimatedFlashLifeYears = dailyWrittenGb > 0 ? Math.min(30, totalCardTbwGb / (dailyWrittenGb * 365)) : 30;

  // Traffic status (Siemens limit recommendations)
  let trafficStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (totalEntriesPerSec > 500) {
    trafficStatus = 'critical';
  } else if (totalEntriesPerSec > 300) {
    trafficStatus = 'warning';
  }

  // Rule of 3 segments (checked on data logs)
  const rule3SegmentsValid = totalEntriesPerDay === 0 || logItems.filter((i) => i.enabled && i.entriesPerDay > 0).every((i) => i.totalSegments >= 3);

  const warnings: string[] = [];

  if (trafficStatus === 'critical') {
    warnings.push(
      lang === 'ru'
        ? (config.deviceType === 'ucp'
            ? 'Критическая нагрузка: более 500 записей/сек. Панель Unified Comfort может терять данные. Рекомендуется увеличить цикл опроса или перейти на PC Runtime с MS SQL.'
            : 'Критическая нагрузка: более 500 записей/сек. База SQLite может работать с задержками. Настоятельно рекомендуется переключить тип базы на Microsoft SQL Server.')
        : (config.deviceType === 'ucp'
            ? 'Critical load: over 500 entries/sec. Unified Comfort Panel may lose data. Increase acquisition cycles or switch to PC Runtime with MS SQL.'
            : 'Critical load: over 500 entries/sec. SQLite engine may experience latency spikes. Upgrading to Microsoft SQL Server is strongly recommended.')
    );
  } else if (trafficStatus === 'warning') {
    warnings.push(
      lang === 'ru'
        ? 'Внимание: Высокая нагрузка (300–500 зап/сек). Следите за загрузкой процессора в Runtime.'
        : 'Warning: High load (300–500 entries/sec). Monitor Runtime CPU utilization.'
    );
  }

  if (totalEntriesPerDay > 0 && !rule3SegmentsValid) {
    warnings.push(
      lang === 'ru'
        ? 'Нарушено правило Siemens: период хранения должен содержать минимум 3 сегмента для надежной кольцевой ротации. Уменьшите время сегмента или увеличьте срок хранения.'
        : 'Violates Siemens rule: retention period must contain at least 3 segments for reliable ring buffer rotation. Reduce segment duration or extend retention period.'
    );
  }

  if (totalEntriesPerDay > 0 && totalStorageUsedMb > storageCapMb) {
    warnings.push(
      lang === 'ru'
        ? `Критично: Суммарный объем всех логов (${totalStorageUsedGb.toFixed(1)} GB) превышает полную емкость носителя (${storageSizeGb} GB)! Выберите носитель большего объема или сократите срок хранения.`
        : `Critical: Total logs size (${totalStorageUsedGb.toFixed(1)} GB) exceeds storage capacity (${storageSizeGb} GB)! Select a larger storage medium or reduce retention.`
    );
  } else if (storageOccupancyPct > 85) {
    warnings.push(
      lang === 'ru'
        ? `Внимание: Расчетные логи занимают ${storageOccupancyPct.toFixed(0)}% объема носителя. Рекомендуется использовать карту памяти большего объема.`
        : `Warning: Estimated logs occupy ${storageOccupancyPct.toFixed(0)}% of storage capacity. Consider using a larger memory card.`
    );
  }

  if (config.deviceType === 'ucp' && estimatedFlashLifeYears < 3 && totalEntriesPerDay > 0) {
    warnings.push(
      lang === 'ru'
        ? `Предупреждение по износу Flash: Расчетный ресурс SD-карты составляет ${estimatedFlashLifeYears.toFixed(1)} г. Рекомендуется архивация на сетевой диск (NAS / SMB).`
        : `Flash wear alert: Estimated SD card endurance is ${estimatedFlashLifeYears.toFixed(1)} years. Archiving to network share (NAS / SMB) is recommended.`
    );
  }

  if (totalTagsCount === 0 && totalEntriesPerDay === 0) {
    warnings.push(
      lang === 'ru'
        ? 'Список тегов пуст. Добавьте теги процесса или включите журнал тревог для получения актуального расчета.'
        : 'Tag list is empty. Add process logging tags or enable alarm logging to obtain calculation results.'
    );
  }

  return {
    totalTags: totalTagsCount,
    totalEntriesPerSec,
    entriesPerDay: totalEntriesPerDay,
    rawSegmentMb,
    sqliteSegmentMb,
    totalSegments,
    totalLogMb,
    totalLogGb,
    trafficStatus,
    rule3SegmentsValid,
    storageOccupancyPct,
    estimatedFlashLifeYears,
    network: calculateUnifiedNetwork(tags),
    warnings,
    logItems,
    totalStorageUsedMb,
    totalStorageUsedGb,
  };
}
