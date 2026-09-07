/**
 * Siemens WinCC Log & Storage Architect - Engineering Engine Verification Suite
 * Run with: npx tsx scripts/testEngines.ts
 */

import { calculateUnified, getDataTypeBytes } from '../src/lib/calculator/unifiedEngine';
import { calculateComfort } from '../src/lib/calculator/comfortEngine';
import { calculateProfessional } from '../src/lib/calculator/professionalEngine';
import { UnifiedTag, UnifiedConfig, ComfortTag, ComfortConfig, ProfessionalTag, ProfessionalConfig } from '../src/lib/types';
import { INDUSTRY_PRESETS } from '../src/lib/presets';
import { generateTiaPortalCsv } from '../src/lib/tiaExporter';
import { getSiemensArticle, SIEMENS_STORAGE_CATALOG } from '../src/lib/calculator/mlfbCatalog';
import { calculateUnifiedNetwork, calculateComfortNetwork, calculateProfessionalNetwork } from '../src/lib/calculator/networkEngine';
import fs from 'fs';
import readXlsxFile from 'read-excel-file/universal';
import { 
  parseCycleString, 
  parseDataTypeString, 
  parseModeString, 
  detectColumns, 
  parseRowsToTags, 
  parseCsvText, 
  extractXlsxRows, 
  convertToUnifiedTags, 
  convertToComfortTags, 
  convertToProfessionalTags 
} from '../src/lib/tagImporter';

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

console.log('\n=== [4] INDUSTRY PRESETS VERIFICATION ===');
assert(INDUSTRY_PRESETS.length === 4, 'Presets: exactly 4 industry presets exist');
const presetIds = INDUSTRY_PRESETS.map(p => p.id);
assert(presetIds.includes('pump_station'), 'Presets: includes pump_station');
assert(presetIds.includes('boiler_house'), 'Presets: includes boiler_house');
assert(presetIds.includes('pharma_gmp'), 'Presets: includes pharma_gmp');
assert(presetIds.includes('hvac_vent'), 'Presets: includes hvac_vent');

INDUSTRY_PRESETS.forEach(preset => {
  assert(preset.unifiedTags.length > 0, `Presets [${preset.id}]: has valid unified tags`);
  assert(preset.comfortTags.length > 0, `Presets [${preset.id}]: has valid comfort tags`);
  assert(preset.proTags.length > 0, `Presets [${preset.id}]: has valid professional tags`);
  assert(typeof preset.nameRu === 'string' && preset.nameRu.length > 0, `Presets [${preset.id}]: has nameRu`);
  assert(typeof preset.nameEn === 'string' && preset.nameEn.length > 0, `Presets [${preset.id}]: has nameEn`);
});

console.log('\n=== [5] TIA PORTAL CSV EXPORTER VERIFICATION ===');
const sampleUnifiedTags: UnifiedTag[] = [
  { id: '1', description: 'Motor_Current_1', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 2, dataType: 'Real' },
  { id: '2', description: 'Alarm_Status', mode: 'onchange', cycleSec: 60, entriesPerSec: 0.0167, count: 4, dataType: 'Bool' },
];
const unifiedExportCsv = generateTiaPortalCsv('unified', sampleUnifiedTags, 'ProcessLog');
assert(unifiedExportCsv.startsWith('\uFEFF'), 'TIA Exporter: output starts with UTF-8 BOM');
assert(unifiedExportCsv.includes('Name;Data log;Logging mode;Logging cycle;Data type;Deadband;Smoothing;Comment'), 'TIA Exporter: unified has standard header');
assert(unifiedExportCsv.includes('Motor_Current_1;ProcessLog;Cyclic;1 s;Real;0;None;'), 'TIA Exporter: unified cyclic tag row formatted correctly');
assert(unifiedExportCsv.includes('Alarm_Status;ProcessLog;On change;None;Bool;0;None;'), 'TIA Exporter: unified onchange tag row formatted correctly');

const sampleComfortTags: ComfortTag[] = [
  { id: '1', description: 'Temp_Zone_1', mode: 'cyclic', cycleSec: 2, count: 5 }
];
const comfortExportCsv = generateTiaPortalCsv('comfort', sampleComfortTags, 'ComfortLog');
assert(comfortExportCsv.includes('Name;Data log;Logging mode;Logging cycle;Acquisition cycle;Comment'), 'TIA Exporter: comfort has standard header');
assert(comfortExportCsv.includes('Temp_Zone_1;ComfortLog;Cyclic;2 s;1 s;'), 'TIA Exporter: comfort tag row formatted correctly');

