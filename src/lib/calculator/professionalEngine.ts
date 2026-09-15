import { 
  ProfessionalTag, ProfessionalConfig, ProfessionalResult, Language, 
  CalculatedSqlArchiveItem, Isa18AlarmAssessment 
} from '../types';
import { calculateProfessionalNetwork } from './networkEngine';

export function getProDataTypeBytes(dataType?: string): number {
  switch (dataType) {
    case 'Bool': return 36;
    case 'Int': return 40;
    case 'DInt': return 44;
    case 'Real': return 48;
    case 'LReal': return 56;
    case 'String': return 80;
    default: return 48;
  }
}

export function calculateProfessional(
  tags: ProfessionalTag[],
  config: ProfessionalConfig,
  lang: Language = 'ru'
): ProfessionalResult {
  const retentionDays = Math.max(1, Math.floor(config.retentionDays || 1));
  const databaseHeadroomPct = Math.max(0, config.databaseHeadroomPct ?? 25);
  const factor = 1 + databaseHeadroomPct / 100;
  const diskCapacityGb = Math.max(10, config.diskCapacityGb || 512);
  const basePath = config.archivePath || 'C:\\WinCC_Project';

  let fastTagsCount = 0;
  let slowTagsCount = 0;
  let fastRatePerSec = 0;
  let slowRatePerSec = 0;
  let fastBytesPerSec = 0;
  let slowBytesPerSec = 0;

  tags.forEach((tag) => {
    const count = Math.max(0, Math.floor(tag.count || 0));
    if (count === 0) return;

    const cycle = Math.max(0.01, tag.cycleSec || 1);
    const rate = (1 / cycle) * count;
    const bytesPerRec = getProDataTypeBytes(tag.dataType);

    // Fast vs slow archive classification:
    // If archiveType is specified, honor it; otherwise cycle < 60s is fast
    const isFast = tag.archiveType ? tag.archiveType === 'fast' : cycle < 60;

    if (isFast) {
      fastTagsCount += count;
      fastRatePerSec += rate;
      fastBytesPerSec += rate * bytesPerRec;
    } else {
      slowTagsCount += count;
      slowRatePerSec += rate;
      slowBytesPerSec += rate * bytesPerRec;
    }
  });

  const fastEntriesPerDay = Math.round(fastRatePerSec * 86400);
  const slowEntriesPerDay = Math.round(slowRatePerSec * 86400);

  // Alarm Logging Calculation
  let alarmEntriesPerDay = 0;
  let alarmsPerHour = 0;

  if (config.includeAlarmLogging) {
    if (config.alarmTags && config.alarmTags.length > 0) {
      alarmEntriesPerDay = Math.round(
        config.alarmTags.reduce((acc, at) => acc + (at.eventsPerDay || 0) * (at.count || 1), 0)
      );
      alarmsPerHour = Math.round((alarmEntriesPerDay / 24) * 10) / 10;
    } else {
      alarmsPerHour = Math.max(0, config.alarmsPerHour || 0);
      alarmEntriesPerDay = Math.round(alarmsPerHour * 24);
    }
  }

  const totalEntriesPerDay = fastEntriesPerDay + slowEntriesPerDay + alarmEntriesPerDay;
  const totalRatePerSec = Math.round((fastRatePerSec + slowRatePerSec) * 10) / 10;

  // SQL Server record footprint in MDF:
  // Fast & Slow MDF: dynamically weighted by DataType * factor
  // Alarm logging record: ~192 bytes in MDF (Alarm text, state, acknowledge, timestamps, indexes)
  const fastBytesTotal = fastBytesPerSec * 86400 * retentionDays * factor;
  const slowBytesTotal = slowBytesPerSec * 86400 * retentionDays * factor;
  const alarmBytesTotal = alarmEntriesPerDay * retentionDays * 192 * factor;

  const fastDatabaseSizeGb = fastBytesTotal / (1024 * 1024 * 1024);
  const slowDatabaseSizeGb = slowBytesTotal / (1024 * 1024 * 1024);
  const alarmDatabaseSizeGb = alarmBytesTotal / (1024 * 1024 * 1024);

  const totalMdfSizeGb = fastDatabaseSizeGb + slowDatabaseSizeGb + alarmDatabaseSizeGb;
  // Transaction Log (LDF) typically requires 25% of MDF under regular maintenance and checkpointing
  const estimatedLdfSizeGb = totalMdfSizeGb * 0.25;
  const totalStorageGb = totalMdfSizeGb + estimatedLdfSizeGb;
  const storageOccupancyPct = (totalStorageGb / diskCapacityGb) * 100;

  // Required IOPS Calculation for Microsoft SQL Server:
  // SQL Server buffers writes in Memory/Buffer Pool and writes 8KB pages in batches.
  // Base IOPS = (writes/sec / 20) + alarm flushes + checkpoint overhead.
  const writeIops = Math.ceil(totalRatePerSec / 20) + Math.ceil(alarmsPerHour / 60) + 15;
  const requiredIops = Math.round(writeIops * 1.5); // +50% headroom for indexes and queries

  // Traffic status (Rate thresholds for SQL Server)
  let trafficStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (totalRatePerSec > 2000) {
    trafficStatus = 'critical';
  } else if (totalRatePerSec > 500) {
    trafficStatus = 'warning';
  }

  // Microsoft SQL Server Express limitation: 10 GB per database file
  const expressLimitExceeded = config.sqlEdition === 'express' && totalMdfSizeGb > 10;

  // ISA-18.2 / EEMUA 191 Alarm Assessment
  let isa18AlarmAssessment: Isa18AlarmAssessment | undefined = undefined;
  if (config.includeAlarmLogging && alarmEntriesPerDay > 0) {
    let status: 'acceptable' | 'manageable' | 'demanding';
    let labelRu: string;
    let labelEn: string;
    let descRu: string;
    let descEn: string;

    if (alarmsPerHour <= 6) {
      status = 'acceptable';
      labelRu = 'Нормальная нагрузка оператора';
      labelEn = 'Acceptable Operator Load';
      descRu = 'Поток сообщений находится в пределах нормы ISA-18.2 / EEMUA 191 (< 6 алармов/час). Оператор способен своевременно реагировать.';
      descEn = 'Alarm rate is within ISA-18.2 / EEMUA 191 target (< 6 alarms/hour). Operators can respond effectively.';
    } else if (alarmsPerHour <= 12) {
      status = 'manageable';
      labelRu = 'Управляемый поток аварий';
      labelEn = 'Manageable Alarm Flow';
      descRu = 'Умеренная нагрузка (6–12 алармов/час). Рекомендуется регулярный аудит часто срабатывающих сигнализаций (chattering alarms).';
      descEn = 'Moderate load (6–12 alarms/hour). Regular rationalization of chattering alarms is recommended.';
    } else {
      status = 'demanding';
      labelRu = 'Высокая аварийная нагрузка';
      labelEn = 'Demanding / Overload';
      descRu = 'Превышение нормативов ISA-18.2 (> 12 алармов/час). Риск информационной перегрузки оператора (Alarm Flood) при нештатных ситуациях.';
      descEn = 'Exceeds ISA-18.2 guidelines (> 12 alarms/hour). Risk of operator alarm flood during process upsets.';
    }

    isa18AlarmAssessment = {
      status,
      alarmsPerHour,
      totalAlarmsPerDay: alarmEntriesPerDay,
      labelRu,
      labelEn,
      descRu,
      descEn,
    };
  }

  // TIA Portal SQL Archive Items
  const segmentPeriod = config.segmentPeriod || 'month';
  const archiveItems: CalculatedSqlArchiveItem[] = [
    {
      id: 'fast',
      name: 'TagLoggingFast',
      archiveType: 'fast',
      nameRu: 'Архив быстрых тегов (Fast)',
      nameEn: 'Fast Tag Logging Archive',
      segmentPeriod,
      retentionDays,
      sizeGb: fastDatabaseSizeGb,
      sizeMb: Math.round(fastDatabaseSizeGb * 1024),
      path: `${basePath}\\ArchiveManager\\TagLoggingFast`,
      descriptionRu: 'Высокочастотные переменные с циклом менее 1 минуты',
      descriptionEn: 'High-frequency process variables with cycle < 1 minute',
    },
    {
      id: 'slow',
      name: 'TagLoggingSlow',
      archiveType: 'slow',
      nameRu: 'Архив медленных тегов (Slow)',
      nameEn: 'Slow Tag Logging Archive',
      segmentPeriod,
      retentionDays,
      sizeGb: slowDatabaseSizeGb,
      sizeMb: Math.round(slowDatabaseSizeGb * 1024),
      path: `${basePath}\\ArchiveManager\\TagLoggingSlow`,
      descriptionRu: 'Технологические переменные с циклом от 1 минуты и более',
      descriptionEn: 'Process variables with acquisition cycle >= 1 minute',
    },
    {
      id: 'alarm',
      name: 'AlarmLogging',
      archiveType: 'alarm',
      nameRu: 'Аварийный архив (Alarm)',
      nameEn: 'Alarm Logging Archive',
      segmentPeriod,
      retentionDays,
      sizeGb: alarmDatabaseSizeGb,
      sizeMb: Math.round(alarmDatabaseSizeGb * 1024),
      path: `${basePath}\\ArchiveManager\\AlarmLogging`,
      descriptionRu: 'Журнал аварийных сообщений, предупреждений и действий оператора',
      descriptionEn: 'Alarms, events, and operator acknowledgement log',
    },
  ];

  const warnings: string[] = [];

  // SQL Server Express limit warning
  if (expressLimitExceeded) {
    warnings.push(
      lang === 'ru'
        ? `КРИТИЧНО: Расчетный размер базы данных (${totalMdfSizeGb.toFixed(1)} GB) превышает жесткий лимит Microsoft SQL Server Express (10 GB)! База остановит запись. Требуется лицензия SQL Server Standard / Enterprise или сокращение срока хранения.`
        : `CRITICAL: Estimated database size (${totalMdfSizeGb.toFixed(1)} GB) exceeds Microsoft SQL Server Express limit (10 GB)! SQL Server will stop logging. Upgrade to SQL Server Standard/Enterprise or reduce retention period.`
    );
  } else if (config.sqlEdition === 'express' && totalMdfSizeGb > 8.5) {
    warnings.push(
      lang === 'ru'
        ? `Внимание: Размер базы данных (${totalMdfSizeGb.toFixed(1)} GB) приближается к лимиту Microsoft SQL Server Express (10 GB). Рекомендуется настроить автоматическую циклическую выгрузку сегментов.`
        : `Warning: Database size (${totalMdfSizeGb.toFixed(1)} GB) is approaching the 10 GB limit of SQL Server Express. Configure automated segment backup.`
    );
  }

  // Disk Capacity Overflow
  if (totalStorageGb > diskCapacityGb) {
    warnings.push(
      lang === 'ru'
        ? `КРИТИЧНО: Суммарный объем баз данных и журнала транзакций (${totalStorageGb.toFixed(1)} GB) превышает емкость диска (${diskCapacityGb} GB)!`
        : `CRITICAL: Total database and transaction log footprint (${totalStorageGb.toFixed(1)} GB) exceeds disk capacity (${diskCapacityGb} GB)!`
    );
  } else if (storageOccupancyPct > 85) {
    warnings.push(
      lang === 'ru'
        ? `Внимание: Базы данных займут ${storageOccupancyPct.toFixed(0)}% емкости выбранного накопителя. Рекомендуется увеличить дисковое пространство сервера.`
        : `Warning: Databases will consume ${storageOccupancyPct.toFixed(0)}% of disk capacity. Increasing server storage is recommended.`
    );
  }

  // High logging rate warning
  if (totalRatePerSec > 2000) {
    warnings.push(
      lang === 'ru'
        ? `Экстремально высокая нагрузка записи в SQL Server (${totalRatePerSec.toFixed(0)} зап/сек, требуется ~${requiredIops} IOPS). Рекомендуется использовать выделенный NVMe SSD массив (RAID 10) и физически разнести файлы MDF и LDF на разные диски.`
        : `Extremely high SQL Server logging rate (${totalRatePerSec.toFixed(0)} entries/sec, ~${requiredIops} IOPS required). A dedicated NVMe SSD array (RAID 10) and physical separation of MDF/LDF files is recommended.`
    );
  } else if (requiredIops > 200 && config.storageDiskType === 'hdd_raid1') {
    warnings.push(
      lang === 'ru'
        ? `Ограничение дисковой подсистемы: Требуется ~${requiredIops} IOPS, тогда как классический массив HDD (RAID 1) обеспечивает ~150-200 IOPS. Возможны задержки фиксации транзакций. Рекомендуется переход на SSD/NVMe.`
        : `Disk subsystem bottleneck: Required ~${requiredIops} IOPS exceeds typical HDD RAID 1 capacity (~150-200 IOPS). Upgrade to enterprise SSD/NVMe is recommended.`
    );
  }

  const totalTags = fastTagsCount + slowTagsCount;
  if (totalTags === 0 && totalEntriesPerDay === 0) {
    warnings.push(
      lang === 'ru'
        ? 'Список тегов пуст. Добавьте теги или включите журнал аварий для расчета баз данных WinCC Professional.'
        : 'Tag list is empty. Add logging tags or enable alarm logging to size WinCC Professional SQL databases.'
    );
  }

  return {
    fastTagsCount,
    slowTagsCount,
    fastEntriesPerDay,
    slowEntriesPerDay,
    alarmEntriesPerDay,
    totalEntriesPerDay,
    totalRatePerSec,
    fastDatabaseSizeGb,
    slowDatabaseSizeGb,
    alarmDatabaseSizeGb,
    totalMdfSizeGb,
    estimatedLdfSizeGb,
    totalStorageGb,
    storageOccupancyPct,
    requiredIops,
    trafficStatus,
    expressLimitExceeded,
    archiveItems,
    network: calculateProfessionalNetwork(tags),
    warnings,
    isa18AlarmAssessment,
  };
}
