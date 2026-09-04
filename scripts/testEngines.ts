import { calculateUnified } from '../src/lib/calculator/unifiedEngine';
import { calculateComfort } from '../src/lib/calculator/comfortEngine';
import { calculateProfessional } from '../src/lib/calculator/professionalEngine';
import { UnifiedTag, UnifiedConfig, ComfortTag, ComfortConfig, ProfessionalTag, ProfessionalConfig } from '../src/lib/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('\n--- 1. Testing Unified Engine ---');

// Case 1.1: Normal configuration
const unifiedTags1: UnifiedTag[] = [
  { id: '1', description: 'Sensor 1', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 10, dataType: 'Real' },
  { id: '2', description: 'Sensor 2', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 20, dataType: 'Real' },
];
const unifiedConfig1: UnifiedConfig = {
  deviceType: 'ucp',
  retentionDays: 30,
  segmentHours: 24,
  perEntryBytes: 50,
  headroomPct: 30,
  includeAlarms: true,
  alarmsPerDay: 1000,
  includeAudit: false,
  auditEntriesPerDay: 0,
  storageMedium: 'sd_12g',
  storageSizeGb: 12,
};
const resU1 = calculateUnified(unifiedTags1, unifiedConfig1);
assert(resU1.totalTags === 30, `Total tags should be 30, got ${resU1.totalTags}`);
assert(Math.abs(resU1.totalEntriesPerSec - 20.0116) < 0.01, `Total entries/sec should be ~20.01, got ${resU1.totalEntriesPerSec}`);
assert(resU1.sqliteSegmentMb % 4 === 0, `SQLite segment size must be multiple of 4 MB, got ${resU1.sqliteSegmentMb}`);
assert(resU1.rule3SegmentsValid === true, `Rule of 3 segments should be valid for 30 days / 24h`);
assert(!Number.isNaN(resU1.estimatedFlashLifeYears), `Flash life years must not be NaN`);
assert(resU1.estimatedFlashLifeYears > 0, `Flash life years must be positive`);

// Case 1.2: Empty tags
const resU_empty = calculateUnified([], { ...unifiedConfig1, includeAlarms: false });
assert(resU_empty.totalTags === 0, 'Empty tags should have totalTags 0');
assert(resU_empty.totalEntriesPerSec === 0, 'Empty tags with no alarms should have 0 entries/sec');
assert(!Number.isNaN(resU_empty.totalLogMb), 'Total log MB must not be NaN with empty tags');

// Case 1.3: Zero retention & zero segment hours robustness
const zeroCfgU = { ...unifiedConfig1, retentionDays: 0, segmentHours: 0 };
const resU_zero = calculateUnified(unifiedTags1, zeroCfgU);
assert(!Number.isNaN(resU_zero.totalSegments), 'Total segments must not be NaN when retention/segment is 0');
assert(Number.isFinite(resU_zero.totalSegments), 'Total segments must not be Infinity');
assert(!Number.isNaN(resU_zero.totalLogMb), 'Total log MB must not be NaN');

// Case 1.4: High traffic rate warning
const heavyTagsU: UnifiedTag[] = [
  { id: '1', description: 'Super fast', mode: 'cyclic', cycleSec: 0.01, entriesPerSec: 100, count: 10, dataType: 'Real' },
];
const resU_heavy = calculateUnified(heavyTagsU, unifiedConfig1);
assert(resU_heavy.trafficStatus === 'critical', '1000 entries/s on UCP should trigger critical status');
assert(resU_heavy.warnings.some(w => w.includes('500 зап/сек') || w.includes('500 entries/s') || w.includes('500')), 'Warning for >500 entries/s should be present');


console.log('\n--- 2. Testing Comfort Engine ---');