const sampleProTags: ProfessionalTag[] = [
  { id: '1', description: 'Vibro_Sensor', cycleSec: 0.5, count: 10, archiveType: 'fast' },
  { id: '2', description: 'Daily_Total', cycleSec: 60, count: 5, archiveType: 'slow' },
];
const proExportCsv = generateTiaPortalCsv('professional', sampleProTags);
assert(proExportCsv.includes('Name;Archive name;Archive type;Cycle time;Acquisition type;Comment'), 'TIA Exporter: professional has standard header');
assert(proExportCsv.includes('Vibro_Sensor;TagLoggingFast;FAST;0.5 s;Cyclic;'), 'TIA Exporter: professional fast tag formatted correctly');
assert(proExportCsv.includes('Daily_Total;TagLoggingSlow;SLOW;60 s;Cyclic;'), 'TIA Exporter: professional slow tag formatted correctly');

console.log('\n=== [6] SIEMENS HARDWARE MLFB CATALOG VERIFICATION ===');
assert(SIEMENS_STORAGE_CATALOG.sd_12g.mlfb === '6AV2181-4DB20-0AX0', 'MLFB: sd_12g is 6AV2181-4DB20-0AX0');
assert(SIEMENS_STORAGE_CATALOG.sd_2g.mlfb === '6AV2181-4DB10-0AX0', 'MLFB: sd_2g is 6AV2181-4DB10-0AX0');
assert(SIEMENS_STORAGE_CATALOG.sd_512m.mlfb === '6AV2181-4DB00-0AX0', 'MLFB: sd_512m is 6AV2181-4DB00-0AX0');
assert(SIEMENS_STORAGE_CATALOG.usb_128g.mlfb === '6ES7648-0DC60-0AA0', 'MLFB: usb_128g is 6ES7648-0DC60-0AA0');
assert(SIEMENS_STORAGE_CATALOG.ssd_custom.mlfb === '6ES7648-2BF30-0AA0', 'MLFB: ssd_custom is 6ES7648-2BF30-0AA0');
assert(getSiemensArticle('sd_12g').capacityGb === 12, 'MLFB: getSiemensArticle(sd_12g) returns 12GB item');
assert(getSiemensArticle('nonexistent_key').mlfb === '6AV2181-4DB20-0AX0', 'MLFB: fallback to sd_12g for unknown key');

console.log('\n=== [7] INDUSTRIAL ETHERNET NETWORK BANDWIDTH VERIFICATION ===');
// Empty tags check
const emptyNet = calculateUnifiedNetwork([]);
assert(emptyNet.bandwidthKbps === 0, 'Network: empty tags bandwidth is 0 Kbps');
assert(emptyNet.bandwidthMbps === 0, 'Network: empty tags bandwidth is 0 Mbps');
assert(emptyNet.dailyTrafficMb === 0, 'Network: empty tags daily traffic is 0 MB');
assert(emptyNet.networkStatus === 'safe', 'Network: empty tags status is safe');

// Unified network calculation
const unifiedNet = calculateUnifiedNetwork(sampleUnifiedTags);
assert(unifiedNet.bandwidthKbps > 0, 'Network: Unified tags produces non-zero Kbps');
assert(unifiedNet.dailyTrafficMb > 0, 'Network: Unified tags produces non-zero daily MB');
assert(unifiedNet.networkStatus === 'safe', 'Network: Moderate load is safe (< 2 Mbps)');

// Comfort network calculation
const comfortNet = calculateComfortNetwork(sampleComfortTags);
assert(comfortNet.bandwidthKbps > 0, 'Network: Comfort tags produces non-zero Kbps');
assert(comfortNet.fastEthernetSaturationPct >= 0, 'Network: Comfort computes Fast Ethernet saturation %');

// Professional network calculation
const proNet = calculateProfessionalNetwork(sampleProTags);
assert(proNet.bandwidthKbps > 0, 'Network: Professional tags produces non-zero Kbps');

