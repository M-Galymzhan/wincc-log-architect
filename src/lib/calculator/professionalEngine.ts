import { ProfessionalTag, ProfessionalConfig, ProfessionalResult } from '../types';

export function calculateProfessional(tags: ProfessionalTag[], config: ProfessionalConfig): ProfessionalResult {
  let fastTagsCount = 0;
  let slowTagsCount = 0;
  let fastRatePerSec = 0;
  let slowRatePerSec = 0;

  const safeRetentionDays = Math.max(0, Number(config.retentionDays) || 0);
  const safeDatabaseHeadroomPct = Math.max(0, Number(config.databaseHeadroomPct) || 0);
  const safeAlarmsPerHour = config.includeAlarmLogging ? Math.max(0, Number(config.alarmsPerHour) || 0) : 0;

  tags.forEach((tag) => {
    const count = Math.max(0, Number(tag.count) || 0);
    const cycle = Math.max(0.001, Number(tag.cycleSec) || 1);
    const rate = (1 / cycle) * count;
    if (cycle < 60 || tag.archiveType === 'fast') {
      fastTagsCount += count;
      fastRatePerSec += rate;
    } else {
      slowTagsCount += count;
      slowRatePerSec += rate;
    }
  });

  const fastEntriesPerDay = fastRatePerSec * 86400;
  const slowEntriesPerDay = slowRatePerSec * 86400;
  const alarmEntriesPerDay = safeAlarmsPerHour * 24;

  const totalEntriesPerDay = fastEntriesPerDay + slowEntriesPerDay + alarmEntriesPerDay;

  // SQL Server record footprint:
  // Tag logging value: ~48 bytes in MDF (Value, Timestamp, QualityCode, Index)
  // Alarm logging record: ~160 bytes in MDF (Alarm text, state, acknowledge, timestamps)
  const factor = 1 + safeDatabaseHeadroomPct / 100;

  const fastBytesTotal = fastEntriesPerDay * safeRetentionDays * 48 * factor;
  const slowBytesTotal = slowEntriesPerDay * safeRetentionDays * 48 * factor;
  const alarmBytesTotal = alarmEntriesPerDay * safeRetentionDays * 160 * factor;

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
