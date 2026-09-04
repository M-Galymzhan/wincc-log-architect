import { ComfortTag, ComfortConfig, ComfortResult } from '../types';

export function calculateComfort(tags: ComfortTag[], config: ComfortConfig): ComfortResult {
  let totalRatePerSec = 0;
  let totalTags = 0;

  tags.forEach((tag) => {
    let rate = 1 / 60; // default on change: ~1 record per minute
    if (tag.mode === 'cyclic' && tag.cycleSec > 0) {
      rate = 1 / tag.cycleSec;
    }
    totalRatePerSec += rate * tag.count;
    totalTags += tag.count;
  });

  const recordsPerDay = totalRatePerSec * 86400;
  const totalRecordsForPeriod = recordsPerDay * config.retentionDays;

  // Bytes per record: RDB (binary) ~ 32 bytes; CSV (text) ~ 65 bytes
  const bytesPerRecord = config.format === 'rdb' ? 32 : 65;

  // Recommended number of segmented log files (Siemens limit: max 500,000 records per log file)
  const safeRecordsPerFile = Math.min(500000, Math.max(1000, config.recordsPerLog));
  const recommendedLogFiles = Math.max(1, Math.ceil(totalRecordsForPeriod / safeRecordsPerFile));

  const fileSizeMb = (safeRecordsPerFile * bytesPerRecord) / (1024 * 1024);
  const totalArchiveSizeMb = (totalRecordsForPeriod * bytesPerRecord) / (1024 * 1024);
  const totalArchiveSizeGb = totalArchiveSizeMb / 1024;

  const storageOccupancyPct = Math.min(100, (totalArchiveSizeMb / Math.max(1, config.storageMediumMb)) * 100);

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
