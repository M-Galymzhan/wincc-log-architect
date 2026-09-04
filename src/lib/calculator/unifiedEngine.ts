import { UnifiedTag, UnifiedConfig, UnifiedResult } from '../types';

export function calculateUnified(tags: UnifiedTag[], config: UnifiedConfig): UnifiedResult {
  let totalRatePerSec = 0;
  let totalTags = 0;

  const safeRetentionDays = Math.max(0, Number(config.retentionDays) || 0);
  const safeSegmentHours = Math.max(0.1, Number(config.segmentHours) || 24);
  const safePerEntryBytes = Math.max(1, Number(config.perEntryBytes) || 50);
  const safeStorageGb = Math.max(0.1, Number(config.storageSizeGb) || 1);
  const safeHeadroomPct = Math.max(0, Number(config.headroomPct) || 0);

  tags.forEach((tag) => {
    const count = Math.max(0, Number(tag.count) || 0);
    let rate = Math.max(0, Number(tag.entriesPerSec) || 0);
    if (tag.mode === 'cyclic') {
      const cycle = Math.max(0.001, Number(tag.cycleSec) || 1);
      rate = 1 / cycle;
    }
    totalRatePerSec += rate * count;
    totalTags += count;
  });

  // Process data tags entries
  const tagEntriesPerDay = totalRatePerSec * 86400;

  // Add Alarm Logs if enabled (default ~120 bytes per alarm record)
  const safeAlarmsPerDay = config.includeAlarms ? Math.max(0, Number(config.alarmsPerDay) || 0) : 0;
  const alarmBytesPerDay = safeAlarmsPerDay * 120;

  // Add Audit Trail if enabled (default ~250 bytes per audit record)
  const safeAuditPerDay = config.includeAudit ? Math.max(0, Number(config.auditEntriesPerDay) || 0) : 0;
  const auditBytesPerDay = safeAuditPerDay * 250;

  const totalEntriesPerDay = tagEntriesPerDay + safeAlarmsPerDay + safeAuditPerDay;
  const totalEntriesPerSec = totalRatePerSec + (safeAlarmsPerDay + safeAuditPerDay) / 86400;

  const baseTagBytesPerDay = tagEntriesPerDay * safePerEntryBytes;
  const totalBytesPerDay = baseTagBytesPerDay + alarmBytesPerDay + auditBytesPerDay;

  const factor = 1 + safeHeadroomPct / 100;
  const segmentsPerDay = 24 / safeSegmentHours;
  const bytesPerSegment = (totalBytesPerDay / Math.max(0.001, segmentsPerDay)) * factor;
  const rawSegmentMb = bytesPerSegment / (1024 * 1024);

  // Siemens SQLite Rule: Multiple of 4 MB
  const sqliteSegmentMb = totalTags > 0 || safeAlarmsPerDay > 0 || safeAuditPerDay > 0
    ? Math.max(4, Math.ceil(rawSegmentMb / 4) * 4)
    : 4;

  const totalSegments = safeRetentionDays > 0 ? (safeRetentionDays * 24) / safeSegmentHours : 0;
  
  // Siemens minimum log size recommendations: >= 200 MB when logging active
  const hasData = totalTags > 0 || safeAlarmsPerDay > 0 || safeAuditPerDay > 0;
  const totalLogMb = hasData && totalSegments > 0 ? Math.max(200, sqliteSegmentMb * totalSegments) : 0;
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
  const storageCapMb = safeStorageGb * 1024;
  const storageOccupancyPct = storageCapMb > 0 ? Math.min(100, Math.max(0, (totalLogMb / storageCapMb) * 100)) : 0;

  // Flash Wear & Lifespan estimation (TBW)
  // Standard SIMATIC SD card write endurance ~ 2,000 P/E cycles
  // Daily written data = (totalBytesPerDay * factor * 1.5 write amplification) / (1024^3) GB/day
  const dailyWrittenGb = (totalBytesPerDay * factor * 1.5) / (1024 * 1024 * 1024);
  const totalCardTbwGb = safeStorageGb * 2000;
  const estimatedFlashLifeYears = dailyWrittenGb > 0 && !isNaN(dailyWrittenGb)
    ? Math.min(30, Math.max(0.1, totalCardTbwGb / (dailyWrittenGb * 365)))
    : 30;

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
