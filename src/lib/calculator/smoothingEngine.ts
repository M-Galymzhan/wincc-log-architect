import { MasterLoggingTag, UnifiedTag, ComfortTag, ProfessionalTag } from '../types';

export interface PlatformCompatibility {
  supported: boolean;
  status: 'full' | 'partial' | 'unsupported';
  reasonsRu: string[];
  reasonsEn: string[];
  effectiveModeRu: string;
  effectiveModeEn: string;
}

/**
 * Calculates the data reduction factor (0 < factor <= 1) achieved by
 * Deadband, Relative Deadband, Swinging Door algorithm, Limits Scope, and Logging Mode.
 *
 * A factor of 0.15 means only 15% of records are written to storage compared to raw continuous cyclic acquisition.
 */
export function calculateDataReductionFactor(tag: MasterLoggingTag): number {
  const effectiveCycleSec = Math.max(0.1, (tag.cycleSec || 1) * (tag.cycleFactor || 1));
  let baseFactor = 1.0;

  // 1. Logging Mode baseline
  switch (tag.loggingMode) {
    case 'ondemand':
      // On demand logging occurs only on external triggers (e.g. batch end, cycle pulse)
      // Typical frequency: ~0.02 of continuous sampling
      baseFactor = 0.02;
      break;

    case 'onchange':
      // On change suppresses recording during steady states
      // For analog tags in industrial processes (temperatures, levels), typical steady state is 70-90% of time
      baseFactor = tag.dataType === 'Bool' ? 0.05 : 0.20;
      break;

    case 'cyclic':
    default:
      baseFactor = 1.0;
      break;
  }

  // 2. Smoothing Mode reduction
  if (tag.loggingMode !== 'ondemand') {
    switch (tag.smoothingMode) {
      case 'swinging_door':
        // Swinging door algorithm removes collinear trend points within tolerance corridor.
        // Industrial compression benchmark: 75% to 92% reduction of raw points.
        baseFactor *= 0.12;
        break;

      case 'relative_value': {
        // Relative deadband (% of span)
        const relDelta = Math.max(0.1, tag.smoothingDelta || 1); // default 1%
        const reduction = Math.min(0.85, 0.30 + (relDelta * 0.08));
        baseFactor *= (1.0 - reduction);
        break;
      }

      case 'value': {
        // Absolute deadband
        const delta = Math.max(0.01, tag.smoothingDelta || 0.5);
        // Typical deadband cuts sensor noise fluctuations by 50-75%
        const reduction = Math.min(0.80, 0.40 + (Math.min(delta, 5) * 0.08));
        baseFactor *= (1.0 - reduction);
        break;
      }

      case 'compare_values':
        // Bitwise comparison (removes identical back-to-back samples in cyclic mode)
        if (tag.loggingMode === 'cyclic') {
          baseFactor *= 0.65;
        }
        break;

      case 'no_smoothing':
      default:
        // No smoothing applied
        break;
    }
  }

  // 3. Limits Scope filter adjustment
  // If logging only when outside limits, greater than high, etc.
  if (tag.limitScope && tag.limitScope !== 'no_limits') {
    switch (tag.limitScope) {
      case 'outside_limits':
      case 'outside_or_equal':
      case 'greater':
      case 'greater_or_equal':
      case 'less':
      case 'less_or_equal':
        // Alarm / excursion selective archiving: parameter is in normal state ~90-95% of time,
        // so logging is active only ~5-10% of operational time.
        baseFactor *= 0.08;
        break;

      case 'within_limits':
      case 'within_or_equal':
        // Normal state logging: skips recording during excursion/shutdown
        baseFactor *= 0.85;
        break;

      default:
        break;
    }
  }

  // 4. Heartbeat (Maximum time) boundary check
  // If maxTimeSec is set, points must be recorded at least once every maxTimeSec
  if (tag.maxTimeSec && tag.maxTimeSec > 0) {
    const minHeartbeatFactor = effectiveCycleSec / tag.maxTimeSec;
    baseFactor = Math.max(baseFactor, minHeartbeatFactor);
  }

  // 5. Anti-chatter (Minimum time) boundary check
  // Caps peak frequency to 1 / minTimeSec
  if (tag.minTimeSec && tag.minTimeSec > 0 && tag.minTimeSec > effectiveCycleSec) {
    const maxAllowedRateFactor = effectiveCycleSec / tag.minTimeSec;
    baseFactor = Math.min(baseFactor, maxAllowedRateFactor);
  }

  // Ensure factor is clamped in sensible engineering bounds [0.001, 1.0]
  return Math.min(1.0, Math.max(0.001, baseFactor));
}

