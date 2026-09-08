import { UnifiedTag, UnifiedConfig, UnifiedResult, Language, Isa18AlarmAssessment, NandClass } from '../types';
import { calculateUnifiedNetwork } from './networkEngine';

export function getMediumPeCycles(storageMedium: string, nandClass?: NandClass): { peCycles: number; maxYears: number } {
  // Siemens SIMATIC SD Cards (SLC NAND - 60 000 P/E cycles per Siemens SIOS / Swissbit)
  if (['sd_512m', 'sd_2g', 'sd_12g', 'sd_32g'].includes(storageMedium)) {
    return { peCycles: 60000, maxYears: 30 };
  }

  // Siemens Industrial USB (MLC/pSLC - 3 000 P/E cycles)
  if (storageMedium === 'usb_128g') {
    return { peCycles: 3000, maxYears: 30 };
  }

  // Custom User SD (Slot X52) or Custom User USB (Slot X61)
  if (storageMedium === 'sd_custom_x52' || storageMedium === 'usb_custom') {
    switch (nandClass) {
      case 'slc':
        return { peCycles: 60000, maxYears: 30 };
      case 'pslc':
        return { peCycles: 20000, maxYears: 30 };
      case 'mlc':
        return { peCycles: 3000, maxYears: 30 };
      case 'qlc':
        return { peCycles: 300, maxYears: 30 };
      case 'tlc':
      default:
        return { peCycles: 1000, maxYears: 30 }; // Conservative default for consumer 3D TLC (Kingston, SanDisk)
    }
  }

  // Industrial IPC SSD
  if (storageMedium === 'ssd_custom') {
    return { peCycles: 1500, maxYears: 50 };
  }

  return { peCycles: 1000, maxYears: 30 };
}

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
  const maxConfigSegmentHours = retentionDays * 24;
  const rawSegmentHours = Math.max(1, Math.floor(config.segmentHours || 24));
  const segmentHours = Math.min(maxConfigSegmentHours, rawSegmentHours);
  let segmentClamped = rawSegmentHours > maxConfigSegmentHours;
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
    const dlMaxSegmentHours = dlRetentionDays * 24;
    const dlRawSegmentHours = Math.max(1, Math.floor(dl.segmentHours || segmentHours));
    const dlSegmentHours = Math.min(dlMaxSegmentHours, dlRawSegmentHours);
    if (dlRawSegmentHours > dlMaxSegmentHours) {
      segmentClamped = true;
    }
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
    }
  });

  // 5. Calculate each Alarm Log
  alarmLogConfigs.forEach((al, index) => {
    const isEnabled = al.enabled !== false;
    // Calculate events from assigned alarm tags
    const matchingAlarmTags = (config.alarmTags || []).filter((at) =>
      at.alarmLogId ? at.alarmLogId === al.id : index === 0
    );
    const alarmTagsEntriesPerDay = matchingAlarmTags.reduce(
      (sum, at) => sum + (Math.max(0, at.eventsPerDay || 0) * Math.max(1, at.count || 1)),
      0
    );
    const totalAlarmTagCount = matchingAlarmTags.reduce(
      (sum, at) => sum + Math.max(1, at.count || 1),
      0
    );

    const baseManualEntries = Math.max(0, Math.floor(al.entriesPerDay || 0));
    const totalEventsPerDay = Math.round(alarmTagsEntriesPerDay + baseManualEntries);
    const alEntriesPerDay = isEnabled ? totalEventsPerDay : 0;

    // Average Siemens SQLite alarm entry size ~180 bytes (text, timestamps, state, values)
    const alBytesPerDay = alEntriesPerDay * 180;
    const alRetentionDays = Math.max(1, Math.floor(al.retentionDays || retentionDays));
    const alMaxSegmentHours = alRetentionDays * 24;
    const alRawSegmentHours = Math.max(1, Math.floor(al.segmentHours || segmentHours));
    const alSegmentHours = Math.min(alMaxSegmentHours, alRawSegmentHours);
    if (alRawSegmentHours > alMaxSegmentHours) {
      segmentClamped = true;
    }
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
      tagCount: totalAlarmTagCount,
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
  }

  // 7. Summary Metrics
  const activeLogItems = logItems.filter((i) => i.enabled && i.totalLogMb > 0);
  const totalStorageUsedMb = activeLogItems.reduce((acc, item) => acc + item.totalLogMb, 0);
  const totalStorageUsedGb = totalStorageUsedMb / 1024;
  const storageOccupancyPct = (totalStorageUsedMb / storageCapMb) * 100;

  const totalEntriesPerDay = Math.round(logItems.reduce((acc, item) => item.enabled ? acc + item.entriesPerDay : acc, 0));
  const totalEntriesPerSec = totalRatePerSec;

  // Max segment size across all active logs (Data Logs, Alarm Logs, Audit Trail)
  const maxSegmentLog = activeLogItems.length > 0
    ? activeLogItems.reduce((max, cur) => (
        cur.sqliteSegmentMb > max.sqliteSegmentMb ||
        (cur.sqliteSegmentMb === max.sqliteSegmentMb && cur.rawSegmentMb > max.rawSegmentMb)
          ? cur
          : max
      ), activeLogItems[0])
    : (logItems.find((i) => i.category === 'data') || logItems[0]);

  const rawSegmentMb = maxSegmentLog ? maxSegmentLog.rawSegmentMb : 0;
  const sqliteSegmentMb = maxSegmentLog ? maxSegmentLog.sqliteSegmentMb : 0;
  const totalSegments = maxSegmentLog ? maxSegmentLog.totalSegments : 0;
  const totalLogMb = totalStorageUsedMb > 0 ? totalStorageUsedMb : (maxSegmentLog ? maxSegmentLog.totalLogMb : 0);
  const totalLogGb = totalLogMb / 1024;

  // Flash Wear & Lifespan estimation (TBW)
  const totalDailyWriteMb = activeLogItems.reduce((acc, item) => {
    if (!item.enabled || item.entriesPerDay <= 0) return acc;
    const segsPerDay = 24 / item.segmentHours;
    return acc + item.sqliteSegmentMb * segsPerDay;
  }, 0);
  const dailyWrittenGb = (totalDailyWriteMb * 1.5) / 1024; // WAL amplification

  const { peCycles, maxYears } = getMediumPeCycles(config.storageMedium, config.nandClass);
  const totalCardTbwGb = storageSizeGb * peCycles;
  const totalCardTbwTb = totalCardTbwGb / 1024;

  const isOverflow = storageOccupancyPct > 100;
  const isPcRt = config.deviceType === 'pc_rt';
  const hasZeroWrites = dailyWrittenGb <= 0 || totalEntriesPerDay === 0;

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

  // Traffic status (Siemens limit recommendations)
  let trafficStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (totalEntriesPerSec > 500) {
    trafficStatus = 'critical';
  } else if (totalEntriesPerSec > 300) {
    trafficStatus = 'warning';
  }

  // Rule of 3 segments (checked on data logs and alarm logs)
  const rule3SegmentsValid = totalEntriesPerDay === 0 || logItems.filter((i) => i.enabled && i.entriesPerDay > 0).every((i) => i.totalSegments >= 3);

  const warnings: string[] = [];

  if (segmentClamped) {
    warnings.push(
      lang === 'ru'
        ? 'Период одного сегмента не может превышать общий срок хранения архива. Время сегмента автоматически ограничено пределом срока хранения.'
        : 'A single segment duration cannot exceed the total retention period. Segment duration has been automatically clamped to the retention limit.'
    );
  }

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

  if (config.deviceType === 'ucp' && flashLifeApplicable && estimatedFlashLifeYears < 3 && totalEntriesPerDay > 0) {
    if (config.storageMedium === 'sd_custom_x52' || config.storageMedium === 'usb_custom') {
      const mediumLabelRu = config.storageMedium === 'usb_custom' ? 'USB-накопителя' : 'SD-карты';
      const mediumLabelEn = config.storageMedium === 'usb_custom' ? 'USB flash drive' : 'SD card';
      warnings.push(
        lang === 'ru'
          ? `Предупреждение по износу Flash: Расчетный ресурс ${mediumLabelRu} составляет ${estimatedFlashLifeYears.toFixed(1)} г. Строго рекомендуется использовать карту/накопитель класса High Endurance или Industrial (pSLC/MLC) с Power-Loss Protection, либо перейти на сетевой диск (NAS/SMB).`
          : `Flash wear alert: Estimated ${mediumLabelEn} endurance is ${estimatedFlashLifeYears.toFixed(1)} years. High Endurance or Industrial grade media (pSLC/MLC) with Power-Loss Protection or network archiving (NAS/SMB) are strongly recommended.`
      );
    } else {
      warnings.push(
        lang === 'ru'
          ? `Предупреждение по износу Flash: Расчетный ресурс накопителя составляет ${estimatedFlashLifeYears.toFixed(1)} г. Рекомендуется архивация на сетевой диск (NAS / SMB).`
          : `Flash wear alert: Estimated storage endurance is ${estimatedFlashLifeYears.toFixed(1)} years. Archiving to network share (NAS / SMB) is recommended.`
      );
    }
  }

  // Consumer flash reliability & PLP advisory for Slot X52 and Port X61
  if (
    config.deviceType === 'ucp' &&
    (config.storageMedium === 'sd_custom_x52' || config.storageMedium === 'usb_custom') &&
    (config.nandClass === 'tlc' || config.nandClass === 'qlc' || !config.nandClass)
  ) {
    const mediumNameRu = config.storageMedium === 'usb_custom' ? 'USB-накопителе' : 'SD-карте';
    const mediumNameEn = config.storageMedium === 'usb_custom' ? 'USB drive' : 'SD card';
    warnings.push(
      lang === 'ru'
        ? `Внимание по надежности: На ${mediumNameRu} используется бытовая память (3D TLC/QLC) без аппаратной защиты от сбоев питания (Power-Loss Protection). При аварийном отключении питания панели возможна порча базы SQLite WAL. Для 24/7 логирования рекомендуется класс High Endurance или Industrial (pSLC/MLC).`
        : `Reliability advisory: ${mediumNameEn} utilizes consumer flash (3D TLC/QLC) without hardware Power-Loss Protection. Sudden panel power cuts may corrupt SQLite WAL databases. High Endurance or Industrial grade media (pSLC/MLC) is recommended for 24/7.`
    );
  }

  if (config.deviceType === 'ucp' && (config.storageMedium === 'sd_custom_x52' || config.storageMedium === 'usb_custom') && storageSizeGb > 32) {
    const portNameRu = config.storageMedium === 'usb_custom' ? 'USB X61' : 'SD X52';
    const portNameEn = config.storageMedium === 'usb_custom' ? 'USB Slot X61' : 'SD Slot X52';
    warnings.push(
      lang === 'ru'
        ? `Внимание по файловой системе (${portNameRu} ${storageSizeGb} GB): Слот ${portNameRu} не поддерживает заводскую разметку exFAT! Обязательно отформатируйте накопитель в NTFS (рекомендация Siemens SIOS для надежности SQLite) или FAT32 перед установкой в панель.`
        : `File system advisory (${portNameEn} ${storageSizeGb} GB): Port ${portNameEn} does NOT support factory-default exFAT! The medium must be formatted in NTFS (Siemens SIOS recommendation for SQLite integrity) or FAT32 before inserting into the panel.`
    );
  }

  // Siemens Rule 4: ASCII-only log names (no Cyrillic, no spaces, no special symbols)
  const invalidNameLogs = logItems.filter((i) => i.name && !/^[A-Za-z0-9_.-]+$/.test(i.name));
  if (invalidNameLogs.length > 0) {
    const invalidNames = invalidNameLogs.map((i) => `"${i.name}"`).join(', ');
    warnings.push(
      lang === 'ru'
        ? `Нарушено правило Siemens SIOS (ASCII Only): имена журналов ${invalidNames} содержат пробелы, кириллицу или спецсимволы (#, $, @, &). Разрешены только символы латиницы (A-Z, a-z), цифры и подчеркивание.`
        : `Siemens SIOS ASCII naming rule violated: log names ${invalidNames} contain spaces, non-ASCII characters, or special symbols (#, $, @, &). Only Latin characters (A-Z, a-z), numbers, and underscores are allowed.`
    );
  }

  if (totalTagsCount === 0 && totalEntriesPerDay === 0) {
    warnings.push(
      lang === 'ru'
        ? 'Список тегов пуст. Добавьте теги процесса или включите журнал тревог для получения актуального расчета.'
        : 'Tag list is empty. Add process logging tags or enable alarm logging to obtain calculation results.'
    );
  }

  // ISA-18.2 / EEMUA 191 Alarm Load Assessment (Advisory only)
  const totalAlarmEntriesPerDay = logItems
    .filter((i) => i.enabled && i.category === 'alarm')
    .reduce((sum, i) => sum + i.entriesPerDay, 0);

  const alarmsPerHour = Math.round((totalAlarmEntriesPerDay / 24) * 10) / 10;
  let isaStatus: 'acceptable' | 'manageable' | 'demanding' | 'overload' = 'acceptable';
  let isaLabelRu = 'Оптимально (<6 алармов/час)';
  let isaLabelEn = 'Acceptable (<6 alarms/hr)';
  let isaDescRu = 'Штатная нагрузка оператора по ISA-18.2 / EEMUA 191 (≤1 аларм за 10 минут).';
  let isaDescEn = 'Manageable operator workload per ISA-18.2 / EEMUA 191 (≤1 alarm per 10 min).';

  if (alarmsPerHour > 30) {
    isaStatus = 'overload';
    isaLabelRu = 'Перегрузка (>30 алармов/час)';
    isaLabelEn = 'Overload (>30 alarms/hr)';
    isaDescRu = 'Высокий риск пропуска критических аварий (лавина алармов / Alarm Flood по ISA-18.2). Рекомендуется рационализация и фильтрация дребезга.';
    isaDescEn = 'Severe operator overload & Alarm Flood risk per ISA-18.2. Alarm rationalization and deadband filtering recommended.';
  } else if (alarmsPerHour > 12) {
    isaStatus = 'demanding';
    isaLabelRu = 'Высокая нагрузка (12–30 алармов/час)';
    isaLabelEn = 'Demanding (12–30 alarms/hr)';
    isaDescRu = 'Повышенная интенсивность аварий (2–5 алармов за 10 минут). Оператор может испытывать перегрузку при инцидентах.';
    isaDescEn = 'High alarm rate (2–5 alarms per 10 min). Operator may experience stress during plant upsets.';
  } else if (alarmsPerHour > 6) {
    isaStatus = 'manageable';
    isaLabelRu = 'Умеренная нагрузка (6–12 алармов/час)';
    isaLabelEn = 'Manageable (6–12 alarms/hr)';
    isaDescRu = 'Приемлемый уровень нагрузки (1–2 аларма за 10 минут) согласно EEMUA 191.';
    isaDescEn = 'Manageable alarm rate (1–2 alarms per 10 min) according to EEMUA 191.';
  }

  const isa18AlarmAssessment: Isa18AlarmAssessment = {
    totalAlarmsPerDay: totalAlarmEntriesPerDay,
    alarmsPerHour,
    status: isaStatus,
    labelRu: isaLabelRu,
    labelEn: isaLabelEn,
    descRu: isaDescRu,
    descEn: isaDescEn,
  };

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
    flashLifeApplicable,
    flashLifeReason,
    dailyWrittenGb,
    totalCardTbwTb,
    peCyclesUsed: peCycles,
    network: calculateUnifiedNetwork(tags),
    warnings,
    logItems,
    totalStorageUsedMb,
    totalStorageUsedGb,
    isa18AlarmAssessment,
  };
}
