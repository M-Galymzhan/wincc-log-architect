export type Language = 'ru' | 'en';
export type Theme = 'dark' | 'light';
export type ActiveTab = 'unified' | 'comfort' | 'professional' | 'master_tags';

// TIA PORTAL V14–V20 LOGGING TYPES
export type LoggingMode = 'cyclic' | 'onchange' | 'ondemand';

export type TriggerMode = 'none' | 'rising_edge' | 'falling_edge' | 'change';

export type LimitScope =
  | 'no_limits'
  | 'greater'
  | 'less'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'within_limits'
  | 'within_or_equal'
  | 'outside_limits'
  | 'outside_or_equal';

export type SmoothingMode =
  | 'no_smoothing'
  | 'compare_values'
  | 'value'
  | 'relative_value'
  | 'swinging_door';

export type CompressionMode =
  | 'no_compression'
  | 'minimum'
  | 'maximum'
  | 'min_with_timestamp'
  | 'max_with_timestamp'
  | 'sum'
  | 'average'
  | 'time_average_stepped'
  | 'end';

export interface MasterLoggingTag {
  id: string;
  name: string;
  processTag: string;
  description: string;
  dataType: 'Real' | 'LReal' | 'DInt' | 'Int' | 'Bool' | 'String';
  loggingMode: LoggingMode;
  // Trigger
  triggerMode?: TriggerMode;
  triggerTag?: string;
  triggerBit?: number;
  // Cycle
  cycleSec: number;
  cycleFactor?: number;
  // Limits
  limitScope?: LimitScope;
  highLimit?: number;
  lowLimit?: number;
  useTagLimits?: boolean;
  // Smoothing
  smoothingMode?: SmoothingMode;
  smoothingDelta?: number;
  maxTimeSec?: number; // Heartbeat
  minTimeSec?: number; // Anti-chatter
  // Compression
  compressionMode?: CompressionMode;
  compressionDelaySec?: number;
  sourceLog?: string;
  // Quantities & Destination
  count: number;
  targetLogName?: string;
}

// WINCC UNIFIED
export type UnifiedDeviceType = 'ucp' | 'pc_rt';

export interface UnifiedTag {
  id: string;
  name?: string;
  processTag?: string;
  description: string;
  mode: 'cyclic' | 'onchange' | 'ondemand';
  cycleSec: number;
  cycleFactor?: number;
  entriesPerSec: number;
  count: number;
  dataType: 'Real' | 'LReal' | 'DInt' | 'Int' | 'Bool' | 'String';
  dataLogId?: string;
  // Advanced TIA Inspector Properties
  triggerMode?: TriggerMode;
  triggerTag?: string;
  triggerBit?: number;
  limitScope?: LimitScope;
  highLimit?: number;
  lowLimit?: number;
  useTagLimits?: boolean;
  smoothingMode?: SmoothingMode;
  smoothingDelta?: number;
  maxTimeSec?: number;
  minTimeSec?: number;
  compressionMode?: CompressionMode;
  compressionDelaySec?: number;
  sourceLog?: string;
}

export interface UnifiedDataLogConfig {
  id: string;
  name: string; // e.g. 'Trend_Logs', 'Fast_Logs'
  retentionDays?: number; // optional individual retention override
  segmentHours?: number;  // optional individual segment time override
  enabled: boolean;
}

export interface UnifiedAlarmTag {
  id: string;
  name: string; // e.g. 'M101_Trip_Overload', 'Tank_High_Level'
  alarmClass: 'Alarm' | 'Warning' | 'Event';
  triggerType: 'digital' | 'analog';
  eventsPerDay: number; // e.g. 5 events per day per signal
  count: number; // e.g. 10 identical signals
  alarmLogId?: string; // id of target UnifiedAlarmLogConfig
}

export interface UnifiedAlarmLogConfig {
  id: string;
  name: string; // e.g. 'Alarms_log', 'Events_log'
  entriesPerDay: number; // Manual or background events per day
  retentionDays?: number; // optional individual retention override
  segmentHours?: number;  // optional individual segment time override
  enabled: boolean;
}

