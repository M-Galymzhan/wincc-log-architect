/**
 * Siemens WinCC Log & Storage Architect - Engineering Engine Verification Suite
 * Run with: npx tsx scripts/testEngines.ts
 */

import { calculateUnified, getDataTypeBytes } from '../src/lib/calculator/unifiedEngine';
import { calculateComfort } from '../src/lib/calculator/comfortEngine';
import { calculateProfessional } from '../src/lib/calculator/professionalEngine';
import { UnifiedTag, UnifiedConfig, ComfortTag, ComfortConfig, ProfessionalTag, ProfessionalConfig } from '../src/lib/types';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

console.log('=== [1] WINCC UNIFIED ENGINE VERIFICATION ===');

// 1.1 Empty state
const unifiedEmpty = calculateUnified([], {
  deviceType: 'ucp',
  retentionDays: 30,
  segmentHours: 24,
  perEntryBytes: 50,
  headroomPct: 30,
  includeAlarms: false,
  alarmsPerDay: 0,
  includeAudit: false,
  auditEntriesPerDay: 0,
  storageMedium: 'sd_12g',
  storageSizeGb: 12,
});
assert(unifiedEmpty.totalTags === 0, 'Unified: empty tags count is 0');
assert(unifiedEmpty.totalLogMb === 0, 'Unified: empty totalLogMb is 0');
assert(unifiedEmpty.sqliteSegmentMb === 0, 'Unified: empty sqliteSegmentMb is 0');
assert(unifiedEmpty.storageOccupancyPct === 0, 'Unified: empty occupancy is 0%');
assert(unifiedEmpty.warnings.length > 0, 'Unified: empty tags produces friendly prompt warning');

// 1.2 SQLite 4MB Segment Rule
const unifiedSample = calculateUnified([
  { id: '1', description: 'Real Temp', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 50, dataType: 'Real' }
], {
  deviceType: 'ucp',
  retentionDays: 30,
  segmentHours: 24,
  perEntryBytes: 50,
  headroomPct: 30,
  includeAlarms: true,
  alarmsPerDay: 100,
  includeAudit: false,
  auditEntriesPerDay: 0,
  storageMedium: 'sd_12g',
  storageSizeGb: 12,
});
assert(unifiedSample.sqliteSegmentMb % 4 === 0, 'Unified: sqliteSegmentMb is strictly multiple of 4 MB', `Got ${unifiedSample.sqliteSegmentMb}`);
assert(unifiedSample.sqliteSegmentMb >= 4, 'Unified: sqliteSegmentMb >= 4 MB');
assert(unifiedSample.totalLogMb >= 200, 'Unified: totalLogMb >= 200 MB (Siemens guideline)', `Got ${unifiedSample.totalLogMb}`);
assert(unifiedSample.rule3SegmentsValid === true, 'Unified: 30 days / 24h = 30 segments (>= 3 segments valid)');

// 1.3 Rule of 3 Segments Violation
const unifiedRule3Fail = calculateUnified([
  { id: '1', description: 'Flow', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 10, dataType: 'Real' }
], {
  deviceType: 'ucp',
  retentionDays: 1,
  segmentHours: 24,
  perEntryBytes: 50,
  headroomPct: 30,
  includeAlarms: false,
  alarmsPerDay: 0,
  includeAudit: false,
  auditEntriesPerDay: 0,
  storageMedium: 'sd_12g',
  storageSizeGb: 12,
});
assert(unifiedRule3Fail.rule3SegmentsValid === false, 'Unified: 1 day retention with 24h segment fails 3 segments rule');
assert(unifiedRule3Fail.warnings.some(w => w.includes('3 сегмента') || w.includes('3 segments')), 'Unified: warns about 3 segments rule');

// 1.4 Data Type Weighting
assert(getDataTypeBytes('Bool', 50) === 38, 'Unified: Bool is 38 bytes');
assert(getDataTypeBytes('Real', 50) === 50, 'Unified: Real is 50 bytes');
assert(getDataTypeBytes('LReal', 50) === 58, 'Unified: LReal is 58 bytes');
assert(getDataTypeBytes('String', 50) === 85, 'Unified: String is 85 bytes');