// Heavy load test (> 10 Mbps)
const heavyTags: UnifiedTag[] = [
  { id: '1', description: 'Fast10ms', mode: 'cyclic', cycleSec: 0.01, entriesPerSec: 100, count: 500, dataType: 'Real' } // 50,000 rec/s = ~11.2 Mbps
];
const heavyNet = calculateUnifiedNetwork(heavyTags);
assert(heavyNet.bandwidthMbps >= 10, 'Network: Heavy traffic exceeds 10 Mbps threshold');
assert(heavyNet.networkStatus === 'critical', 'Network: Heavy traffic marked as critical');
assert(heavyNet.recommendationRu.includes('1000BASE-T'), 'Network: High load recommends Gigabit/isolation in RU');
assert(heavyNet.recommendationEn.includes('1000BASE-T'), 'Network: High load recommends Gigabit/isolation in EN');

// Integration in engines
const unifiedRes = calculateUnified(sampleUnifiedTags, {
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
assert(unifiedRes.network !== undefined, 'Unified engine returns network metrics');
assert(unifiedRes.network.bandwidthKbps > 0, 'Unified engine network metrics populated');

console.log('\n=== [8] TIA PORTAL TAG IMPORTER VERIFICATION ===');

// 8.1 Cycle parser tests
assert(parseCycleString('T250ms') === 0.25, 'Importer: T250ms parses to 0.25s');
assert(parseCycleString('T500ms') === 0.5, 'Importer: T500ms parses to 0.5s');
assert(parseCycleString('T1s') === 1, 'Importer: T1s parses to 1s');
assert(parseCycleString('2s') === 2, 'Importer: 2s parses to 2s');
assert(parseCycleString('T1m') === 60, 'Importer: T1m parses to 60s');
assert(parseCycleString('T10m') === 600, 'Importer: T10m parses to 600s');
assert(parseCycleString('10 ms') === 0.01, 'Importer: 10 ms clamped to 0.01s minimum');
assert(parseCycleString('<No Value>') === 1, 'Importer: <No Value> defaults to 1s fallback');
assert(parseCycleString('invalid') === 1, 'Importer: invalid string defaults to 1s fallback');

// 8.2 Data type parser tests
assert(parseDataTypeString('Bool') === 'Bool', 'Importer: Bool mapped to Bool');
assert(parseDataTypeString('Int') === 'Int', 'Importer: Int mapped to Int');
assert(parseDataTypeString('Word') === 'Int', 'Importer: Word mapped to Int');
assert(parseDataTypeString('DInt') === 'DInt', 'Importer: DInt mapped to DInt');
assert(parseDataTypeString('UDInt') === 'DInt', 'Importer: UDInt mapped to DInt');
assert(parseDataTypeString('Real') === 'Real', 'Importer: Real mapped to Real');
assert(parseDataTypeString('LReal') === 'LReal', 'Importer: LReal mapped to LReal');
assert(parseDataTypeString('String') === 'String', 'Importer: String mapped to String');
assert(parseDataTypeString('WString') === 'String', 'Importer: WString mapped to String');

// 8.3 Mode parser tests
assert(parseModeString('Cyclic in operation') === 'cyclic', 'Importer: Cyclic in operation mapped to cyclic');
assert(parseModeString('Cyclic continuous') === 'cyclic', 'Importer: Cyclic continuous mapped to cyclic');
assert(parseModeString('On change') === 'onchange', 'Importer: On change mapped to onchange');
assert(parseModeString('По изменению') === 'onchange', 'Importer: Cyrillic По изменению mapped to onchange');

// 8.4 Column detection tests
const tiaHmiHeader = ['Name', 'Path', 'Connection', 'PLC tag', 'DataType', 'Acquisition mode', 'Acquisition cycle'];
const detectedCols = detectColumns(tiaHmiHeader);
assert(detectedCols.nameIdx === 0, 'Importer: detectColumns identifies Name at index 0');
assert(detectedCols.typeIdx === 4, 'Importer: detectColumns identifies DataType at index 4');
assert(detectedCols.modeIdx === 5, 'Importer: detectColumns identifies Acquisition mode at index 5');
assert(detectedCols.cycleIdx === 6, 'Importer: detectColumns identifies Acquisition cycle at index 6');

// 8.5 CSV text parser tests
const sampleCsv = `Name;DataType;Acquisition mode;Acquisition cycle\r\nMotor_Speed;Real;Cyclic;T500ms\r\nValve_State;Bool;On change;T1s`;
const csvRows = parseCsvText(sampleCsv);
assert(csvRows.length === 3, 'Importer: CSV parsed 3 rows (1 header + 2 data)');
const csvParsed = parseRowsToTags(csvRows);
assert(csvParsed.tags.length === 2, 'Importer: CSV produced 2 valid tags');
assert(csvParsed.tags[0].name === 'Motor_Speed', 'Importer: CSV tag 0 name is Motor_Speed');
assert(csvParsed.tags[0].cycleSec === 0.5, 'Importer: CSV tag 0 cycle is 0.5s');
assert(csvParsed.tags[1].mode === 'onchange', 'Importer: CSV tag 1 mode is onchange');

// 8.6 Real TIA Portal V19 Export file verification (test_impTeg.xlsx)
async function runAsyncTests() {
  if (fs.existsSync('test_impTeg.xlsx')) {
    const xlsxBuf = fs.readFileSync('test_impTeg.xlsx');
    const ab = xlsxBuf.buffer.slice(xlsxBuf.byteOffset, xlsxBuf.byteOffset + xlsxBuf.byteLength);
    const rawSheets = await readXlsxFile(ab);
    const { rows: testRows, sheetName } = extractXlsxRows(rawSheets);
    assert(testRows.length === 183, `Importer: test_impTeg.xlsx has 183 rows (header + 182 tags), found ${testRows.length}`);
    assert(sheetName === 'Hmi Tags', `Importer: test_impTeg.xlsx correctly selected sheet 'Hmi Tags', got '${sheetName}'`);

    const parsedTia = parseRowsToTags(testRows);
    assert(parsedTia.tags.length === 182, `Importer: successfully parsed 182 tags from TIA V19, got ${parsedTia.tags.length}`);
    assert(parsedTia.tags[0].name === 'PLC1_Frequency_scada_HH', 'Importer: first tag name matches TIA export');
    assert(parsedTia.tags[0].dataType === 'Bool', 'Importer: first tag dataType is Bool');
    assert(parsedTia.tags[0].cycleSec === 0.25, 'Importer: first tag cycle T250ms is converted to 0.25s');
    assert(parsedTia.tags[0].entriesPerSec === 4, 'Importer: 0.25s cycle computes 4 entries/sec');

    // Convert to Unified tags and verify calculator sizing
    const unifiedImported = convertToUnifiedTags(parsedTia.tags);
    assert(unifiedImported.length === 182, 'Importer: converted exactly 182 Unified tags');
    const unifiedImportSizing = calculateUnified(unifiedImported, {
      deviceType: 'ucp',
      retentionDays: 30,
      segmentHours: 24,
      perEntryBytes: 38,
      headroomPct: 30,
      includeAlarms: false,
      alarmsPerDay: 0,
      includeAudit: false,
      auditEntriesPerDay: 0,
      storageMedium: 'sd_12g',
      storageSizeGb: 12,
    });
    assert(unifiedImportSizing.totalEntriesPerSec === 728, `Importer: 182 tags @ 4 rec/s = 728 rec/s total, got ${unifiedImportSizing.totalEntriesPerSec}`);
    assert(unifiedImportSizing.trafficStatus === 'critical', 'Importer: 728 rec/s correctly flags critical traffic status (> 500 limit)');

    // Convert to Comfort tags
    const comfortImported = convertToComfortTags(parsedTia.tags);
    assert(comfortImported.length === 182, 'Importer: converted exactly 182 Comfort tags');

    // Convert to Professional tags (<= 1s goes to Fast Tag Logging)
    const proImported = convertToProfessionalTags(parsedTia.tags);
    assert(proImported.length === 182, 'Importer: converted exactly 182 Professional tags');
    assert(proImported.every(t => t.archiveType === 'fast'), 'Importer: all 0.25s tags routed to Fast Tag Logging');

    // 9. Multi-Log Architecture: N Data Logs + M Alarm Logs
    console.log('\n--- Test Suite 9: WinCC Unified Multi-Log Architecture (N Data Logs + M Alarm Logs) ---');
    const multiTags: UnifiedTag[] = [
      { id: 'tag1', description: 'Log1 Tag', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 10, dataType: 'Real', dataLogId: 'log_1' },
      { id: 'tag2', description: 'Log2 Tag', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 20, dataType: 'Int', dataLogId: 'log_2' },
      { id: 'tag3', description: 'Log3 Tag', mode: 'cyclic', cycleSec: 5, entriesPerSec: 0.2, count: 5, dataType: 'Bool', dataLogId: 'log_3' },
    ];

    const multiLogConfig: UnifiedConfig = {
      deviceType: 'ucp',
      retentionDays: 30,
      segmentHours: 24,
      perEntryBytes: 38,
      headroomPct: 30,
      includeAlarms: true,
      alarmsPerDay: 500,
      includeAudit: false,
      auditEntriesPerDay: 0,
      storageMedium: 'sd_12g',
      storageSizeGb: 12,
      dataLogs: [
        { id: 'log_1', name: 'Trend_Fast', enabled: true },
        { id: 'log_2', name: 'Trend_Slow', enabled: true },
        { id: 'log_3', name: 'Trend_Digital', enabled: true, retentionDays: 90 },
      ],
      alarmLogs: [
        { id: 'alm_1', name: 'Alarms_High', entriesPerDay: 300, enabled: true },
        { id: 'alm_2', name: 'Alarms_Warning', entriesPerDay: 600, enabled: true },
        { id: 'alm_3', name: 'Events_System', entriesPerDay: 1000, enabled: true },
        { id: 'alm_4', name: 'Events_AuditLog', entriesPerDay: 150, enabled: true },
        { id: 'alm_5', name: 'Alarms_Diagnostics', entriesPerDay: 50, enabled: true },
      ],
    };

    const multiResult = calculateUnified(multiTags, multiLogConfig);
    assert(multiResult.logItems.length === 8, `Multi-Log: Expected 8 log items (3 data + 5 alarm), got ${multiResult.logItems.length}`);
    const dataItems = multiResult.logItems.filter(l => l.category === 'data');
    const alarmItems = multiResult.logItems.filter(l => l.category === 'alarm');
    assert(dataItems.length === 3, `Multi-Log: 3 data log items, got ${dataItems.length}`);
    assert(alarmItems.length === 5, `Multi-Log: 5 alarm log items, got ${alarmItems.length}`);

    // Check custom retention for log_3 (90 days)
    const log3 = dataItems.find(l => l.name === 'Trend_Digital');
    assert(log3?.retentionDays === 90, `Multi-Log: log_3 retention is 90 days, got ${log3?.retentionDays}`);

    // Check segment sizes are multiple of 4 MB and >= 4 MB
    for (const item of multiResult.logItems) {
      assert(item.sqliteSegmentMb % 4 === 0, `Multi-Log: ${item.name} sqliteSegmentMb must be multiple of 4, got ${item.sqliteSegmentMb}`);
      assert(item.sqliteSegmentMb >= 4, `Multi-Log: ${item.name} sqliteSegmentMb >= 4 MB, got ${item.sqliteSegmentMb}`);
      assert(item.totalLogMb >= item.sqliteSegmentMb, `Multi-Log: ${item.name} totalLogMb >= sqliteSegmentMb`);
    }

    // Verify sum of storage
    const expectedSumMb = multiResult.logItems.filter(l => l.enabled).reduce((acc, l) => acc + l.totalLogMb, 0);
    assert(multiResult.totalStorageUsedMb === expectedSumMb, `Multi-Log: totalStorageUsedMb matches sum (${expectedSumMb} MB)`);
    assert(Math.abs(multiResult.totalStorageUsedGb - expectedSumMb / 1024) < 0.001, `Multi-Log: totalStorageUsedGb matches conversion`);

    // Edge case: disable all alarm logs and 1 data log
    const disabledConfig: UnifiedConfig = {
      ...multiLogConfig,
      dataLogs: [
        { id: 'log_1', name: 'Trend_Fast', enabled: true },
        { id: 'log_2', name: 'Trend_Slow', enabled: false },
        { id: 'log_3', name: 'Trend_Digital', enabled: true },
      ],
      alarmLogs: multiLogConfig.alarmLogs?.map(a => ({ ...a, enabled: false })),
    };
    const disabledResult = calculateUnified(multiTags, disabledConfig);
    const activeItems = disabledResult.logItems.filter(l => l.enabled && l.totalLogMb > 0);
    assert(activeItems.length === 2, `Multi-Log: Only 2 active data logs should be calculated, got ${activeItems.length}`);
  }

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`========================================`);
}

runAsyncTests().catch(err => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