// Case 2.1: Normal configuration
const comfortTags1: ComfortTag[] = [
  { id: '1', description: 'Temp', mode: 'cyclic', cycleSec: 1, count: 10 },
  { id: '2', description: 'Pressure', mode: 'cyclic', cycleSec: 5, count: 25 },
];
const comfortConfig1: ComfortConfig = {
  deviceType: 'comfort_panel',
  format: 'rdb',
  retentionDays: 30,
  recordsPerLog: 50000,
  logMethod: 'segmented',
  storageMediumMb: 2048,
};
const resC1 = calculateComfort(comfortTags1, comfortConfig1);
assert(resC1.totalTags === 35, `Total comfort tags should be 35, got ${resC1.totalTags}`);
assert(resC1.recommendedLogFiles >= 1, `Recommended files should be >= 1, got ${resC1.recommendedLogFiles}`);
assert(resC1.totalArchiveSizeMb > 0, `Total archive size should be > 0, got ${resC1.totalArchiveSizeMb}`);

// Case 2.2: RDB vs CSV size difference
const resC_csv = calculateComfort(comfortTags1, { ...comfortConfig1, format: 'csv' });
assert(resC_csv.totalArchiveSizeMb > resC1.totalArchiveSizeMb, 'CSV archive size should be larger than RDB binary');

// Case 2.3: Zero / empty tags
const resC_empty = calculateComfort([], comfortConfig1);
assert(resC_empty.totalTags === 0, 'Empty comfort tags should have totalTags 0');
assert(resC_empty.totalArchiveSizeMb === 0, 'Empty comfort tags should have 0 MB archive');
assert(resC_empty.recommendedLogFiles === 1, 'Empty comfort tags should recommend at least 1 log file');


console.log('\n--- 3. Testing Professional Engine ---');

// Case 3.1: Normal configuration
const proTags1: ProfessionalTag[] = [
  { id: '1', description: 'Fast Tag', cycleSec: 1, count: 50, archiveType: 'fast' },
  { id: '2', description: 'Slow Tag', cycleSec: 60, count: 100, archiveType: 'slow' },
];
const proConfig1: ProfessionalConfig = {
  sqlEdition: 'express',
  retentionDays: 90,
  segmentPeriod: 'month',
  includeAlarmLogging: true,
  alarmsPerHour: 100,
  databaseHeadroomPct: 25,
};
const resP1 = calculateProfessional(proTags1, proConfig1);
assert(resP1.fastTagsCount === 50, `Fast tags count should be 50, got ${resP1.fastTagsCount}`);
assert(resP1.slowTagsCount === 100, `Slow tags count should be 100, got ${resP1.slowTagsCount}`);
assert(resP1.fastDatabaseSizeGb > 0, 'Fast DB size should be > 0');
assert(resP1.totalStorageGb > resP1.totalMdfSizeGb, 'Total storage (MDF+LDF) must be greater than MDF alone');

// Case 3.2: Express 10 GB limit warning boundary
const heavyTagsPro: ProfessionalTag[] = [
  { id: '1', description: 'Massive Fast Tags', cycleSec: 0.1, count: 1000, archiveType: 'fast' },
];
const resP_heavy = calculateProfessional(heavyTagsPro, { ...proConfig1, retentionDays: 365 });
assert(resP_heavy.expressLimitExceeded === true, 'Heavy load on SQL Express should trigger expressLimitExceeded');
assert(resP_heavy.warnings.some(w => w.includes('10 GB')), 'Warning for 10 GB limit must be emitted');

// Case 3.3: Empty tags
const resP_empty = calculateProfessional([], proConfig1);
assert(resP_empty.fastTagsCount === 0, 'Empty tags should have fastTagsCount 0');
assert(resP_empty.slowTagsCount === 0, 'Empty tags should have slowTagsCount 0');
assert(!Number.isNaN(resP_empty.totalStorageGb), 'Total storage Gb must not be NaN');

console.log('\n🎉 ALL 15 AUTOMATED TESTS PASSED SUCCESSFULLY!\n');