// 1.5 Critical Traffic Rate (> 500 rec/s)
const unifiedCritical = calculateUnified([
  { id: '1', description: 'Vibration', mode: 'cyclic', cycleSec: 0.1, entriesPerSec: 10, count: 60, dataType: 'Real' }
], {
  deviceType: 'ucp',
  retentionDays: 30,
  segmentHours: 24,
  perEntryBytes: 50,
  headroomPct: 30,
  includeAlarms: false,
  alarmsPerDay: 0,
  includeAudit: false,
  auditEntriesPerDay: 0,
  storageMedium: 'sd_12g',
  storageSizeGb: 12,
});
assert(unifiedCritical.trafficStatus === 'critical', 'Unified: 600 rec/s triggers critical traffic status');
assert(unifiedCritical.warnings.some(w => w.includes('500')), 'Unified: warning cites > 500 limit');

// 1.6 Bilingual Warnings (English)
const unifiedEn = calculateUnified([], {
  deviceType: 'ucp',
  retentionDays: 30,
  segmentHours: 24,
  perEntryBytes: 50,
  headroomPct: 30,
  includeAlarms: false,
  alarmsPerDay: 0,
  includeAudit: false,
  auditEntriesPerDay: 0,
  storageMedium: 'sd_12g',
  storageSizeGb: 12,
}, 'en');
assert(unifiedEn.warnings[0].includes('Tag list is empty'), 'Unified: English warning localization verified');

// 1.7 Integer rounding for fractional rate tags (e.g. cycleSec = 7s)
const unifiedFractional = calculateUnified([
  { id: '1', description: 'Fractional Rate Tag', mode: 'cyclic', cycleSec: 7, entriesPerSec: 1/7, count: 1, dataType: 'Real' }
], {
  deviceType: 'ucp',
  retentionDays: 10,
  segmentHours: 24,
  perEntryBytes: 50,
  headroomPct: 30,
  includeAlarms: false,
  alarmsPerDay: 0,
  includeAudit: false,
  auditEntriesPerDay: 0,
  storageMedium: 'sd_12g',
  storageSizeGb: 12,
});
assert(Number.isInteger(unifiedFractional.entriesPerDay), 'Unified: entriesPerDay is strictly an integer for 7s cycle', `Got ${unifiedFractional.entriesPerDay}`);
assert(unifiedFractional.entriesPerDay === 12343, 'Unified: entriesPerDay rounds 12342.857... to 12343', `Got ${unifiedFractional.entriesPerDay}`);

// 1.8 Critical Storage Capacity Overflow Warning
const unifiedOverflow = calculateUnified([
  { id: '1', description: 'Heavy Log', mode: 'cyclic', cycleSec: 0.1, entriesPerSec: 10, count: 200, dataType: 'Real' }
], {
  deviceType: 'ucp',
  retentionDays: 365,
  segmentHours: 24,
  perEntryBytes: 50,
  headroomPct: 30,
  includeAlarms: false,
  alarmsPerDay: 0,
  includeAudit: false,
  auditEntriesPerDay: 0,
  storageMedium: 'sd_12g',
  storageSizeGb: 12,
});
assert(unifiedOverflow.totalLogGb > 12, 'Unified: overflow test log exceeds 12 GB storage');
assert(unifiedOverflow.warnings.some(w => w.includes('превышает полную емкость') || w.includes('exceeds storage capacity')), 'Unified: emits critical storage overflow alert');

console.log('\n=== [2] WINCC COMFORT / ADVANCED ENGINE VERIFICATION ===');

// 2.1 Empty state
const comfortEmpty = calculateComfort([], {
  deviceType: 'comfort_panel',
  format: 'rdb',
  retentionDays: 30,
  recordsPerLog: 50000,
  logMethod: 'segmented',
  storageMediumMb: 2048,
});
assert(comfortEmpty.totalTags === 0, 'Comfort: empty totalTags is 0');
assert(comfortEmpty.totalArchiveSizeMb === 0, 'Comfort: empty totalArchiveSizeMb is 0');
assert(comfortEmpty.recommendedLogFiles === 0, 'Comfort: empty recommendedLogFiles is 0');

// 2.2 RDB vs CSV comparison
const tagsComfort: ComfortTag[] = [
  { id: '1', description: 'Temp', mode: 'cyclic', cycleSec: 2, count: 50 }
];
const comfortRdb = calculateComfort(tagsComfort, {
  deviceType: 'comfort_panel',
  format: 'rdb',
  retentionDays: 30,
  recordsPerLog: 50000,
  logMethod: 'segmented',
  storageMediumMb: 2048,
});
const comfortCsv = calculateComfort(tagsComfort, {
  deviceType: 'comfort_panel',
  format: 'csv',
  retentionDays: 30,
  recordsPerLog: 50000,
  logMethod: 'segmented',
  storageMediumMb: 2048,
});
assert(comfortCsv.totalArchiveSizeMb > comfortRdb.totalArchiveSizeMb * 1.9, 'Comfort: CSV footprint is approx 2x RDB footprint');

