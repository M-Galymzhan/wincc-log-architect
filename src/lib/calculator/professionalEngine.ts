import { ProfessionalTag, ProfessionalConfig, ProfessionalResult } from '../types';

export function calculateProfessional(tags: ProfessionalTag[], config: ProfessionalConfig): ProfessionalResult {
  let fastTagsCount = 0;
  let slowTagsCount = 0;
  let fastRatePerSec = 0;
  let slowRatePerSec = 0;

  tags.forEach((tag) => {
    const rate = tag.cycleSec > 0 ? (1 / tag.cycleSec) * tag.count : 0;
    if (tag.cycleSec < 60 || tag.archiveType === 'fast') {
      fastTagsCount += tag.count;
      fastRatePerSec += rate;
    } else {
      slowTagsCount += tag.count;
      slowRatePerSec += rate;
    }
  });

  const fastEntriesPerDay = fastRatePerSec * 86400;
  const slowEntriesPerDay = slowRatePerSec * 86400;
  const alarmEntriesPerDay = config.includeAlarmLogging ? config.alarmsPerHour * 24 : 0;

  const totalEntriesPerDay = fastEntriesPerDay + slowEntriesPerDay + alarmEntriesPerDay;

  // SQL Server record footprint:
  // Tag logging value: ~48 bytes in MDF (Value, Timestamp, QualityCode, Index)
  // Alarm logging record: ~160 bytes in MDF (Alarm text, state, acknowledge, timestamps)
  const factor = 1 + config.databaseHeadroomPct / 100;

  const fastBytesTotal = fastEntriesPerDay * config.retentionDays * 48 * factor;
  const slowBytesTotal = slowEntriesPerDay * config.retentionDays * 48 * factor;
  const alarmBytesTotal = alarmEntriesPerDay * config.retentionDays * 160 * factor;

  const fastDatabaseSizeGb = fastBytesTotal / (1024 * 1024 * 1024);
  const slowDatabaseSizeGb = slowBytesTotal / (1024 * 1024 * 1024);
  const alarmDatabaseSizeGb = alarmBytesTotal / (1024 * 1024 * 1024);

  const totalMdfSizeGb = fastDatabaseSizeGb + slowDatabaseSizeGb + alarmDatabaseSizeGb;
  // Transaction Log (LDF) typically requires 25% of MDF in regular backup mode
  const estimatedLdfSizeGb = totalMdfSizeGb * 0.25;
  const totalStorageGb = totalMdfSizeGb + estimatedLdfSizeGb;

  // Microsoft SQL Server Express limitation: 10 GB per database file
  const expressLimitExceeded = config.sqlEdition === 'express' && totalMdfSizeGb > 10;

  const warnings: string[] = [];

  if (expressLimitExceeded) {
    warnings.push(
      `КРИТИЧНО: Расчетный размер базы данных (${totalMdfSizeGb.toFixed(1)} GB) превышает жесткий лимит Microsoft SQL Server Express (10 GB)! База остановит запись. Требуется лицензия SQL Server Standard / Enterprise или настройка автоматической циклической выгрузки сегментов на архивный сервер.`
    );
  }

  if (fastRatePerSec > 2000) {
    warnings.push('Экстремально высокая частота Fast Logging (> 2000 зап/сек). Рекомендуется использовать выделенный высокоскоростной NVMe SSD массив (RAID 10) под базы данных MDF/LDF.');
  }

  if (tags.length === 0) {
    warnings.push('Список тегов пуст. Добавьте теги для расчета баз данных WinCC Professional.');
  }

  return {
    fastTagsCount,
    slowTagsCount,
    fastEntriesPerDay,
    slowEntriesPerDay,
    alarmEntriesPerDay,
    totalEntriesPerDay,
    fastDatabaseSizeGb,
    slowDatabaseSizeGb,
    alarmDatabaseSizeGb,
    totalMdfSizeGb,
    estimatedLdfSizeGb,
    totalStorageGb,
    expressLimitExceeded,
    warnings,
  };
}
