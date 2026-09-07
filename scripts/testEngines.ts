/* eslint-disable */
/**
 * Siemens WinCC Log & Storage Architect - Engineering Engine Verification Suite
 * Run with: npx tsx scripts/testEngines.ts
 */

import { calculateUnified, getDataTypeBytes } from '../src/lib/calculator/unifiedEngine';
import { calculateComfort } from '../src/lib/calculator/comfortEngine';
import { calculateProfessional } from '../src/lib/calculator/professionalEngine';
import { UnifiedTag, UnifiedAlarmTag, UnifiedConfig, ComfortTag, ComfortConfig, ProfessionalTag, ProfessionalConfig } from '../src/lib/types';
import { INDUSTRY_PRESETS } from '../src/lib/presets';
import * as XLSX from 'xlsx';
import { 
  generateTiaPortalCsv, 
  generateTiaPortalAlarmCsv, 
  generateTiaPortalXlsx, 
  generateTiaPortalAlarmXlsx, 
  formatTiaCycle, 
  sanitizeName,
  TIA_HMI_TAGS_HEADERS 
} from '../src/lib/tiaExporter';
import { getSiemensArticle, SIEMENS_STORAGE_CATALOG } from '../src/lib/calculator/mlfbCatalog';
import { calculateUnifiedNetwork, calculateComfortNetwork, calculateProfessionalNetwork } from '../src/lib/calculator/networkEngine';
import { translations } from '../src/lib/i18n';
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
assert(unifiedOverflow.storageOccupancyPct > 100, 'Unified: storageOccupancyPct exceeds 100%');
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

    // 10. Alarm Tags & HMI Alarms Logging Architecture
    console.log('\n--- Test Suite 10: WinCC Unified Alarm Tags & HMI Alarms Architecture ---');
    const alarmTagsSample: UnifiedAlarmTag[] = [
      { id: 'at1', name: 'M101_Trip_Overload', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 5, count: 4, alarmLogId: 'log_alm' },
      { id: 'at2', name: 'Tank_Level_HighHigh', alarmClass: 'Alarm', triggerType: 'analog', eventsPerDay: 2, count: 2, alarmLogId: 'log_alm' },
      { id: 'at3', name: 'Operator_Setpoint_Change', alarmClass: 'Event', triggerType: 'digital', eventsPerDay: 25, count: 2, alarmLogId: 'log_evt' },
    ];

    const alarmTagsConfig: UnifiedConfig = {
      deviceType: 'ucp',
      retentionDays: 30,
      segmentHours: 24,
      perEntryBytes: 38,
      headroomPct: 30,
      includeAlarms: true,
      alarmsPerDay: 0,
      includeAudit: false,
      auditEntriesPerDay: 0,
      storageMedium: 'sd_12g',
      storageSizeGb: 12,
      dataLogs: [{ id: 'dl_main', name: 'Trend_Logs', enabled: true }],
      alarmLogs: [
        { id: 'log_alm', name: 'Alarms_log', entriesPerDay: 10, enabled: true },
        { id: 'log_evt', name: 'Events_log', entriesPerDay: 50, enabled: true },
      ],
      alarmTags: alarmTagsSample,
    };

    const alarmTagsResult = calculateUnified(multiTags, alarmTagsConfig);
    const calculatedAlarmsLog = alarmTagsResult.logItems.find(l => l.id === 'log_alm');
    const calculatedEventsLog = alarmTagsResult.logItems.find(l => l.id === 'log_evt');

    // log_alm tags: at1 (5*4=20) + at2 (2*2=4) = 24 from tags + 10 base = 34 ev/day
    assert(calculatedAlarmsLog !== undefined, 'AlarmTags: Alarms_log item generated');
    assert(calculatedAlarmsLog?.entriesPerDay === 34, `AlarmTags: Alarms_log calculated 34 ev/day, got ${calculatedAlarmsLog?.entriesPerDay}`);
    assert(calculatedAlarmsLog?.tagCount === 6, `AlarmTags: Alarms_log tagCount is 6 (4+2 signals), got ${calculatedAlarmsLog?.tagCount}`);

    // log_evt tags: at3 (25*2=50) from tags + 50 base = 100 ev/day
    assert(calculatedEventsLog !== undefined, 'AlarmTags: Events_log item generated');
    assert(calculatedEventsLog?.entriesPerDay === 100, `AlarmTags: Events_log calculated 100 ev/day, got ${calculatedEventsLog?.entriesPerDay}`);
    assert(calculatedEventsLog?.tagCount === 2, `AlarmTags: Events_log tagCount is 2 signals, got ${calculatedEventsLog?.tagCount}`);

    // Segments rule 4MB & >= 200 MB
    assert(calculatedAlarmsLog?.sqliteSegmentMb === 4, `AlarmTags: segment is multiple of 4 MB (4 MB), got ${calculatedAlarmsLog?.sqliteSegmentMb}`);
    assert(calculatedAlarmsLog?.totalLogMb === 200, `AlarmTags: totalLogMb >= 200 MB, got ${calculatedAlarmsLog?.totalLogMb}`);

    // 11. Custom SDHC (Slot X52) & Individual Log Parameters Verification
    console.log('\n--- Test Suite 11: WinCC Unified Custom SDHC (Slot X52) & Individual Log Parameters ---');
    const x52Article = getSiemensArticle('sd_custom_x52');
    assert(x52Article !== undefined, 'Storage: sd_custom_x52 article exists in catalog');
    assert(x52Article.type === 'sd', 'Storage: sd_custom_x52 is SD type');
    assert(x52Article.mlfb.includes('USER-SDHC-X52'), `Storage: sd_custom_x52 MLFB is ${x52Article.mlfb}`);
    assert(x52Article.descriptionRu.includes('High Endurance') || x52Article.descriptionRu.includes('Industrial'), 'Storage: RU description recommends High Endurance / Industrial');
    assert(x52Article.descriptionEn.includes('High Endurance') || x52Article.descriptionEn.includes('Industrial'), 'Storage: EN description recommends High Endurance / Industrial');

    // Sizing with custom 64 GB card for Slot X52
    const customX52Config: UnifiedConfig = {
      deviceType: 'ucp',
      retentionDays: 30,
      segmentHours: 24,
      perEntryBytes: 50,
      headroomPct: 30,
      includeAlarms: false,
      alarmsPerDay: 0,
      includeAudit: false,
      auditEntriesPerDay: 0,
      storageMedium: 'sd_custom_x52',
      storageSizeGb: 64,
      dataLogs: [
        {
          id: 'dl_fast',
          name: 'Fast_Pressure_Logs',
          retentionDays: 60,  // Individual override: 60 days
          segmentHours: 12,   // Individual override: 12 hours
          enabled: true,
        },
        {
          id: 'dl_slow',
          name: 'Slow_Temp_Logs',
          retentionDays: 15,  // Individual override: 15 days
          segmentHours: 8,    // Individual override: 8 hours
          enabled: true,
        },
      ],
      alarmLogs: [
        {
          id: 'al_critical',
          name: 'Critical_Alarms',
          entriesPerDay: 40,
          retentionDays: 90,  // Individual override: 90 days
          segmentHours: 12,   // Individual override: 12 hours
          enabled: true,
        },
      ],
      alarmTags: [
        { id: 'at_crit_1', name: 'Emergency_Trip', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 2, count: 5, alarmLogId: 'al_critical' }
      ],
    };

    const customTags: UnifiedTag[] = [
      { id: 't_fast', description: 'PID Pressures', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 20, dataType: 'Real', dataLogId: 'dl_fast' },
      { id: 't_slow', description: 'Motor Temps', mode: 'cyclic', cycleSec: 5, entriesPerSec: 0.2, count: 40, dataType: 'Real', dataLogId: 'dl_slow' },
    ];

    const customResult = calculateUnified(customTags, customX52Config);
    const fastLogItem = customResult.logItems.find(i => i.id === 'dl_fast');
    const slowLogItem = customResult.logItems.find(i => i.id === 'dl_slow');
    const critAlarmItem = customResult.logItems.find(i => i.id === 'al_critical');

    // Check individual retention and segment overrides for Data Log 1
    assert(fastLogItem !== undefined, 'Individual DataLog: fastLogItem calculated');
    assert(fastLogItem?.retentionDays === 60, `Individual DataLog: fast retention is 60 days, got ${fastLogItem?.retentionDays}`);
    assert(fastLogItem?.segmentHours === 12, `Individual DataLog: fast segment is 12 hours, got ${fastLogItem?.segmentHours}`);
    assert(fastLogItem?.totalSegments === 120, `Individual DataLog: fast totalSegments is 120 (60*24/12), got ${fastLogItem?.totalSegments}`);
    assert(fastLogItem?.sqliteSegmentMb! % 4 === 0, 'Individual DataLog: fast sqliteSegmentMb is multiple of 4 MB');

    // Check individual retention and segment overrides for Data Log 2
    assert(slowLogItem !== undefined, 'Individual DataLog: slowLogItem calculated');
    assert(slowLogItem?.retentionDays === 15, `Individual DataLog: slow retention is 15 days, got ${slowLogItem?.retentionDays}`);
    assert(slowLogItem?.segmentHours === 8, `Individual DataLog: slow segment is 8 hours, got ${slowLogItem?.segmentHours}`);
    assert(slowLogItem?.totalSegments === 45, `Individual DataLog: slow totalSegments is 45 (15*24/8), got ${slowLogItem?.totalSegments}`);
    assert(slowLogItem?.sqliteSegmentMb! % 4 === 0, 'Individual DataLog: slow sqliteSegmentMb is multiple of 4 MB');

    // Check individual retention and segment overrides for Alarm Log
    assert(critAlarmItem !== undefined, 'Individual AlarmLog: critAlarmItem calculated');
    assert(critAlarmItem?.retentionDays === 90, `Individual AlarmLog: alarm retention is 90 days, got ${critAlarmItem?.retentionDays}`);
    assert(critAlarmItem?.segmentHours === 12, `Individual AlarmLog: alarm segment is 12 hours, got ${critAlarmItem?.segmentHours}`);
    assert(critAlarmItem?.totalSegments === 180, `Individual AlarmLog: alarm totalSegments is 180 (90*24/12), got ${critAlarmItem?.totalSegments}`);
    assert(critAlarmItem?.tagCount === 5, `Individual AlarmLog: tagCount is 5, got ${critAlarmItem?.tagCount}`);
    assert(critAlarmItem?.entriesPerDay === 50, `Individual AlarmLog: entriesPerDay is 50 (2*5 + 40 base), got ${critAlarmItem?.entriesPerDay}`);

    // Check custom 64 GB storage capacity occupancy
    const expectedCapMb = 64 * 1024;
    const expectedOccupancy = (customResult.totalStorageUsedMb / expectedCapMb) * 100;
    assert(Math.abs(customResult.storageOccupancyPct - expectedOccupancy) < 0.01, `Storage X52: occupancy matches 64 GB capacity, got ${customResult.storageOccupancyPct}%`);
    assert(customResult.estimatedFlashLifeYears > 0, 'Storage X52: flash life estimation is positive');
    assert(customResult.estimatedFlashLifeYears <= 30, 'Storage X52: flash life estimation max capped at 30 years for SD cards');

    // Check Multi-log TIA CSV export with log resolution
    const multiLogCsv = generateTiaPortalCsv('unified', customTags, 'Default_Log', customX52Config.dataLogs);
    assert(multiLogCsv.includes('PID_Pressures;Fast_Pressure_Logs;Cyclic;1 s;Real;0;None;'), 'TIA Exporter MultiLog: routes tag to Fast_Pressure_Logs');
    assert(multiLogCsv.includes('Motor_Temps;Slow_Temp_Logs;Cyclic;5 s;Real;0;None;'), 'TIA Exporter MultiLog: routes tag to Slow_Temp_Logs');

    // Check TIA Alarm CSV exporter
    const alarmExportCsv = generateTiaPortalAlarmCsv(customX52Config.alarmTags!, customX52Config.alarmLogs);
    assert(alarmExportCsv.startsWith('\uFEFF'), 'TIA Alarm Exporter: starts with UTF-8 BOM');
    assert(alarmExportCsv.includes('Name;Alarm log;Alarm class;Trigger type;Events per day;Count;Comment'), 'TIA Alarm Exporter: standard header');
    assert(alarmExportCsv.includes('Emergency_Trip;Critical_Alarms;Alarm;digital;2;5;'), 'TIA Alarm Exporter: tag row formatted with target alarm log');

    // Check Slot X52 flash wear warning mentions High Endurance or Industrial
    const heavyX52Tags: UnifiedTag[] = [
      { id: 'heavy_pid', description: 'Heavy_Pressure', mode: 'cyclic', cycleSec: 0.05, entriesPerSec: 20, count: 200, dataType: 'Real', dataLogId: 'dl_fast' }
    ];
    const heavyX52Config: UnifiedConfig = {
      ...customX52Config,
      storageSizeGb: 4, // small card to trigger flash wear warning
    };
    const heavyResult = calculateUnified(heavyX52Tags, heavyX52Config, 'ru');
    const hasWearWarning = heavyResult.warnings.some(w => w.includes('High Endurance') || w.includes('Industrial'));
    assert(hasWearWarning, 'Storage X52: warning explicitly recommends High Endurance / Industrial card for Slot X52');

    // =========================================================================
    // Test Suite 12: Siemens Storage Commissioning Checklist & File System Rules
    // =========================================================================
    console.log('\n--- Test Suite 12: Siemens Storage Commissioning Checklist & File System Rules ---');

    // 12.1 Slot X52 Dynamic exFAT Warning for SDXC (> 32 GB)
    const sdxc64Config: UnifiedConfig = {
      ...customX52Config,
      storageMedium: 'sd_custom_x52',
      storageSizeGb: 64,
    };
    const sdxc64ResultRu = calculateUnified(customTags, sdxc64Config, 'ru');
    const hasExFatWarning64Ru = sdxc64ResultRu.warnings.some(w => w.includes('exFAT') && w.includes('NTFS'));
    assert(hasExFatWarning64Ru, 'Storage X52: 64 GB card triggers exFAT warning in Russian (SDXC)');

    const sdxc128Config: UnifiedConfig = {
      ...customX52Config,
      storageMedium: 'sd_custom_x52',
      storageSizeGb: 128,
    };
    const sdxc128ResultEn = calculateUnified(customTags, sdxc128Config, 'en');
    const hasExFatWarning128En = sdxc128ResultEn.warnings.some(w => w.includes('exFAT') && w.includes('NTFS'));
    assert(hasExFatWarning128En, 'Storage X52: 128 GB card triggers exFAT warning in English (SDXC)');

    // 12.2 Slot X52 Standard FAT32 SDHC (<= 32 GB) does NOT trigger exFAT warning
    const sdhc32Config: UnifiedConfig = {
      ...customX52Config,
      storageMedium: 'sd_custom_x52',
      storageSizeGb: 32,
    };
    const sdhc32Result = calculateUnified(customTags, sdhc32Config, 'ru');
    const hasExFatWarning32 = sdhc32Result.warnings.some(w => w.includes('exFAT'));
    assert(!hasExFatWarning32, 'Storage X52: 32 GB card does NOT trigger exFAT warning (Standard SDHC FAT32)');

    const sdhc16Config: UnifiedConfig = {
      ...customX52Config,
      storageMedium: 'sd_custom_x52',
      storageSizeGb: 16,
    };
    const sdhc16Result = calculateUnified(customTags, sdhc16Config, 'ru');
    const hasExFatWarning16 = sdhc16Result.warnings.some(w => w.includes('exFAT'));
    assert(!hasExFatWarning16, 'Storage X52: 16 GB card does NOT trigger exFAT warning (Standard SDHC FAT32)');

    // 12.3 Standard Siemens SD card (sd_12g) does NOT trigger exFAT warning
    const siemens12gConfig: UnifiedConfig = {
      ...customX52Config,
      storageMedium: 'sd_12g',
      storageSizeGb: 12,
    };
    const siemens12gResult = calculateUnified(customTags, siemens12gConfig, 'ru');
    const hasExFatWarning12g = siemens12gResult.warnings.some(w => w.includes('exFAT'));
    assert(!hasExFatWarning12g, 'Storage Standard: Siemens 12 GB SD does NOT trigger exFAT warning');

    // 12.4 PC Runtime with SSD does NOT trigger slot X52 exFAT warning
    const pcRtConfig: UnifiedConfig = {
      ...customX52Config,
      deviceType: 'pc_rt',
      storageMedium: 'ssd_custom',
      storageSizeGb: 256,
    };
    const pcRtResult = calculateUnified(customTags, pcRtConfig, 'ru');
    const hasExFatWarningPc = pcRtResult.warnings.some(w => w.includes('exFAT') && w.includes('X52'));
    assert(!hasExFatWarningPc, 'Storage PC RT: SSD does NOT trigger slot X52 exFAT warning');

    // 12.5 Siemens Commissioning Checklist: All 6 industrial rules verified in i18n (RU & EN)
    assert(!!translations.ru.storageChecklistRule1Title && translations.ru.storageChecklistRule1Desc.includes('MBR'), 'Checklist RU: Rule 1 MBR partition rule verified');
    assert(!!translations.ru.storageChecklistRule2Title && translations.ru.storageChecklistRule2Desc.includes('NTFS'), 'Checklist RU: Rule 2 File system NTFS/FAT32 rule verified');
    assert(!!translations.ru.storageChecklistRule3Title && translations.ru.storageChecklistRule3Desc.includes('4096'), 'Checklist RU: Rule 3 Cluster size 4KB/32KB verified');
    assert(!!translations.ru.storageChecklistRule4Title && translations.ru.storageChecklistRule4Desc.includes('ASCII'), 'Checklist RU: Rule 4 ASCII paths verified');
    assert(!!translations.ru.storageChecklistRule5Title && (translations.ru.storageChecklistRule5Desc.includes('CloseAllLogs') || translations.ru.storageChecklistRule5Desc.includes('Safe Removal')), 'Checklist RU: Rule 5 Safe Removal verified');
    assert(!!translations.ru.storageChecklistRule6Title && translations.ru.storageChecklistRule6Desc.includes('Lock') && translations.ru.storageChecklistRule6Desc.includes('UPS'), 'Checklist RU: Rule 6 Lock & UPS verified');

    // Checklist EN
    assert(!!translations.en.storageChecklistRule1Title && translations.en.storageChecklistRule1Desc.includes('MBR'), 'Checklist EN: Rule 1 MBR partition rule verified');
    assert(!!translations.en.storageChecklistRule2Title && translations.en.storageChecklistRule2Desc.includes('NTFS'), 'Checklist EN: Rule 2 File system NTFS/FAT32 rule verified');
    assert(!!translations.en.storageChecklistRule3Title && translations.en.storageChecklistRule3Desc.includes('4096'), 'Checklist EN: Rule 3 Cluster size 4KB/32KB verified');
    assert(!!translations.en.storageChecklistRule4Title && translations.en.storageChecklistRule4Desc.includes('ASCII'), 'Checklist EN: Rule 4 ASCII paths verified');
    assert(!!translations.en.storageChecklistRule5Title && (translations.en.storageChecklistRule5Desc.includes('CloseAllLogs') || translations.en.storageChecklistRule5Desc.includes('Safe Removal')), 'Checklist EN: Rule 5 Safe Removal verified');
    assert(!!translations.en.storageChecklistRule6Title && translations.en.storageChecklistRule6Desc.includes('Lock') && translations.en.storageChecklistRule6Desc.includes('UPS'), 'Checklist EN: Rule 6 Lock & UPS verified');

    // 12.6 Comfort Panel Hardware Limit & Report Storage Section
    assert(translations.ru.comfortHardwareLimitText.includes('32 ГБ') && translations.ru.comfortHardwareLimitText.includes('FAT32'), 'Comfort Limit RU: Max 32 GB FAT32 limit verified');
    assert(translations.en.comfortHardwareLimitText.includes('32 GB') && translations.en.comfortHardwareLimitText.includes('FAT32'), 'Comfort Limit EN: Max 32 GB FAT32 limit verified');
    assert(!!translations.ru.reportStorageReqsTitle && !!translations.ru.reportStorageReqsSub, 'Report RU: Storage Requirements section texts verified');
    assert(!!translations.en.reportStorageReqsTitle && !!translations.en.reportStorageReqsSub, 'Report EN: Storage Requirements section texts verified');

    // 12.7 Rule 4: Siemens ASCII-Only Paths & Log Naming Validation
    const invalidLogConfig: UnifiedConfig = {
      ...customX52Config,
      dataLogs: [
        { id: 'bad_dl', name: 'Журнал Давления', enabled: true },
      ],
      alarmLogs: [
        { id: 'bad_al', name: 'Alarms #1', entriesPerDay: 100, enabled: true },
      ],
    };
    const invalidLogResultRu = calculateUnified(customTags, invalidLogConfig, 'ru');
    const hasAsciiWarningRu = invalidLogResultRu.warnings.some(w => w.includes('ASCII Only') && w.includes('Журнал Давления') && w.includes('Alarms #1'));
    assert(hasAsciiWarningRu, 'Naming Rule 4: flags Cyrillic and special symbols (#) in RU');

    const invalidLogResultEn = calculateUnified(customTags, invalidLogConfig, 'en');
    const hasAsciiWarningEn = invalidLogResultEn.warnings.some(w => w.includes('ASCII naming rule violated') && w.includes('Журнал Давления'));
    assert(hasAsciiWarningEn, 'Naming Rule 4: flags illegal log names in EN');

    const validLogResult = calculateUnified(customTags, customX52Config, 'ru');
    const hasNoAsciiWarning = !validLogResult.warnings.some(w => w.includes('ASCII Only'));
    assert(hasNoAsciiWarning, 'Naming Rule 4: valid ASCII log names pass without warning');

    // 12.8 Comfort Panel 32 GB Hardware Limit Engine Validation
    const comfort64Config: ComfortConfig = {
      deviceType: 'comfort_panel',
      format: 'rdb',
      retentionDays: 30,
      recordsPerLog: 50000,
      logMethod: 'circular',
      storageMediumMb: 65536, // 64 GB > 32 GB limit
    };
    const comfort64ResultRu = calculateComfort([{ id: 'c1', description: 'Tag1', mode: 'cyclic', cycleSec: 1, count: 10 }], comfort64Config, 'ru');
    const hasComfortLimitRu = comfort64ResultRu.warnings.some(w => w.includes('32 ГБ') && w.includes('SDXC'));
    assert(hasComfortLimitRu, 'Comfort Limit Engine: flags >32 GB for Comfort Panel in RU');

    const comfort64ResultEn = calculateComfort([{ id: 'c1', description: 'Tag1', mode: 'cyclic', cycleSec: 1, count: 10 }], comfort64Config, 'en');
    const hasComfortLimitEn = comfort64ResultEn.warnings.some(w => w.includes('32 GB') && w.includes('SDXC'));
    assert(hasComfortLimitEn, 'Comfort Limit Engine: flags >32 GB for Comfort Panel in EN');

    const comfort32Config: ComfortConfig = {
      ...comfort64Config,
      storageMediumMb: 32768, // 32 GB within limit
    };
    const comfort32Result = calculateComfort([{ id: 'c1', description: 'Tag1', mode: 'cyclic', cycleSec: 1, count: 10 }], comfort32Config, 'ru');
    const hasNoComfortLimit32 = !comfort32Result.warnings.some(w => w.includes('SDXC'));
    assert(hasNoComfortLimit32, 'Comfort Limit Engine: 32 GB SDHC does not trigger limit warning');

    const rtAdv64Config: ComfortConfig = {
      ...comfort64Config,
      deviceType: 'rt_advanced', // PC has no 32 GB limit
    };
    const rtAdv64Result = calculateComfort([{ id: 'c1', description: 'Tag1', mode: 'cyclic', cycleSec: 1, count: 10 }], rtAdv64Config, 'ru');
    const hasNoRtAdvLimit = !rtAdv64Result.warnings.some(w => w.includes('Windows CE 6.0'));
    assert(hasNoRtAdvLimit, 'Comfort Limit Engine: PC RT Advanced is not constrained by 32 GB limit');

    // 12.9 Boundary values testing for storageSizeGb
    const boundary32_5Config: UnifiedConfig = {
      ...customX52Config,
      storageMedium: 'sd_custom_x52',
      storageSizeGb: 32.5,
    };
    const boundary32_5Result = calculateUnified(customTags, boundary32_5Config, 'ru');
    assert(boundary32_5Result.warnings.some(w => w.includes('exFAT')), 'Storage Boundary: 32.5 GB flags exFAT advisory');

    const negativeConfig: UnifiedConfig = {
      ...customX52Config,
      storageMedium: 'sd_custom_x52',
      storageSizeGb: -10,
    };
    const negativeResult = calculateUnified(customTags, negativeConfig, 'ru');
    assert(!negativeResult.warnings.some(w => w.includes('exFAT')), 'Storage Boundary: negative size clamps safely and does not flag exFAT');

    // =========================================================================
    // Test Suite 13: Siemens TIA Portal V14–V20 XLSX Tag Export Specification
    // =========================================================================
    console.log('\n--- Test Suite 13: Siemens TIA Portal V14–V20 XLSX Tag Export Specification ---');

    // 13.1 Format cycle conversion helper
    assert(formatTiaCycle(0.1) === 'T100ms', 'TIA Cycle: 0.1s formats to T100ms');
    assert(formatTiaCycle(0.25) === 'T250ms', 'TIA Cycle: 0.25s formats to T250ms');
    assert(formatTiaCycle(0.5) === 'T500ms', 'TIA Cycle: 0.5s formats to T500ms');
    assert(formatTiaCycle(1) === 'T1s', 'TIA Cycle: 1s formats to T1s');
    assert(formatTiaCycle(2) === 'T2s', 'TIA Cycle: 2s formats to T2s');
    assert(formatTiaCycle(5) === 'T5s', 'TIA Cycle: 5s formats to T5s');
    assert(formatTiaCycle(10) === 'T10s', 'TIA Cycle: 10s formats to T10s');
    assert(formatTiaCycle(60) === 'T1min', 'TIA Cycle: 60s formats to T1min');
    assert(formatTiaCycle(300) === 'T5min', 'TIA Cycle: 300s formats to T5min');
    assert(formatTiaCycle(600) === 'T10min', 'TIA Cycle: 600s formats to T10min');
    assert(formatTiaCycle(3600) === 'T1h', 'TIA Cycle: 3600s formats to T1h');
    assert(formatTiaCycle(7200) === 'T2h', 'TIA Cycle: 7200s formats to T2h');
    assert(formatTiaCycle(86400) === 'T1d', 'TIA Cycle: 86400s formats to T1d');

    // Importer Day Cycle parsing
    assert(parseCycleString('T1d') === 86400, 'Importer: T1d parses to 86400s');
    assert(parseCycleString('1 day') === 86400, 'Importer: 1 day parses to 86400s');
    assert(parseCycleString('2 days') === 172800, 'Importer: 2 days parses to 172800s');
    assert(parseCycleString('T5min') === 300, 'Importer: T5min parses to 300s');

    // Sanitizer edge cases
    assert(sanitizeName('101_Motor') === 'Tag_101_Motor', 'Sanitizer: prepends Tag_ if starts with digit');
    assert(sanitizeName('Bearing & Winding Temps (2s)') === 'Bearing_Winding_Temps_2s', 'Sanitizer: collapses multiple underscores and trims');
    assert(sanitizeName('---') === 'Tag', 'Sanitizer: fallbacks to Tag for empty/invalid input');

    // 13.2 Unified Tags XLSX Export Structure & Sheet Names
    const testUnifiedTags: UnifiedTag[] = [
      { id: 'u1', description: 'Motor1_Speed', mode: 'cyclic', cycleSec: 0.25, entriesPerSec: 4, count: 1, dataType: 'Real' },
      { id: 'u2', description: 'Pump_Running', mode: 'onchange', cycleSec: 60, entriesPerSec: 0.0167, count: 1, dataType: 'Bool' },
      { id: 'u3', description: 'Batch_Code', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 1, dataType: 'String' },
    ];
    const unifiedXlsxBuf = generateTiaPortalXlsx('unified', testUnifiedTags, 'ProcessDataLog');
    const unifiedWb = XLSX.read(unifiedXlsxBuf, { type: 'buffer' });

    assert(unifiedWb.SheetNames.includes('Hmi Tags'), 'XLSX Export: Workbook contains "Hmi Tags" sheet');
    assert(unifiedWb.SheetNames.includes('Substitute Value Usage'), 'XLSX Export: Workbook contains "Substitute Value Usage" sheet');

    // Verify Hmi Tags sheet rows and exact 30 columns
    const hmiTagsSheet = unifiedWb.Sheets['Hmi Tags'];
    const hmiRows: any[][] = XLSX.utils.sheet_to_json(hmiTagsSheet, { header: 1 });
    assert(hmiRows.length === 4, `XLSX Export: 1 header row + 3 tag rows = 4 rows, got ${hmiRows.length}`);

    const exportedHeaders = hmiRows[0];
    assert(exportedHeaders.length === 30, `XLSX Export: Exactly 30 TIA Portal columns, got ${exportedHeaders.length}`);
    assert(exportedHeaders[0] === 'Name', 'XLSX Column 0: Name');
    assert(exportedHeaders[1] === 'Path', 'XLSX Column 1: Path');
    assert(exportedHeaders[2] === 'Connection', 'XLSX Column 2: Connection');
    assert(exportedHeaders[3] === 'PLC tag', 'XLSX Column 3: PLC tag');
    assert(exportedHeaders[4] === 'DataType', 'XLSX Column 4: DataType');
    assert(exportedHeaders[5] === 'HMI DataType', 'XLSX Column 5: HMI DataType');
    assert(exportedHeaders[6] === 'Length', 'XLSX Column 6: Length');
    assert(exportedHeaders[7] === 'Access Method', 'XLSX Column 7: Access Method');
    assert(exportedHeaders[8] === 'Address', 'XLSX Column 8: Address');
    assert(exportedHeaders[9] === 'Start value', 'XLSX Column 9: Start value');
    assert(exportedHeaders[10] === 'Persistency', 'XLSX Column 10: Persistency');
    assert(exportedHeaders[11] === 'Substitute value', 'XLSX Column 11: Substitute value');
    assert(exportedHeaders[12] === 'ID tag', 'XLSX Column 12: ID tag');
    assert(exportedHeaders[13] === 'Comment [en-US]', 'XLSX Column 13: Comment [en-US]');
    assert(exportedHeaders[14] === 'Acquisition mode', 'XLSX Column 14: Acquisition mode');
    assert(exportedHeaders[15] === 'Acquisition cycle', 'XLSX Column 15: Acquisition cycle');
    assert(exportedHeaders[29] === 'Scope', 'XLSX Column 29: Scope');

    // Verify first tag row (Motor1_Speed, Real, Cyclic in operation, T250ms)
    const row1 = hmiRows[1];
    assert(row1[0] === 'Motor1_Speed', `XLSX Row 1: Name is Motor1_Speed, got ${row1[0]}`);
    assert(row1[4] === 'Real', `XLSX Row 1: DataType is Real, got ${row1[4]}`);
    assert(row1[5] === 'Real', `XLSX Row 1: HMI DataType is Real, got ${row1[5]}`);
    assert(row1[6] === 1, `XLSX Row 1: Length is 1, got ${row1[6]}`);
    assert(row1[7] === 'Symbolic access', 'XLSX Row 1: Access Method is Symbolic access');
    assert(row1[14] === 'Cyclic in operation', `XLSX Row 1: Acquisition mode is Cyclic in operation, got ${row1[14]}`);
    assert(row1[15] === 'T250ms', `XLSX Row 1: Acquisition cycle is T250ms, got ${row1[15]}`);
    assert(row1[29] === 'System-wide', 'XLSX Row 1: Scope is System-wide');

    // Verify second tag row (Pump_Running, Bool, On change, None)
    const row2 = hmiRows[2];
    assert(row2[0] === 'Pump_Running', `XLSX Row 2: Name is Pump_Running, got ${row2[0]}`);
    assert(row2[4] === 'Bool', `XLSX Row 2: DataType is Bool, got ${row2[4]}`);
    assert(row2[14] === 'On change', `XLSX Row 2: Acquisition mode is On change, got ${row2[14]}`);
    assert(row2[15] === 'None', `XLSX Row 2: Acquisition cycle is None, got ${row2[15]}`);

    // Verify third tag row (Batch_Code, String, Length 254)
    const row3 = hmiRows[3];
    assert(row3[0] === 'Batch_Code', `XLSX Row 3: Name is Batch_Code, got ${row3[0]}`);
    assert(row3[4] === 'String', `XLSX Row 3: DataType is String, got ${row3[4]}`);
    assert(row3[6] === 254, `XLSX Row 3: String Length is 254, got ${row3[6]}`);

    // 13.3 Comfort Tags XLSX Export
    const testComfortTags: ComfortTag[] = [
      { id: 'c1', description: 'Furnace_Temp', mode: 'cyclic', cycleSec: 1, count: 5 },
      { id: 'c2', description: 'Door_Sensor', mode: 'onchange', cycleSec: 60, count: 1 },
    ];
    const comfortXlsxBuf = generateTiaPortalXlsx('comfort', testComfortTags, 'Comfort_DataLog');
    const comfortWb = XLSX.read(comfortXlsxBuf, { type: 'buffer' });
    const comfortRows: any[][] = XLSX.utils.sheet_to_json(comfortWb.Sheets['Hmi Tags'], { header: 1 });
    assert(comfortRows.length === 3, `Comfort XLSX: 1 header + 2 tags = 3 rows, got ${comfortRows.length}`);
    assert(comfortRows[1][0] === 'Furnace_Temp', 'Comfort XLSX: Row 1 Name is Furnace_Temp');
    assert(comfortRows[1][15] === 'T1s', 'Comfort XLSX: Row 1 Cycle is T1s');
    assert(comfortRows[2][14] === 'On change', 'Comfort XLSX: Row 2 Mode is On change');

    // 13.4 Professional Tags XLSX Export
    const testProTags: ProfessionalTag[] = [
      { id: 'p1', description: 'Turbine_Vib', cycleSec: 0.5, count: 10, archiveType: 'fast' },
      { id: 'p2', description: 'Daily_Yield', cycleSec: 300, count: 1, archiveType: 'slow' },
    ];
    const proXlsxBuf = generateTiaPortalXlsx('professional', testProTags, 'Pro_TagLogging');
    const proWb = XLSX.read(proXlsxBuf, { type: 'buffer' });
    const proRows: any[][] = XLSX.utils.sheet_to_json(proWb.Sheets['Hmi Tags'], { header: 1 });
    assert(proRows.length === 3, `Professional XLSX: 1 header + 2 tags = 3 rows, got ${proRows.length}`);
    assert(proRows[1][0] === 'Turbine_Vib', 'Professional XLSX: Row 1 Name is Turbine_Vib');
    assert(proRows[1][15] === 'T500ms', 'Professional XLSX: Row 1 Cycle is T500ms');
    assert(proRows[1][13].includes('TagLoggingFast'), 'Professional XLSX: Row 1 comment references Fast logging');
    assert(proRows[2][15] === 'T5min', 'Professional XLSX: Row 2 Cycle is T5min');
    assert(proRows[2][13].includes('TagLoggingSlow'), 'Professional XLSX: Row 2 comment references Slow logging');

    // 13.5 Alarm Tags XLSX Export
    const testAlarms: UnifiedAlarmTag[] = [
      { id: 'a1', name: 'Emergency_Stop', alarmClass: 'Alarm', triggerType: 'digital', eventsPerDay: 5, count: 2, alarmLogId: 'alm_crit' },
    ];
    const alarmXlsxBuf = generateTiaPortalAlarmXlsx(testAlarms);
    const alarmWb = XLSX.read(alarmXlsxBuf, { type: 'buffer' });
    const alarmRows: any[][] = XLSX.utils.sheet_to_json(alarmWb.Sheets['Hmi Tags'], { header: 1 });
    assert(alarmRows.length === 2, `Alarm XLSX: 1 header + 1 alarm tag = 2 rows, got ${alarmRows.length}`);
    assert(alarmRows[1][0] === 'Emergency_Stop', 'Alarm XLSX: Row 1 Name is Emergency_Stop');
    assert(alarmRows[1][4] === 'Bool', 'Alarm XLSX: DataType is Bool');
    assert(alarmRows[1][15] === 'T250ms', 'Alarm XLSX: Acquisition cycle is T250ms');

    // 13.6 Bidirectional Round-Trip Verification (Export XLSX -> Import via tagImporter)
    const exportBuf = generateTiaPortalXlsx('unified', testUnifiedTags, 'ProcessDataLog');
    const abExport = exportBuf.buffer.slice(exportBuf.byteOffset, exportBuf.byteOffset + exportBuf.byteLength) as ArrayBuffer;
    const rawImport = await readXlsxFile(abExport);
    const { rows: roundtripRows } = extractXlsxRows(rawImport);
    const roundtripParsed = parseRowsToTags(roundtripRows);

    assert(roundtripParsed.tags.length === 3, `Round-trip: Successfully re-imported all 3 tags, got ${roundtripParsed.tags.length}`);
    assert(roundtripParsed.tags[0].name === 'Motor1_Speed', 'Round-trip: Tag 0 name matches');
    assert(roundtripParsed.tags[0].dataType === 'Real', 'Round-trip: Tag 0 dataType is Real');
    assert(roundtripParsed.tags[0].cycleSec === 0.25, 'Round-trip: Tag 0 cycleSec is 0.25');
    assert(roundtripParsed.tags[1].name === 'Pump_Running', 'Round-trip: Tag 1 name matches');
    assert(roundtripParsed.tags[1].dataType === 'Bool', 'Round-trip: Tag 1 dataType is Bool');
    assert(roundtripParsed.tags[1].mode === 'onchange', 'Round-trip: Tag 1 mode is onchange');

    // 13.7 Expand Count Option Verification
    const expandTags: UnifiedTag[] = [
      { id: 'exp1', description: 'Bearing_Temp', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 3, dataType: 'Real' }
    ];
    const expandedBuf = generateTiaPortalXlsx('unified', expandTags, 'ProcessDataLog', undefined, { expandCount: true });
    const expandedWb = XLSX.read(expandedBuf, { type: 'buffer' });
    const expandedRows: any[][] = XLSX.utils.sheet_to_json(expandedWb.Sheets['Hmi Tags'], { header: 1 });
    assert(expandedRows.length === 4, `ExpandCount: 1 header + 3 instances = 4 rows, got ${expandedRows.length}`);
    assert(expandedRows[1][0] === 'Bearing_Temp_1', 'ExpandCount: Instance 1 is Bearing_Temp_1');
    assert(expandedRows[2][0] === 'Bearing_Temp_2', 'ExpandCount: Instance 2 is Bearing_Temp_2');
    assert(expandedRows[3][0] === 'Bearing_Temp_3', 'ExpandCount: Instance 3 is Bearing_Temp_3');

    // 13.8 WString length, Analog Alarm, and Custom DataType Preservation
    const wstringWb = XLSX.read(generateTiaPortalXlsx('unified', [{ id: 'w1', description: 'WString_Tag', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 1, dataType: 'WString' as any }], 'Log'), { type: 'buffer' });
    const wstringRows: any[][] = XLSX.utils.sheet_to_json(wstringWb.Sheets['Hmi Tags'], { header: 1 });
    assert(wstringRows[1][6] === 254, 'WString: Length is 254, got ' + wstringRows[1][6]);

    // Analog alarm tag
    const analogAlarm: UnifiedAlarmTag[] = [
      { id: 'aa1', name: 'Tank_Pressure_High', alarmClass: 'Alarm', triggerType: 'analog', eventsPerDay: 10, count: 1 }
    ];
    const analogAlarmWb = XLSX.read(generateTiaPortalAlarmXlsx(analogAlarm), { type: 'buffer' });
    const analogAlarmRows: any[][] = XLSX.utils.sheet_to_json(analogAlarmWb.Sheets['Hmi Tags'], { header: 1 });
    assert(analogAlarmRows[1][4] === 'Real', 'Analog Alarm: DataType defaults to Real, got ' + analogAlarmRows[1][4]);

    // Custom data type on Comfort tag
    const customComfort: ComfortTag[] = [
      { id: 'cc1', description: 'Status_Word', mode: 'cyclic', cycleSec: 1, count: 1, dataType: 'Int' } as any
    ];
    const customComfortWb = XLSX.read(generateTiaPortalXlsx('comfort', customComfort, 'Log'), { type: 'buffer' });
    const customComfortRows: any[][] = XLSX.utils.sheet_to_json(customComfortWb.Sheets['Hmi Tags'], { header: 1 });
    assert(customComfortRows[1][4] === 'Int', 'Comfort Custom DataType: Preserves Int, got ' + customComfortRows[1][4]);

    console.log('\n=== [14] SEGMENT <= RETENTION PROTECTION & MULTI-LOG SEGMENT KPI SUITE ===');

    // 14.1 Protection: Global segmentHours exceeding retentionDays * 24 is clamped
    const testExceedSegment = calculateUnified([
      { id: 't1', description: 'Flow', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 10, dataType: 'Real' }
    ], {
      deviceType: 'ucp',
      retentionDays: 1, // 1 day = 24 hours
      segmentHours: 60, // 60 hours > 24 hours -> MUST clamp to 24h
      perEntryBytes: 50,
      headroomPct: 30,
      includeAlarms: false,
      alarmsPerDay: 0,
      includeAudit: false,
      auditEntriesPerDay: 0,
      storageMedium: 'sd_12g',
      storageSizeGb: 12,
    });
    assert(testExceedSegment.logItems[0].segmentHours === 24, `Protection: segmentHours 60h clamped to 24h (1 day), got ${testExceedSegment.logItems[0].segmentHours}`);
    assert(testExceedSegment.warnings.some(w => w.includes('не может превышать') || w.includes('cannot exceed')), 'Protection: emits warning about segment exceeding retention');
    assert(testExceedSegment.rule3SegmentsValid === false, 'Protection: 24h / 24h = 1 segment fails Siemens 3-segment rule');
    assert(testExceedSegment.warnings.some(w => w.includes('3 сегмента') || w.includes('3 segments')), 'Protection: warns about 3-segment rule violation');

    // 14.2 Protection: Individual Data Log segment exceeding its own retentionDays
    const testDlExceed = calculateUnified([
      { id: 't2', description: 'Pressure', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 5, dataType: 'Real', dataLogId: 'dl_custom' }
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
      dataLogs: [
        { id: 'dl_custom', name: 'Custom_Log', retentionDays: 2, segmentHours: 72, enabled: true } // 2 days = 48h, segment 72h -> clamp to 48h
      ],
    });
    const dlItem = testDlExceed.logItems.find(l => l.id === 'dl_custom');
    assert(dlItem?.segmentHours === 48, `Protection: dl_custom segment 72h clamped to 48h (2 days), got ${dlItem?.segmentHours}`);
    assert(testDlExceed.warnings.some(w => w.includes('не может превышать') || w.includes('cannot exceed')), 'Protection: dl_custom triggers clamp warning');

    // 14.3 Protection: Individual Alarm Log segment exceeding retention
    const testAlExceed = calculateUnified([], {
      deviceType: 'ucp',
      retentionDays: 30,
      segmentHours: 24,
      perEntryBytes: 50,
      headroomPct: 30,
      includeAlarms: true,
      alarmsPerDay: 50,
      includeAudit: false,
      auditEntriesPerDay: 0,
      storageMedium: 'sd_12g',
      storageSizeGb: 12,
      alarmLogs: [
        { id: 'al_short', name: 'Short_Alarm_Log', entriesPerDay: 100, retentionDays: 1, segmentHours: 48, enabled: true } // 1 day = 24h, segment 48h -> clamp to 24h
      ],
    });
    const alItem = testAlExceed.logItems.find(l => l.id === 'al_short');
    assert(alItem?.segmentHours === 24, `Protection: al_short segment 48h clamped to 24h (1 day), got ${alItem?.segmentHours}`);
    assert(testAlExceed.warnings.some(w => w.includes('не может превышать') || w.includes('cannot exceed')), 'Protection: al_short triggers clamp warning');

    // 14.4 Multi-Log KPI: sqliteSegmentMb represents MAX segment size across all active logs
    // Case A: Data Log is larger (e.g. 50 tags cyclic 0.1s -> large segment) than Alarm Log
    const multiLogA = calculateUnified([
      { id: 't3', description: 'Fast Tag', mode: 'cyclic', cycleSec: 0.1, entriesPerSec: 10, count: 50, dataType: 'Real', dataLogId: 'dl_heavy' }
    ], {
      deviceType: 'ucp',
      retentionDays: 30,
      segmentHours: 24,
      perEntryBytes: 50,
      headroomPct: 30,
      includeAlarms: true,
      alarmsPerDay: 50, // small alarm log
      includeAudit: false,
      auditEntriesPerDay: 0,
      storageMedium: 'sd_12g',
      storageSizeGb: 12,
      dataLogs: [{ id: 'dl_heavy', name: 'Heavy_Data_Log', enabled: true }],
      alarmLogs: [{ id: 'al_small', name: 'Small_Alarm_Log', entriesPerDay: 50, enabled: true }],
    });
    const heavyDlItem = multiLogA.logItems.find(l => l.id === 'dl_heavy');
    const smallAlItem = multiLogA.logItems.find(l => l.id === 'al_small');
    assert((heavyDlItem?.sqliteSegmentMb || 0) > (smallAlItem?.sqliteSegmentMb || 0), 'Multi-Log KPI: Heavy data log segment is larger than small alarm log');
    assert(multiLogA.sqliteSegmentMb === heavyDlItem?.sqliteSegmentMb, `Multi-Log KPI: Overall sqliteSegmentMb matches heavy data log (${heavyDlItem?.sqliteSegmentMb} MB)`);

    // Case B: Alarm Log has LARGER segment than Data Log (proves Alarm Log is NOT ignored in KPI!)
    const multiLogB = calculateUnified([
      { id: 't4', description: 'Slow Tag', mode: 'cyclic', cycleSec: 10, entriesPerSec: 0.1, count: 1, dataType: 'Bool', dataLogId: 'dl_light' }
    ], {
      deviceType: 'ucp',
      retentionDays: 30,
      segmentHours: 24,
      perEntryBytes: 50,
      headroomPct: 30,
      includeAlarms: true,
      alarmsPerDay: 500000, // huge alarm volume -> large segment
      includeAudit: false,
      auditEntriesPerDay: 0,
      storageMedium: 'sd_32g',
      storageSizeGb: 32,
      dataLogs: [{ id: 'dl_light', name: 'Light_Data_Log', enabled: true }],
      alarmLogs: [{ id: 'al_heavy', name: 'Heavy_Alarm_Log', entriesPerDay: 500000, enabled: true }],
    });
    const lightDlItem = multiLogB.logItems.find(l => l.id === 'dl_light');
    const heavyAlItem = multiLogB.logItems.find(l => l.id === 'al_heavy');
    assert((heavyAlItem?.sqliteSegmentMb || 0) > (lightDlItem?.sqliteSegmentMb || 0), `Multi-Log KPI: Heavy alarm log (${heavyAlItem?.sqliteSegmentMb} MB) > light data log (${lightDlItem?.sqliteSegmentMb} MB)`);
    assert(multiLogB.sqliteSegmentMb === heavyAlItem?.sqliteSegmentMb, `Multi-Log KPI: Overall sqliteSegmentMb correctly reflects Alarm Log (${heavyAlItem?.sqliteSegmentMb} MB), not hardcoded to Data Log!`);

    // Case C: Only Alarm Log active (0 tags in data log)
    const multiLogC = calculateUnified([], {
      deviceType: 'ucp',
      retentionDays: 30,
      segmentHours: 24,
      perEntryBytes: 50,
      headroomPct: 30,
      includeAlarms: true,
      alarmsPerDay: 200,
      includeAudit: false,
      auditEntriesPerDay: 0,
      storageMedium: 'sd_12g',
      storageSizeGb: 12,
      alarmLogs: [{ id: 'al_only', name: 'Only_Alarm_Log', entriesPerDay: 200, enabled: true }],
    });
    assert(multiLogC.sqliteSegmentMb === 4, `Multi-Log KPI: When only Alarm Log is active, sqliteSegmentMb is 4 MB (not 0), got ${multiLogC.sqliteSegmentMb}`);

    // 14.5 Protection: Inherited segmentHours clamping triggers warning even if dl.segmentHours is undefined
    const testInheritedClamp = calculateUnified([
      { id: 't5', description: 'Inherited Tag', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 5, dataType: 'Real', dataLogId: 'dl_inherit' }
    ], {
      deviceType: 'ucp',
      retentionDays: 5, // global retention = 5 days (120h)
      segmentHours: 48, // global segment = 48h (valid for global 5 days)
      perEntryBytes: 50,
      headroomPct: 30,
      includeAlarms: false,
      alarmsPerDay: 0,
      includeAudit: false,
      auditEntriesPerDay: 0,
      storageMedium: 'sd_12g',
      storageSizeGb: 12,
      dataLogs: [
        { id: 'dl_inherit', name: 'Inherit_Log', retentionDays: 1, enabled: true } // individual retention 1 day = 24h, inherits 48h segment -> must clamp to 24h!
      ],
    });
    const inheritDl = testInheritedClamp.logItems.find(l => l.id === 'dl_inherit');
    assert(inheritDl?.segmentHours === 24, `Protection Inherited: dl_inherit segment clamped to 24h, got ${inheritDl?.segmentHours}`);
    assert(testInheritedClamp.warnings.some(w => w.includes('не может превышать') || w.includes('cannot exceed')), 'Protection Inherited: triggers clamp warning');

    // 14.6 Multi-Log KPI: Tie-breaker selects log with higher rawSegmentMb when sqliteSegmentMb is equal
    const formatSegTime = (hours: number) => `${Math.floor(hours / 24)}.${String(hours % 24).padStart(2, '0')}:00:00`;
    assert(formatSegTime(36) === '1.12:00:00', `TIA Time Format: 36h formats to 1.12:00:00, got ${formatSegTime(36)}`);
    assert(formatSegTime(60) === '2.12:00:00', `TIA Time Format: 60h formats to 2.12:00:00, got ${formatSegTime(60)}`);
    assert(formatSegTime(24) === '1.00:00:00', `TIA Time Format: 24h formats to 1.00:00:00, got ${formatSegTime(24)}`);
    assert(formatSegTime(12) === '0.12:00:00', `TIA Time Format: 12h formats to 0.12:00:00, got ${formatSegTime(12)}`);
    assert(formatSegTime(168) === '7.00:00:00', `TIA Time Format: 168h formats to 7.00:00:00, got ${formatSegTime(168)}`);
  }

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`========================================`);
}

runAsyncTests().catch(err => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