// 2.3 Siemens 500k hard limit warning
const comfortOver500k = calculateComfort(tagsComfort, {
  deviceType: 'comfort_panel',
  format: 'rdb',
  retentionDays: 30,
  recordsPerLog: 600000, // Invalid: exceeds 500k
  logMethod: 'segmented',
  storageMediumMb: 2048,
});
assert(comfortOver500k.warnings.some(w => w.includes('500 000') || w.includes('500,000')), 'Comfort: warns when recordsPerLog > 500,000');

// 2.4 Siemens Comfort Panel 100 sequence files limit
const comfortTooManyFiles = calculateComfort([
  { id: '1', description: 'Fast', mode: 'cyclic', cycleSec: 0.5, count: 50 } // 100 rec/s = 8.64M rec/day
], {
  deviceType: 'comfort_panel',
  format: 'rdb',
  retentionDays: 30,
  recordsPerLog: 10000, // Will require > 100 files
  logMethod: 'segmented',
  storageMediumMb: 2048,
});
assert(comfortTooManyFiles.recommendedLogFiles > 100, 'Comfort: produces > 100 sequence files');
assert(comfortTooManyFiles.warnings.some(w => w.includes('100 файлов') || w.includes('100 files')), 'Comfort: warns when exceeding 100 sequence files on Comfort Panel');

// 2.5 Integer rounding for fractional rate tags (e.g. cycleSec = 3s)
const comfortFractional = calculateComfort([
  { id: '1', description: 'Fractional 3s', mode: 'cyclic', cycleSec: 3, count: 1 }
], {
  deviceType: 'comfort_panel',
  format: 'rdb',
  retentionDays: 14,
  recordsPerLog: 50000,
  logMethod: 'segmented',
  storageMediumMb: 2048,
});
assert(Number.isInteger(comfortFractional.recordsPerDay), 'Comfort: recordsPerDay is strictly an integer', `Got ${comfortFractional.recordsPerDay}`);
assert(Number.isInteger(comfortFractional.totalRecordsForPeriod), 'Comfort: totalRecordsForPeriod is strictly an integer', `Got ${comfortFractional.totalRecordsForPeriod}`);

// 2.6 WinCC Runtime Advanced PC station 400 sequence files limit
const comfortPcRtOver400 = calculateComfort([
  { id: '1', description: 'Heavy Flow', mode: 'cyclic', cycleSec: 0.1, count: 50 } // 500 rec/s = 43.2M rec/day
], {
  deviceType: 'rt_advanced',
  format: 'rdb',
  retentionDays: 30,
  recordsPerLog: 50000,
  logMethod: 'segmented',
  storageMediumMb: 65536,
});
assert(comfortPcRtOver400.recommendedLogFiles > 400, 'Comfort PC RT: produces > 400 sequence files');
assert(comfortPcRtOver400.warnings.some(w => w.includes('400 файлов') || w.includes('400 files')), 'Comfort PC RT: warns when exceeding 400 sequence files limit');

// 2.7 Critical Storage Capacity Overflow
const comfortOverflow = calculateComfort([
  { id: '1', description: 'Massive Archive', mode: 'cyclic', cycleSec: 0.2, count: 50 }
], {
  deviceType: 'comfort_panel',
  format: 'rdb',
  retentionDays: 90,
  recordsPerLog: 500000,
  logMethod: 'segmented',
  storageMediumMb: 512, // 512 MB SD card
});
assert(comfortOverflow.totalArchiveSizeMb > 512, 'Comfort: archive exceeds 512 MB capacity');
assert(comfortOverflow.warnings.some(w => w.includes('превышает емкость') || w.includes('exceeds storage capacity')), 'Comfort: emits critical storage overflow alert');

console.log('\n=== [3] WINCC PROFESSIONAL SCADA ENGINE VERIFICATION ===');

// 3.1 Empty state
const proEmpty = calculateProfessional([], {
  sqlEdition: 'express',
  retentionDays: 90,
  segmentPeriod: 'month',
  includeAlarmLogging: false,
  alarmsPerHour: 0,
  databaseHeadroomPct: 25,
});
assert(proEmpty.fastTagsCount === 0 && proEmpty.slowTagsCount === 0, 'Professional: empty tags count is 0');
assert(proEmpty.totalMdfSizeGb === 0, 'Professional: empty totalMdfSizeGb is 0');
assert(proEmpty.expressLimitExceeded === false, 'Professional: empty does not exceed Express limit');