export interface CalculatedLogItem {
  id: string;
  name: string;
  category: 'data' | 'alarm' | 'audit';
  categoryNameRu: string;
  categoryNameEn: string;
  tagCount?: number;
  entriesPerDay: number;
  retentionDays: number;
  segmentHours: number;
  totalSegments: number;
  rawSegmentMb: number;
  sqliteSegmentMb: number; // multiple of 4 MB, min 4 MB
  totalLogMb: number;      // total archive size in MB
  totalLogGb: number;
  storageOccupancyPct: number;
  enabled: boolean;
}

export type NandClass = 'slc' | 'pslc' | 'mlc' | 'tlc' | 'qlc';

export interface UnifiedConfig {
  deviceType: UnifiedDeviceType;
  retentionDays: number;
  segmentHours: number;
  perEntryBytes: number;
  headroomPct: number;
  dataLogs?: UnifiedDataLogConfig[];
  alarmLogs?: UnifiedAlarmLogConfig[];
  alarmTags?: UnifiedAlarmTag[];
  includeAlarms: boolean;
  alarmsPerDay: number;
  includeAudit: boolean;
  auditEntriesPerDay: number;
  storageMedium: 'sd_512m' | 'sd_2g' | 'sd_12g' | 'sd_32g' | 'usb_128g' | 'ssd_custom' | 'sd_custom_x52' | 'usb_custom';
  storageSizeGb: number;
  nandClass?: NandClass;
}

export interface NetworkMetrics {
  bandwidthKbps: number;
  bandwidthMbps: number;
  fastEthernetSaturationPct: number;
  dailyTrafficMb: number;
  monthlyTrafficGb: number;
  telegramsPerSec: number;
  networkStatus: 'safe' | 'warning' | 'critical';
  recommendationRu: string;
  recommendationEn: string;
}

export interface Isa18AlarmAssessment {
  totalAlarmsPerDay: number;
  alarmsPerHour: number;
  status: 'acceptable' | 'manageable' | 'demanding' | 'overload';
  labelRu: string;
  labelEn: string;
  descRu: string;
  descEn: string;
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
  flashLifeApplicable: boolean;
  flashLifeReason?: 'overflow' | 'pc_rt' | 'zero_writes' | 'ok';
  dailyWrittenGb: number;
  totalCardTbwTb: number;
  peCyclesUsed: number;
  network: NetworkMetrics;
  warnings: string[];
  // Multi-Log calculations
  logItems: CalculatedLogItem[];
  totalStorageUsedMb: number;
  totalStorageUsedGb: number;
  isa18AlarmAssessment?: Isa18AlarmAssessment;
}

// WINCC COMFORT / ADVANCED
export type ComfortDeviceType = 'comfort_panel' | 'rt_advanced';
export type ComfortLogFormat = 'rdb' | 'csv';

export interface ComfortDataLogConfig {
  id: string;
  name: string;
  recordsPerLog: number;
  logMethod?: 'circular' | 'segmented';
  format?: ComfortLogFormat;
  retentionDays?: number;
  enabled: boolean;
}

export interface ComfortAlarmLogConfig {
  id: string;
  name: string;
  entriesPerDay: number;
  recordsPerLog: number;
  logMethod?: 'circular' | 'segmented';
  format?: ComfortLogFormat;
  retentionDays?: number;
  enabled: boolean;
}

export interface ComfortAlarmTag {
  id: string;
  name: string;
  alarmLogId?: string;
  alarmClass?: 'Alarm' | 'Warning' | 'Event';
  triggerType?: 'digital' | 'analog';
  eventsPerDay: number;
  count?: number;
}

export interface CalculatedComfortLogItem {
  id: string;
  name: string;
  category: 'data' | 'alarm';
  categoryNameRu: string;
  categoryNameEn: string;
  format: ComfortLogFormat;
  logMethod: 'circular' | 'segmented';
  entriesPerDay: number;
  retentionDays: number;
  recordsPerLog: number;
  recommendedLogFiles: number;
  fileSizeMb: number;
  totalLogMb: number;
  totalLogGb: number;
  storageOccupancyPct: number;
  path: string;
  enabled: boolean;
}