/**
 * Validates cross-platform compatibility of a Master Logging Tag against
 * WinCC Unified, WinCC Comfort / Advanced, and WinCC Professional.
 */
export function checkTagCompatibility(
  tag: MasterLoggingTag,
  platform: 'unified' | 'comfort' | 'professional'
): PlatformCompatibility {
  const reasonsRu: string[] = [];
  const reasonsEn: string[] = [];

  if (platform === 'unified') {
    return {
      supported: true,
      status: 'full',
      reasonsRu: ['Полная поддержка всех параметров TIA Portal V19 (SQLite / PC RT)'],
      reasonsEn: ['Full native support for all TIA Portal V19 parameters (SQLite / PC RT)'],
      effectiveModeRu: 'Unified Native (MTP/PC)',
      effectiveModeEn: 'Unified Native (MTP/PC)',
    };
  }

  if (platform === 'comfort') {
    let hasLimitations = false;

    // 1. On demand mode is not a native tag logging mode in Comfort (requires VBS script LogTag)
    if (tag.loggingMode === 'ondemand') {
      hasLimitations = true;
      reasonsRu.push('Режим "По требованию" (On demand) в Comfort не поддерживается в свойствах тега (требует скрипта LogTag). Будет сконвертирован в "По изменению"');
      reasonsEn.push('"On demand" mode is not a native tag property in Comfort (requires LogTag VBS). Will be converted to "On change"');
    }

    // 2. Limit Scope is not supported in Comfort Data Logs
    if (tag.limitScope && tag.limitScope !== 'no_limits') {
      hasLimitations = true;
      reasonsRu.push(`Фильтрация по пределам (${tag.limitScope}) не поддерживается в Comfort. Тег будет писаться без фильтрации по уставкам`);
      reasonsEn.push(`Limit scope (${tag.limitScope}) is not supported in Comfort. Tag will be recorded without threshold filtering`);
    }

    // 3. Swinging Door is not supported in Comfort RDB/CSV
    if (tag.smoothingMode === 'swinging_door') {
      hasLimitations = true;
      reasonsRu.push('Алгоритм сжатия Swinging Door отсутствует в WinCC Comfort. Будет использоваться базовый Deadband или сырая запись');
      reasonsEn.push('Swinging Door compression is unavailable in WinCC Comfort. Basic deadband or raw logging will be used');
    }

    // 4. Secondary compression logs are not supported
    if (tag.compressionMode && tag.compressionMode !== 'no_compression') {
      hasLimitations = true;
      reasonsRu.push(`Вторичное сжатие (${tag.compressionMode}) не поддерживается редактором архивов Comfort`);
      reasonsEn.push(`Secondary compression (${tag.compressionMode}) is not supported in Comfort tag logging editor`);
    }

    return {
      supported: true,
      status: hasLimitations ? 'partial' : 'full',
      reasonsRu: hasLimitations ? reasonsRu : ['Полная совместимость с WinCC Comfort (RDB/CSV)'],
      reasonsEn: hasLimitations ? reasonsEn : ['Fully compatible with WinCC Comfort (RDB/CSV)'],
      effectiveModeRu: hasLimitations ? 'Comfort (с адаптацией)' : 'Comfort RDB/CSV',
      effectiveModeEn: hasLimitations ? 'Comfort (adapted)' : 'Comfort RDB/CSV',
    };
  }

  if (platform === 'professional') {
    const effectiveCycle = (tag.cycleSec || 1) * (tag.cycleFactor || 1);
    const isFast = effectiveCycle < 60;
    const reasons: string[] = [];
    const reasonsEng: string[] = [];

    if (isFast) {
      reasons.push(`Цикл ${effectiveCycle}с < 60с: тег будет автоматически назначен в архив Tag Logging Fast (бинарное кольцо)`);
      reasonsEng.push(`Cycle ${effectiveCycle}s < 60s: will be routed to Tag Logging Fast (binary ring buffer)`);
    } else {
      reasons.push(`Цикл ${effectiveCycle}с >= 60с: тег будет автоматически назначен в архив Tag Logging Slow (SQL-таблицы)`);
      reasonsEng.push(`Cycle ${effectiveCycle}s >= 60s: will be routed to Tag Logging Slow (standard SQL tables)`);
    }

    if (tag.smoothingMode === 'swinging_door') {
      reasons.push('Алгоритм Swinging Door нативно поддерживается в Tag Logging WinCC Professional');
      reasonsEng.push('Swinging Door algorithm is natively supported in WinCC Professional Tag Logging');
    }

    return {
      supported: true,
      status: 'full',
      reasonsRu: reasons,
      reasonsEn: reasonsEng,
      effectiveModeRu: isFast ? 'Professional (Tag Logging Fast)' : 'Professional (Tag Logging Slow)',
      effectiveModeEn: isFast ? 'Professional (Tag Logging Fast)' : 'Professional (Tag Logging Slow)',
    };
  }

  return {
    supported: false,
    status: 'unsupported',
    reasonsRu: ['Неизвестная целевая платформа'],
    reasonsEn: ['Unknown target platform'],
    effectiveModeRu: 'Не поддерживается',
    effectiveModeEn: 'Unsupported',
  };
}

