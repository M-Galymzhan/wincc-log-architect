import { ProfessionalTag, ProfessionalConfig, ProfessionalResult, Language } from '../types';

export function calculateProfessional(
  tags: ProfessionalTag[],
  config: ProfessionalConfig,
  lang: Language = 'ru'
): ProfessionalResult {
  const retentionDays = Math.max(1, Math.floor(config.retentionDays || 1));
  const databaseHeadroomPct = Math.max(0, config.databaseHeadroomPct ?? 25);
  const alarmsPerHour = config.includeAlarmLogging ? Math.max(0, config.alarmsPerHour || 0) : 0;

  let fastTagsCount = 0;
  let slowTagsCount = 0;
  let fastRatePerSec = 0;
  let slowRatePerSec = 0;

  tags.forEach((tag) => {
    const count = Math.max(0, Math.floor(tag.count || 0));
    if (count === 0) return;

    const cycle = Math.max(0.01, tag.cycleSec || 1);
    const rate = (1 / cycle) * count;

    // Fast vs slow archive classification:
    // If archiveType is specified, honor it; otherwise cycle < 60s is fast
    const isFast = tag.archiveType ? tag.archiveType === 'fast' : cycle < 60;

    if (isFast) {
      fastTagsCount += count;
      fastRatePerSec += rate;
    } else {
      slowTagsCount += count;
      slowRatePerSec += rate;
    }
  });

  const fastEntriesPerDay = Math.round(fastRatePerSec * 86400);
  const slowEntriesPerDay = Math.round(slowRatePerSec * 86400);
  const alarmEntriesPerDay = Math.round(alarmsPerHour * 24);

  const totalEntriesPerDay = fastEntriesPerDay + slowEntriesPerDay + alarmEntriesPerDay;

  // SQL Server record footprint:
  // Tag logging value: ~48 bytes in MDF (Value, Timestamp, QualityCode, Index)
  // Alarm logging record: ~160 bytes in MDF (Alarm text, state, acknowledge, timestamps)
  const factor = 1 + databaseHeadroomPct / 100;

  const fastBytesTotal = fastEntriesPerDay * retentionDays * 48 * factor;
  const slowBytesTotal = slowEntriesPerDay * retentionDays * 48 * factor;
  const alarmBytesTotal = alarmEntriesPerDay * retentionDays * 160 * factor;

  const fastDatabaseSizeGb = fastBytesTotal / (1024 * 1024 * 1024);
  const slowDatabaseSizeGb = slowBytesTotal / (1024 * 1024 * 1024);
  const alarmDatabaseSizeGb = alarmBytesTotal / (1024 * 1024 * 1024);

  const totalMdfSizeGb = fastDatabaseSizeGb + slowDatabaseSizeGb + alarmDatabaseSizeGb;
  // Transaction Log (LDF) typically requires 25% of MDF under regular maintenance
  const estimatedLdfSizeGb = totalMdfSizeGb * 0.25;
  const totalStorageGb = totalMdfSizeGb + estimatedLdfSizeGb;

  // Microsoft SQL Server Express limitation: 10 GB per database file
  const expressLimitExceeded = config.sqlEdition === 'express' && totalMdfSizeGb > 10;

  const warnings: string[] = [];

  if (expressLimitExceeded) {
    warnings.push(
      lang === 'ru'
        ? `КРИТИЧНО: Расчетный размер базы данных (${totalMdfSizeGb.toFixed(1)} GB) превышает жесткий лимит Microsoft SQL Server Express (10 GB)! База остановит запись. Требуется лицензия SQL Server Standard / Enterprise или настройка автоматической циклической выгрузки сегментов на архивный сервер.`
        : `CRITICAL: Estimated database size (${totalMdfSizeGb.toFixed(1)} GB) exceeds Microsoft SQL Server Express limit (10 GB)! SQL Server will stop logging. Upgrade to SQL Server Standard/Enterprise or configure automated segment backup.`
    );
  }

  const totalRatePerSec = fastRatePerSec + slowRatePerSec;
  if (totalRatePerSec > 2000) {
    warnings.push(
      lang === 'ru'
        ? `Экстремально высокая нагрузка записи в SQL Server (${totalRatePerSec.toFixed(0)} зап/сек). Рекомендуется использовать выделенный высокоскоростной NVMe SSD массив (RAID 10) под базы данных MDF/LDF.`
        : `Extremely high SQL Server logging rate (${totalRatePerSec.toFixed(0)} entries/sec). A dedicated high-speed NVMe SSD array (RAID 10) is recommended for MDF/LDF storage.`
    );
  }

  const totalTags = fastTagsCount + slowTagsCount;
  if (totalTags === 0 && totalEntriesPerDay === 0) {
    warnings.push(
      lang === 'ru'
        ? 'Список тегов пуст. Добавьте теги для расчета баз данных WinCC Professional.'
        : 'Tag list is empty. Add logging tags to size WinCC Professional SQL databases.'
    );
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
