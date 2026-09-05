import { ComfortTag, ComfortConfig, ComfortResult, Language } from '../types';

export function calculateComfort(
  tags: ComfortTag[],
  config: ComfortConfig,
  lang: Language = 'ru'
): ComfortResult {
  const retentionDays = Math.max(1, Math.floor(config.retentionDays || 1));
  const recordsPerLog = Math.max(1000, Math.floor(config.recordsPerLog || 50000));
  const storageMediumMb = Math.max(64, config.storageMediumMb || 2048);

  let totalRatePerSec = 0;
  let totalTags = 0;

  tags.forEach((tag) => {
    const count = Math.max(0, Math.floor(tag.count || 0));
    if (count === 0) return;

    let rate = 1 / 60; // default on change: ~1 record per minute
    if (tag.mode === 'cyclic') {
      const cycle = Math.max(0.01, tag.cycleSec || 1);
      rate = 1 / cycle;
    }
    totalRatePerSec += rate * count;
    totalTags += count;
  });

  const recordsPerDay = Math.round(totalRatePerSec * 86400);
  const totalRecordsForPeriod = Math.round(recordsPerDay * retentionDays);

  // Bytes per record: RDB (binary) ~ 32 bytes; CSV (text) ~ 65 bytes
  const bytesPerRecord = config.format === 'rdb' ? 32 : 65;

  // Recommended number of segmented log files (Siemens limit: max 500,000 records per log file)
  const safeRecordsPerFile = Math.min(500000, recordsPerLog);
  const recommendedLogFiles = totalRecordsForPeriod > 0
    ? Math.max(1, Math.ceil(totalRecordsForPeriod / safeRecordsPerFile))
    : 0;

  const fileSizeMb = totalRecordsForPeriod > 0
    ? (Math.min(totalRecordsForPeriod, safeRecordsPerFile) * bytesPerRecord) / (1024 * 1024)
    : 0;
  const totalArchiveSizeMb = totalRecordsForPeriod > 0
    ? (totalRecordsForPeriod * bytesPerRecord) / (1024 * 1024)
    : 0;
  const totalArchiveSizeGb = totalArchiveSizeMb / 1024;

  const storageOccupancyPct = totalArchiveSizeMb > 0
    ? Math.min(100, (totalArchiveSizeMb / storageMediumMb) * 100)
    : 0;

  const warnings: string[] = [];

  if (config.recordsPerLog > 500000) {
    warnings.push(
      lang === 'ru'
        ? 'Превышен жесткий системный лимит Siemens: максимум 500 000 записей на один файл журнала в WinCC Comfort/Advanced.'
        : 'Exceeded Siemens hard limit: maximum 500,000 records per individual log file in WinCC Comfort/Advanced.'
    );
  }

  if (config.deviceType === 'comfort_panel' && recommendedLogFiles > 100) {
    warnings.push(
      lang === 'ru'
        ? `Превышен системный лимит SIMATIC Comfort Panel: максимум 100 файлов в цепочке (Sequence of log files). Рассчитано: ${recommendedLogFiles} файлов. Увеличьте лимит записей на файл (до 500 000) или сократите срок хранения.`
        : `Exceeded SIMATIC Comfort Panel limit: maximum 100 files in log sequence. Calculated: ${recommendedLogFiles} files. Increase records per file limit (up to 500,000) or reduce retention period.`
    );
  } else if (config.deviceType === 'rt_advanced' && recommendedLogFiles > 400) {
    warnings.push(
      lang === 'ru'
        ? `Превышен системный лимит WinCC Runtime Advanced: максимум 400 файлов в цепочке (Sequence of log files). Рассчитано: ${recommendedLogFiles} файлов.`
        : `Exceeded WinCC Runtime Advanced limit: maximum 400 files in log sequence. Calculated: ${recommendedLogFiles} files.`
    );
  }

  if (config.deviceType === 'comfort_panel' && totalRatePerSec > 50) {
    warnings.push(
      lang === 'ru'
        ? 'Высокая нагрузка для Windows CE: более 50 записей/сек на панелях Comfort может приводить к подтормаживанию визуализации. Рекомендуется увеличить циклы архивации.'
        : 'High load for Windows CE: over 50 entries/sec on Comfort Panels may cause screen refresh stutter. Increasing logging cycles is recommended.'
    );
  }

  if (config.format === 'csv' && totalRecordsForPeriod > 0) {
    warnings.push(
      lang === 'ru'
        ? 'Формат CSV занимает в 2 раза больше места, чем RDB, и создает повышенную нагрузку на файловую систему SD-карты. Для производственных линий рекомендуется бинарный RDB.'
        : 'CSV format consumes ~2x more disk space than RDB and induces higher write amplification on SD cards. Binary RDB is recommended for production environments.'
    );
  }

  if (totalArchiveSizeMb > storageMediumMb && totalRecordsForPeriod > 0) {
    warnings.push(
      lang === 'ru'
        ? `Критично: Суммарный объем архива (${totalArchiveSizeMb > 1024 ? `${totalArchiveSizeGb.toFixed(1)} GB` : `${totalArchiveSizeMb.toFixed(0)} MB`}) превышает емкость накопителя (${storageMediumMb} MB)! Выберите носитель большего объема.`
        : `Critical: Total archive size (${totalArchiveSizeMb > 1024 ? `${totalArchiveSizeGb.toFixed(1)} GB` : `${totalArchiveSizeMb.toFixed(0)} MB`}) exceeds storage capacity (${storageMediumMb} MB)! Select a higher capacity storage medium.`
    );
  } else if (storageOccupancyPct > 85) {
    warnings.push(
      lang === 'ru'
        ? `Архив займет ${storageOccupancyPct.toFixed(0)}% емкости карты памяти. Выберите носитель большего объема.`
        : `Archive will occupy ${storageOccupancyPct.toFixed(0)}% of memory card capacity. Select a higher capacity storage medium.`
    );
  }

  if (totalTags === 0) {
    warnings.push(
      lang === 'ru'
        ? 'Список тегов пуст. Добавьте теги для выполнения расчета.'
        : 'Tag list is empty. Add logging tags to execute calculation.'
    );
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
