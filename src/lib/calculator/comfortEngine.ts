import { ComfortTag, ComfortConfig, ComfortResult } from '../types';

export function calculateComfort(tags: ComfortTag[], config: ComfortConfig): ComfortResult {
  let totalRatePerSec = 0;
  let totalTags = 0;

  const safeRetentionDays = Math.max(0, Number(config.retentionDays) || 0);
  const safeStorageMediumMb = Math.max(1, Number(config.storageMediumMb) || 2048);

  tags.forEach((tag) => {
    const count = Math.max(0, Number(tag.count) || 0);
    let rate = 1 / 60; // default on change: ~1 record per minute
    if (tag.mode === 'cyclic') {
      const cycle = Math.max(0.001, Number(tag.cycleSec) || 1);
      rate = 1 / cycle;
    }
    totalRatePerSec += rate * count;
    totalTags += count;
  });

  const recordsPerDay = totalRatePerSec * 86400;
  const totalRecordsForPeriod = recordsPerDay * safeRetentionDays;

  // Bytes per record: RDB (binary) ~ 32 bytes; CSV (text) ~ 65 bytes
  const bytesPerRecord = config.format === 'rdb' ? 32 : 65;

  // Recommended number of segmented log files (Siemens limit: max 500,000 records per log file)
  const safeRecordsPerFile = Math.min(500000, Math.max(100, Number(config.recordsPerLog) || 50000));
  const recommendedLogFiles = totalRecordsForPeriod > 0
    ? Math.max(1, Math.ceil(totalRecordsForPeriod / safeRecordsPerFile))
    : 1;

  const fileSizeMb = (safeRecordsPerFile * bytesPerRecord) / (1024 * 1024);
  const totalArchiveSizeMb = totalTags > 0 ? (totalRecordsForPeriod * bytesPerRecord) / (1024 * 1024) : 0;
  const totalArchiveSizeGb = totalArchiveSizeMb / 1024;

  const storageOccupancyPct = safeStorageMediumMb > 0
    ? Math.min(100, Math.max(0, (totalArchiveSizeMb / safeStorageMediumMb) * 100))
    : 0;

  const warnings: string[] = [];

  if (config.recordsPerLog > 500000) {
    warnings.push('Превышен жесткий системный лимит Siemens: максимум 500 000 записей на один файл журнала в WinCC Comfort/Advanced.');
  }

  if (config.deviceType === 'comfort_panel' && totalRatePerSec > 50) {
    warnings.push('Высокая нагрузка для Windows CE: более 50 записей/сек на панелях Comfort может приводить к подтормаживанию визуализации. Рекомендуется увеличить циклы архивации.');
  }

  if (config.format === 'csv') {
    warnings.push('Формат CSV занимает в 2 раза больше места, чем RDB, и создает повышенную нагрузку на файловую систему SD-карты. Для производственных линий рекомендуется бинарный RDB.');
  }

  if (storageOccupancyPct > 85) {
    warnings.push(`Архив займет ${storageOccupancyPct.toFixed(0)}% емкости карты памяти. Выберите носитель большего объема.`);
  }

  if (totalTags === 0) {
    warnings.push('Добавьте теги в список для выполнения расчета.');
  }

  return {
    totalTags,
    entriesPerSec: totalRatePerSec,
    recordsPerDay,
    totalRecordsForPeriod,
    recommendedLogFiles,
    fileSizeMb,
    totalArchiveSizeMb,
    totalArchiveSizeGb,
    storageOccupancyPct,
    warnings,
  };
}