/**
 * Converts a MasterLoggingTag to a UnifiedTag for WinCC Unified.
 */
export function adaptMasterTagToUnified(tag: MasterLoggingTag): UnifiedTag {
  const reductionFactor = calculateDataReductionFactor(tag);
  const effectiveCycleSec = Math.max(0.1, (tag.cycleSec || 1) * (tag.cycleFactor || 1));
  const rawRatePerSec = 1 / effectiveCycleSec;
  const effectiveEntriesPerSec = +(rawRatePerSec * reductionFactor).toFixed(4);

  return {
    id: tag.id || Math.random().toString(36).substring(2, 9),
    name: tag.name || tag.description,
    processTag: tag.processTag || tag.name,
    description: tag.description || tag.name,
    mode: tag.loggingMode,
    cycleSec: tag.cycleSec || 1,
    cycleFactor: tag.cycleFactor || 1,
    entriesPerSec: effectiveEntriesPerSec,
    count: tag.count || 1,
    dataType: tag.dataType || 'Real',
    dataLogId: tag.targetLogName || 'Trend_Logs',
    triggerMode: tag.triggerMode,
    triggerTag: tag.triggerTag,
    triggerBit: tag.triggerBit,
    limitScope: tag.limitScope,
    highLimit: tag.highLimit,
    lowLimit: tag.lowLimit,
    useTagLimits: tag.useTagLimits,
    smoothingMode: tag.smoothingMode,
    smoothingDelta: tag.smoothingDelta,
    maxTimeSec: tag.maxTimeSec,
    minTimeSec: tag.minTimeSec,
    compressionMode: tag.compressionMode,
    compressionDelaySec: tag.compressionDelaySec,
    sourceLog: tag.sourceLog,
  };
}

/**
 * Converts a MasterLoggingTag to a ComfortTag with safe capability degradation.
 */
export function adaptMasterTagToComfort(tag: MasterLoggingTag): { tag: ComfortTag; warnings: string[] } {
  const warnings: string[] = [];
  let mode: 'cyclic' | 'onchange' = 'cyclic';

  if (tag.loggingMode === 'ondemand') {
    mode = 'onchange';
    warnings.push(`Тег "${tag.name}": Режим On demand преобразован в On change (Comfort не поддерживает On demand в свойствах тега)`);
  } else if (tag.loggingMode === 'onchange') {
    mode = 'onchange';
  } else {
    mode = 'cyclic';
  }

  if (tag.smoothingMode === 'swinging_door') {
    warnings.push(`Тег "${tag.name}": Сжатие Swinging Door отключено (не поддерживается в Comfort RDB)`);
  }

  if (tag.limitScope && tag.limitScope !== 'no_limits') {
    warnings.push(`Тег "${tag.name}": Фильтрация по пределам (${tag.limitScope}) проигнорирована (не поддерживается в Comfort)`);
  }

  return {
    tag: {
      id: tag.id || Math.random().toString(36).substring(2, 9),
      name: tag.name || tag.description,
      processTag: tag.processTag || tag.name,
      description: tag.description || tag.name,
      mode,
      cycleSec: (tag.cycleSec || 1) * (tag.cycleFactor || 1),
      count: tag.count || 1,
      dataType: tag.dataType || 'Real',
      dataLogId: tag.targetLogName || 'default_data_log',
    },
    warnings,
  };
}

/**
 * Converts a MasterLoggingTag to a ProfessionalTag with automatic Fast/Slow routing.
 */
export function adaptMasterTagToProfessional(
  tag: MasterLoggingTag
): { tag: ProfessionalTag; archiveType: 'fast' | 'slow'; warnings: string[] } {
  const warnings: string[] = [];
  const effectiveCycle = (tag.cycleSec || 1) * (tag.cycleFactor || 1);
  const archiveType: 'fast' | 'slow' = effectiveCycle < 60 ? 'fast' : 'slow';

  return {
    tag: {
      id: tag.id || Math.random().toString(36).substring(2, 9),
      name: tag.name || tag.description,
      processTag: tag.processTag || tag.name,
      description: tag.description || tag.name,
      cycleSec: effectiveCycle,
      count: tag.count || 1,
      archiveType,
      dataType: tag.dataType || 'Real',
    },
    archiveType,
    warnings,
  };
}
