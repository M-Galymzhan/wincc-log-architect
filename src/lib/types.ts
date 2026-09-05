export type Language = 'ru' | 'en';
export type Theme = 'dark' | 'light';
export type ActiveTab = 'unified' | 'comfort' | 'professional';

// WINCC UNIFIED
export type UnifiedDeviceType = 'ucp' | 'pc_rt';

export interface UnifiedTag {
  id: string;
  description: string;
  mode: 'cyclic' | 'onchange';
  cycleSec: number;
  entriesPerSec: number;
  count: number;
  dataType: 'Real' | 'LReal' | 'DInt' | 'Int' | 'Bool' | 'String';
}

export interface UnifiedConfig {
  deviceType: UnifiedDeviceType;
  retentionDays: number;
  segmentHours: number;
  perEntryBytes: number;
  headroomPct: number;
  includeAlarms: boolean;
  alarmsPerDay: number;
  includeAudit: boolean;
  auditEntriesPerDay: number;
  storageMedium: 'sd_512m' | 'sd_2g' | 'sd_12g' | 'sd_32g' | 'usb_128g' | 'ssd_custom';
  storageSizeGb: number;
}

export interface UnifiedResult {
  totalTags: number;
  totalEntriesPerSec: number;
  entriesPerDay: number;
  rawSegmentMb: number;
  sqliteSegmentMb: number;
  totalSegments: number;
  totalLogMb: number;
  totalLogGb: number;
  trafficStatus: 'safe' | 'warning' | 'critical';
  rule3SegmentsValid: boolean;
  storageOccupancyPct: number;
  estimatedFlashLifeYears: number;
  warnings: string[];
}

// WINCC COMFORT / ADVANCED
export type ComfortDeviceType = 'comfort_panel' | 'rt_advanced';
export type ComfortLogFormat = 'rdb' | 'csv';

export interface ComfortTag {
  id: string;
  description: string;
  mode: 'cyclic' | 'onchange';
  cycleSec: number;
  count: number;
}

export interface ComfortConfig {
  deviceType: ComfortDeviceType;
  format: ComfortLogFormat;
  retentionDays: number;
  recordsPerLog: number;
  logMethod: 'circular' | 'segmented';
  storageMediumMb: number;
}

export interface ComfortResult {
  totalTags: number;
  entriesPerSec: number;
  recordsPerDay: number;
  totalRecordsForPeriod: number;
  recommendedLogFiles: number;
  fileSizeMb: number;
  totalArchiveSizeMb: number;
  totalArchiveSizeGb: number;
  storageOccupancyPct: number;
  warnings: string[];
}

// WINCC PROFESSIONAL
export type SqlServerEdition = 'express' | 'standard_enterprise';

export interface ProfessionalTag {
  id: string;
  description: string;
  cycleSec: number;
  count: number;
  archiveType: 'fast' | 'slow';
}

export interface ProfessionalConfig {
  sqlEdition: SqlServerEdition;
  retentionDays: number;
  segmentPeriod: 'day' | 'week' | 'month';
  includeAlarmLogging: boolean;
  alarmsPerHour: number;
  databaseHeadroomPct: number;
}

export interface ProfessionalResult {
  fastTagsCount: number;
  slowTagsCount: number;
  fastEntriesPerDay: number;
  slowEntriesPerDay: number;
  alarmEntriesPerDay: number;
  totalEntriesPerDay: number;
  fastDatabaseSizeGb: number;
  slowDatabaseSizeGb: number;
  alarmDatabaseSizeGb: number;
  totalMdfSizeGb: number;
  estimatedLdfSizeGb: number;
  totalStorageGb: number;
  expressLimitExceeded: boolean;
  warnings: string[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
