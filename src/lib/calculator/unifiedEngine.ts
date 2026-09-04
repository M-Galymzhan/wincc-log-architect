import { UnifiedTag, UnifiedConfig, UnifiedResult } from '../types';

export function calculateUnified(tags: UnifiedTag[], config: UnifiedConfig): UnifiedResult {
  let totalRatePerSec = 0;
  let totalTags = 0;

  tags.forEach((tag) => {
    let rate = tag.entriesPerSec;
    if (tag.mode === 'cyclic' && tag.cycleSec > 0) {
      rate = 1 / tag.cycleSec;
    }
    totalRatePerSec += rate * tag.count;
    totalTags += tag.count;
  });

  // Process data tags entries
  let tagEntriesPerDay = totalRatePerSec * 86400;

  // Add Alarm Logs if enabled (default ~120 bytes per alarm record)
  let alarmEntriesPerDay = config.includeAlarms ? config.alarmsPerDay : 0;
  let alarmBytesPerDay = alarmEntriesPerDay * 120;

  // Add Audit Trail if enabled (default ~250 bytes per audit record)
  let auditEntriesPerDay = config.includeAudit ? config.auditEntriesPerDay : 0;
  let auditBytesPerDay = auditEntriesPerDay * 250;

  let totalEntriesPerDay = tagEntriesPerDay + alarmEntriesPerDay + auditEntriesPerDay;
  let totalEntriesPerSec = totalRatePerSec + (alarmEntriesPerDay + auditEntriesPerDay) / 86400;

  let baseTagBytesPerDay = tagEntriesPerDay * config.perEntryBytes;
  let totalBytesPerDay = baseTagBytesPerDay + alarmBytesPerDay + auditBytesPerDay;

  const factor = 1 + config.headroomPct / 100;
  const segmentsPerDay = 24 / Math.max(1, config.segmentHours);
  const bytesPerSegment = (totalBytesPerDay / segmentsPerDay) * factor;
  const rawSegmentMb = bytesPerSegment / (1024 * 1024);

  // Siemens SQLite Rule: Multiple of 4 MB
  const sqliteSegmentMb = Math.max(4, Math.ceil(rawSegmentMb / 4) * 4);

  const totalSegments = (config.retentionDays * 24) / config.segmentHours;
  
  // Siemens minimum log size recommendations: >= 200 MB
  const totalLogMb = Math.max(200, sqliteSegmentMb * totalSegments);
  const totalLogGb = totalLogMb / 1024;

  // Traffic status (Siemens limit recommendations)
  let trafficStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (totalEntriesPerSec > 500) {
    trafficStatus = 'critical';
  } else if (totalEntriesPerSec > 300) {
    trafficStatus = 'warning';
  }

  // Rule of 3 segments
  const rule3SegmentsValid = totalSegments >= 3;

  // Storage Occupancy
  const storageCapMb = config.storageSizeGb * 1024;
  const storageOccupancyPct = Math.min(100, (totalLogMb / Math.max(1, storageCapMb)) * 100);

  // Flash Wear & Lifespan estimation (TBW)
  // Standard SIMATIC SD card write endurance ~ 2,000 P/E cycles
  // Daily written data = (totalBytesPerDay * factor * 1.5 write amplification) / (1024^3) GB/day
  const dailyWrittenGb = (totalBytesPerDay * factor * 1.5) / (1024 * 1024 * 1024);
  const totalCardTbwGb = config.storageSizeGb * 2000;
  const estimatedFlashLifeYears = dailyWrittenGb > 0 ? Math.min(30, totalCardTbwGb / (dailyWrittenGb * 365)) : 30;

  const warnings: string[] = [];
  if (trafficStatus === 'critical') {
    warnings.push(
      config.deviceType === 'ucp'
        ? 'Критическая нагрузка: более 500 записей/сек. Панель Unified Comfort может терять данные. Рекомендуется увеличить цикл опроса или перейти на PC Runtime с MS SQL.'
        : 'Критическая нагрузка: более 500 записей/сек. База SQLite может работать с задержками. Настоятельно рекомендуется переключить тип базы на Microsoft SQL Server.'
    );
  } else if (trafficStatus === 'warning') {
    warnings.push('Внимание: Высокая нагрузка (300–500 зап/сек). Следите за загрузкой процессора в Runtime.');
  }

  if (!rule3SegmentsValid && totalSegments > 0) {
    warnings.push('Нарушено правило Siemens: период хранения должен содержать минимум 3 сегмента для надежной кольцевой ротации. Уменьшите время сегмента или увеличьте срок хранения.');
  }

  if (storageOccupancyPct > 85) {
    warnings.push(`Внимание: Расчетный лог занимает ${storageOccupancyPct.toFixed(0)}% объема носителя. Рекомендуется использовать карту памяти большего объема.`);
  }

  if (config.deviceType === 'ucp' && estimatedFlashLifeYears < 3) {
    warnings.push(`Предупреждение по износу Flash: Расчетный ресурс SD-карты составляет ${estimatedFlashLifeYears.toFixed(1)} г. Рекомендуется архивация на сетевой диск (NAS / SMB).`);
  }

  if (totalTags === 0) {
    warnings.push('Список тегов пуст. Добавьте теги для получения актуального расчета.');
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
