import { UnifiedTag, UnifiedConfig, UnifiedResult, Language } from '../types';

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
  const alarmsPerDay = config.includeAlarms ? Math.max(0, config.alarmsPerDay || 0) : 0;
  const auditEntriesPerDay = config.includeAudit ? Math.max(0, config.auditEntriesPerDay || 0) : 0;
  const storageSizeGb = Math.max(0.1, config.storageSizeGb || 12);

  let totalRatePerSec = 0;
  let totalTags = 0;
  let weightedTagBytesPerSec = 0;

  tags.forEach((tag) => {
    const count = Math.max(0, Math.floor(tag.count || 0));
    if (count === 0) return;

    let rate = 0;
    if (tag.mode === 'cyclic') {
      const cycle = Math.max(0.01, tag.cycleSec || 1);
      rate = 1 / cycle;
    } else {
      // on change mode
      rate = Math.max(0, tag.entriesPerSec || 0.0167);
    }

    const entryBytes = getDataTypeBytes(tag.dataType, perEntryBytes);
    totalRatePerSec += rate * count;
    totalTags += count;
    weightedTagBytesPerSec += rate * count * entryBytes;
  });

  const tagEntriesPerDay = totalRatePerSec * 86400;
  const alarmBytesPerDay = alarmsPerDay * 120;
  const auditBytesPerDay = auditEntriesPerDay * 250;

  const totalEntriesPerDay = Math.round(tagEntriesPerDay + alarmsPerDay + auditEntriesPerDay);
  const totalEntriesPerSec = totalRatePerSec + (alarmsPerDay + auditEntriesPerDay) / 86400;

  const tagBytesPerDay = weightedTagBytesPerSec * 86400;
  const totalBytesPerDay = tagBytesPerDay + alarmBytesPerDay + auditBytesPerDay;

  const factor = 1 + headroomPct / 100;
  const segmentsPerDay = 24 / segmentHours;
  const bytesPerSegment = segmentsPerDay > 0 ? (totalBytesPerDay / segmentsPerDay) * factor : 0;
  const rawSegmentMb = bytesPerSegment / (1024 * 1024);

  let sqliteSegmentMb = 0;
  let totalLogMb = 0;
  let totalLogGb = 0;
  let totalSegments = 0;
  let storageOccupancyPct = 0;
  let estimatedFlashLifeYears = 30;
  const storageCapMb = storageSizeGb * 1024;

  if (totalEntriesPerDay > 0) {
    // Siemens SQLite Rule: Multiple of 4 MB, minimum 4 MB
    sqliteSegmentMb = Math.max(4, Math.ceil(rawSegmentMb / 4) * 4);
    totalSegments = Math.ceil((retentionDays * 24) / segmentHours);
    // Siemens guideline: >= 200 MB for active logging database, and at least totalSegments * segment size
    totalLogMb = Math.max(200, sqliteSegmentMb * Math.max(3, totalSegments));
    totalLogGb = totalLogMb / 1024;

    storageOccupancyPct = Math.min(100, (totalLogMb / storageCapMb) * 100);

    // Flash Wear & Lifespan estimation (TBW)
    // Standard SIMATIC SD card write endurance ~ 2,000 P/E cycles
    // Write amplification with SQLite WAL journaling ~ 1.5x
    const dailyWrittenGb = (totalBytesPerDay * factor * 1.5) / (1024 * 1024 * 1024);
    const totalCardTbwGb = storageSizeGb * 2000;
    estimatedFlashLifeYears = dailyWrittenGb > 0 ? Math.min(30, totalCardTbwGb / (dailyWrittenGb * 365)) : 30;
  }

  // Traffic status (Siemens limit recommendations)
  let trafficStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (totalEntriesPerSec > 500) {
    trafficStatus = 'critical';
  } else if (totalEntriesPerSec > 300) {
    trafficStatus = 'warning';
  }

  // Rule of 3 segments
  const rule3SegmentsValid = totalEntriesPerDay === 0 || totalSegments >= 3;

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

  if (totalEntriesPerDay > 0 && totalLogMb > storageCapMb) {
    warnings.push(
      lang === 'ru'
        ? `Критично: Объем архива (${totalLogGb.toFixed(1)} GB) превышает полную емкость носителя (${storageSizeGb} GB)! Выберите носитель большего объема или сократите срок хранения.`
        : `Critical: Archive size (${totalLogGb.toFixed(1)} GB) exceeds storage capacity (${storageSizeGb} GB)! Select a larger storage medium or reduce retention.`
    );
  } else if (storageOccupancyPct > 85) {
    warnings.push(
      lang === 'ru'
        ? `Внимание: Расчетный лог занимает ${storageOccupancyPct.toFixed(0)}% объема носителя. Рекомендуется использовать карту памяти большего объема.`
        : `Warning: Estimated log occupies ${storageOccupancyPct.toFixed(0)}% of storage capacity. Consider using a larger memory card.`
    );
  }

  if (config.deviceType === 'ucp' && estimatedFlashLifeYears < 3 && totalEntriesPerDay > 0) {
    warnings.push(
      lang === 'ru'
        ? `Предупреждение по износу Flash: Расчетный ресурс SD-карты составляет ${estimatedFlashLifeYears.toFixed(1)} г. Рекомендуется архивация на сетевой диск (NAS / SMB).`
        : `Flash wear alert: Estimated SD card endurance is ${estimatedFlashLifeYears.toFixed(1)} years. Archiving to network share (NAS / SMB) is recommended.`
    );
  }

  if (totalTags === 0 && totalEntriesPerDay === 0) {
    warnings.push(
      lang === 'ru'
        ? 'Список тегов пуст. Добавьте теги процесса или включите журнал тревог для получения актуального расчета.'
        : 'Tag list is empty. Add process logging tags or enable alarm logging to obtain calculation results.'
    );
  }

  return {
    totalTags,
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
    warnings,
  };
}