export interface ComfortTag {
  id: string;
  name?: string;
  processTag?: string;
  description: string;
  mode: 'cyclic' | 'onchange';
  cycleSec: number;
  count: number;
  dataType?: 'Real' | 'LReal' | 'DInt' | 'Int' | 'Bool' | 'String';
  dataLogId?: string;
}

export interface ComfortConfig {
  deviceType: ComfortDeviceType;
  format: ComfortLogFormat;
  retentionDays: number;
  recordsPerLog: number;
  logMethod: 'circular' | 'segmented';
  storageMediumMb: number;
  // Multi-Log additions
  dataLogs?: ComfortDataLogConfig[];
  alarmLogs?: ComfortAlarmLogConfig[];
  alarmTags?: ComfortAlarmTag[];
  includeAlarms?: boolean;
  alarmsPerDay?: number;
  storageMedium?: 'sd_512m' | 'sd_2g' | 'sd_4g' | 'sd_12g' | 'sd_32g' | 'sd_custom' | 'sd_custom_x52' | 'usb_128g' | 'usb_custom' | 'ssd_custom';
  storageSizeGb?: number;
  nandClass?: NandClass;
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
  trafficStatus: 'safe' | 'warning' | 'critical';
  network: NetworkMetrics;
  warnings: string[];
  // Multi-Log and Flash Life additions
  logItems: CalculatedComfortLogItem[];
  totalStorageUsedMb: number;
  totalStorageUsedGb: number;
  dailyWrittenGb: number;
  estimatedFlashLifeYears: number;
  flashLifeApplicable: boolean;
  flashLifeReason?: 'overflow' | 'pc_rt' | 'zero_writes' | 'ok';
  totalCardTbwTb: number;
  peCyclesUsed: number;
  isa18AlarmAssessment?: Isa18AlarmAssessment;
}

// WINCC PROFESSIONAL
export type SqlServerEdition = 'express' | 'standard_enterprise';

export interface ProfessionalTag {
  id: string;
  name?: string;
  processTag?: string;
  description: string;
  cycleSec: number;
  count: number;
  archiveType: 'fast' | 'slow';
  dataType?: 'Real' | 'LReal' | 'DInt' | 'Int' | 'Bool' | 'String';
}

export interface ProfessionalAlarmTag {
  id: string;
  name: string;
  alarmClass?: 'Alarm' | 'Warning' | 'Event';
  triggerType?: 'digital' | 'analog';
  eventsPerDay: number;
  count?: number;
  alarmLogId?: string;
}

export interface CalculatedSqlArchiveItem {
  id: string;
  name: string;
  archiveType: 'fast' | 'slow' | 'alarm';
  nameRu: string;
  nameEn: string;
  segmentPeriod: 'day' | 'week' | 'month';
  retentionDays: number;
  sizeGb: number;
  sizeMb: number;
  path: string;
  descriptionRu: string;
  descriptionEn: string;
}

export interface ProfessionalConfig {
  sqlEdition: SqlServerEdition;
  retentionDays: number;
  segmentPeriod: 'day' | 'week' | 'month';
  includeAlarmLogging: boolean;
  alarmsPerHour: number;
  databaseHeadroomPct: number;
  storageDiskType?: 'sata_ssd' | 'nvme_ssd' | 'hdd_raid1' | 'custom';
  diskCapacityGb?: number;
  alarmTags?: ProfessionalAlarmTag[];
  archivePath?: string;
}

export interface ProfessionalResult {
  fastTagsCount: number;
  slowTagsCount: number;
  fastEntriesPerDay: number;
  slowEntriesPerDay: number;
  alarmEntriesPerDay: number;
  totalEntriesPerDay: number;
  totalRatePerSec: number;
  fastDatabaseSizeGb: number;
  slowDatabaseSizeGb: number;
  alarmDatabaseSizeGb: number;
  totalMdfSizeGb: number;
  estimatedLdfSizeGb: number;
  totalStorageGb: number;
  storageOccupancyPct: number;
  requiredIops: number;
  trafficStatus: 'safe' | 'warning' | 'critical';
  expressLimitExceeded: boolean;
  archiveItems: CalculatedSqlArchiveItem[];
  network: NetworkMetrics;
  warnings: string[];
  isa18AlarmAssessment?: Isa18AlarmAssessment;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