// 3.2 Fast vs Slow Routing
const proRouting = calculateProfessional([
  { id: '1', description: 'Fast 2s', cycleSec: 2, count: 10, archiveType: 'fast' },
  { id: '2', description: 'Slow 120s', cycleSec: 120, count: 20, archiveType: 'slow' },
], {
  sqlEdition: 'express',
  retentionDays: 30,
  segmentPeriod: 'month',
  includeAlarmLogging: false,
  alarmsPerHour: 0,
  databaseHeadroomPct: 25,
});
assert(proRouting.fastTagsCount === 10, 'Professional: Fast tags routed correctly');
assert(proRouting.slowTagsCount === 20, 'Professional: Slow tags routed correctly');
assert(proRouting.fastDatabaseSizeGb > 0, 'Professional: Fast MDF > 0');
assert(proRouting.slowDatabaseSizeGb > 0, 'Professional: Slow MDF > 0');
assert(proRouting.estimatedLdfSizeGb > 0, 'Professional: LDF transaction log computed (~25% MDF)');

// 3.3 Express 10 GB Limit Check
const proOver10Gb = calculateProfessional([
  { id: '1', description: 'Heavy SCADA', cycleSec: 0.5, count: 200, archiveType: 'fast' } // 400 rec/s * 86400 * 90 days * 48B * 1.25 = ~186 GB
], {
  sqlEdition: 'express',
  retentionDays: 90,
  segmentPeriod: 'month',
  includeAlarmLogging: true,
  alarmsPerHour: 100,
  databaseHeadroomPct: 25,
});
assert(proOver10Gb.expressLimitExceeded === true, 'Professional: detects Express 10 GB limit exceeded');
assert(proOver10Gb.warnings.some(w => w.includes('10 GB')), 'Professional: critical warning for Express 10 GB limit');

// 3.4 Standard Edition (no 10 GB limit)
const proStandard = calculateProfessional([
  { id: '1', description: 'Heavy SCADA', cycleSec: 0.5, count: 200, archiveType: 'fast' }
], {
  sqlEdition: 'standard_enterprise',
  retentionDays: 90,
  segmentPeriod: 'month',
  includeAlarmLogging: true,
  alarmsPerHour: 100,
  databaseHeadroomPct: 25,
});
assert(proStandard.expressLimitExceeded === false, 'Professional: Standard/Enterprise does not flag Express limit');

// 3.5 Integer rounding for fractional rate tags (e.g. cycleSec = 7s)
const proFractional = calculateProfessional([
  { id: '1', description: 'Odd 7s Fast', cycleSec: 7, count: 1, archiveType: 'fast' },
  { id: '2', description: 'Odd 70s Slow', cycleSec: 70, count: 1, archiveType: 'slow' },
], {
  sqlEdition: 'standard_enterprise',
  retentionDays: 30,
  segmentPeriod: 'month',
  includeAlarmLogging: true,
  alarmsPerHour: 35,
  databaseHeadroomPct: 25,
});
assert(Number.isInteger(proFractional.fastEntriesPerDay), 'Professional: fastEntriesPerDay is strictly an integer', `Got ${proFractional.fastEntriesPerDay}`);
assert(Number.isInteger(proFractional.slowEntriesPerDay), 'Professional: slowEntriesPerDay is strictly an integer', `Got ${proFractional.slowEntriesPerDay}`);
assert(Number.isInteger(proFractional.totalEntriesPerDay), 'Professional: totalEntriesPerDay is strictly an integer', `Got ${proFractional.totalEntriesPerDay}`);

// 3.6 Total SQL Server write rate > 2000 rec/s NVMe RAID 10 warning
const proHighRate = calculateProfessional([
  { id: '1', description: 'High Write SCADA', cycleSec: 0.1, count: 250, archiveType: 'fast' } // 2500 rec/s
], {
  sqlEdition: 'standard_enterprise',
  retentionDays: 30,
  segmentPeriod: 'month',
  includeAlarmLogging: false,
  alarmsPerHour: 0,
  databaseHeadroomPct: 25,
});
assert(proHighRate.warnings.some(w => w.includes('2 000') || w.includes('2000') || w.includes('RAID 10')), 'Professional: warns when total write rate exceeds 2000 rec/s');

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log(`========================================`);
