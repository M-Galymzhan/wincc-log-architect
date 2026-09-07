import * as XLSX from 'xlsx';
import { UnifiedTag, ComfortTag, ProfessionalTag, UnifiedAlarmTag, ActiveTab } from './types';

export const TIA_HMI_TAGS_HEADERS = [
  'Name',
  'Path',
  'Connection',
  'PLC tag',
  'DataType',
  'HMI DataType',
  'Length',
  'Access Method',
  'Address',
  'Start value',
  'Persistency',
  'Substitute value',
  'ID tag',
  'Comment [en-US]',
  'Acquisition mode',
  'Acquisition cycle',
  'Limit Upper 2 Type',
  'Limit Upper 2',
  'Limit Lower 2 Type',
  'Limit Lower 2',
  'Linear scaling',
  'End value PLC',
  'Start value PLC',
  'End value HMI',
  'Start value HMI',
  'Gmp relevant',
  'Confirmation Type',
  'RequiredFunctionRights',
  'Mandatory Commenting',
  'Scope',
];

export const TIA_SUBSTITUTE_VALUE_HEADERS = ['HMI Tag name', 'Substitute Value Usage'];

/**
 * Formats cycle duration in seconds into standard Siemens TIA Portal cycle representation (e.g. T250ms, T1s, T2s, T5s, T1min, T1h).
 */
export function formatTiaCycle(cycleSec: number): string {
  if (cycleSec <= 0.1) return 'T100ms';
  if (cycleSec <= 0.25) return 'T250ms';
  if (cycleSec <= 0.5) return 'T500ms';
  if (cycleSec === 1) return 'T1s';
  if (cycleSec === 2) return 'T2s';
  if (cycleSec === 5) return 'T5s';
  if (cycleSec === 10) return 'T10s';
  if (cycleSec === 60) return 'T1min';
  if (cycleSec === 3600) return 'T1h';

  if (cycleSec < 1) {
    const ms = Math.round(cycleSec * 1000);
    return `T${ms}ms`;
  }
  if (cycleSec >= 60 && cycleSec % 60 === 0) {
    return `T${Math.round(cycleSec / 60)}min`;
  }
  return `T${cycleSec}s`;
}

export function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\u0400-\u04FF]/g, '_').substring(0, 60);
}

export interface TiaXlsxExportOptions {
  connectionName?: string;
  path?: string;
  expandCount?: boolean;
}

function createTagRow(
  name: string,
  dataType: string,
  acqMode: 'Cyclic in operation' | 'On change',
  acqCycle: string,
  comment: string,
  options?: TiaXlsxExportOptions
): any[] {
  const path = options?.path || '<No Value>';
  const connection = options?.connectionName || '<No Value>';
  const length = dataType === 'String' ? 254 : 1;

  return [
    name,                             // 0 Name
    path,                             // 1 Path
    connection,                       // 2 Connection
    '<No Value>',                     // 3 PLC tag
    dataType,                         // 4 DataType
    dataType,                         // 5 HMI DataType
    length,                           // 6 Length
    'Symbolic access',                // 7 Access Method
    '<No Value>',                     // 8 Address
    '<No Value>',                     // 9 Start value
    'False',                          // 10 Persistency
    '<No Value>',                     // 11 Substitute value
    0,                                // 12 ID tag
    comment || '<No Value>',          // 13 Comment [en-US]
    acqMode,                          // 14 Acquisition mode
    acqCycle,                         // 15 Acquisition cycle
    'None',                           // 16 Limit Upper 2 Type
    '<No Value>',                     // 17 Limit Upper 2
    'None',                           // 18 Limit Lower 2 Type
    '<No Value>',                     // 19 Limit Lower 2
    'False',                          // 20 Linear scaling
    10,                               // 21 End value PLC
    0,                                // 22 Start value PLC
    100,                              // 23 End value HMI
    0,                                // 24 Start value HMI
    'False',                          // 25 Gmp relevant
    'None',                           // 26 Confirmation Type
    '<No Value>',                     // 27 RequiredFunctionRights
    'False',                          // 28 Mandatory Commenting
    'System-wide',                    // 29 Scope
  ];
}

/**
 * Generates an XLSX workbook for Siemens TIA Portal V14–V20 tag import matching test_impTeg.xlsx.
 * Contains 'Hmi Tags' and 'Substitute Value Usage' sheets with all 30 TIA Portal tag columns.
 */
export function generateTiaPortalXlsx(
  tab: ActiveTab,
  tags: (UnifiedTag | ComfortTag | ProfessionalTag)[],
  logName: string = 'ProcessDataLog',
  dataLogs?: { id: string; name: string }[],
  options?: TiaXlsxExportOptions
): Uint8Array {
  const dataLogMap = new Map((dataLogs || []).map(dl => [dl.id, dl.name]));
  const rows: any[][] = [TIA_HMI_TAGS_HEADERS];

  if (tab === 'unified') {
    (tags as UnifiedTag[]).forEach((tag, idx) => {
      const baseName = sanitizeName(tag.description || `Unified_Tag_${idx + 1}`);
      const targetLog = (tag.dataLogId && dataLogMap.get(tag.dataLogId)) || logName;
      const mode: 'Cyclic in operation' | 'On change' = tag.mode === 'onchange' ? 'On change' : 'Cyclic in operation';
      const cycle = tag.mode === 'onchange' ? 'None' : formatTiaCycle(tag.cycleSec);
      const dataType = tag.dataType || 'Real';

      if (options?.expandCount && tag.count > 1) {
        for (let i = 1; i <= tag.count; i++) {
          const tagName = `${baseName}_${i}`;
          const comment = `Log: ${targetLog}, Rate: ${tag.entriesPerSec} rec/s [Instance ${i}/${tag.count}]`;
          rows.push(createTagRow(tagName, dataType, mode, cycle, comment, options));
        }
      } else {
        const comment = `Count: ${tag.count}x, Rate: ${tag.entriesPerSec} rec/s, Log: ${targetLog}`;
        rows.push(createTagRow(baseName, dataType, mode, cycle, comment, options));
      }
    });
  } else if (tab === 'comfort') {
    (tags as ComfortTag[]).forEach((tag, idx) => {
      const baseName = sanitizeName(tag.description || `Comfort_Tag_${idx + 1}`);
      const mode: 'Cyclic in operation' | 'On change' = tag.mode === 'onchange' ? 'On change' : 'Cyclic in operation';
      const cycle = tag.mode === 'onchange' ? 'None' : formatTiaCycle(tag.cycleSec);
      const dataType = 'Real';

      if (options?.expandCount && tag.count > 1) {
        for (let i = 1; i <= tag.count; i++) {
          const tagName = `${baseName}_${i}`;
          const comment = `Log: ${logName}, Comfort Historical Data [Instance ${i}/${tag.count}]`;
          rows.push(createTagRow(tagName, dataType, mode, cycle, comment, options));
        }
      } else {
        const comment = `Count: ${tag.count}x, Comfort Historical Data, Log: ${logName}`;
        rows.push(createTagRow(baseName, dataType, mode, cycle, comment, options));
      }
    });
  } else {
    (tags as ProfessionalTag[]).forEach((tag, idx) => {
      const baseName = sanitizeName(tag.description || `SCADA_Tag_${idx + 1}`);
      const archiveType = (tag.archiveType || (tag.cycleSec < 60 ? 'fast' : 'slow')).toUpperCase();
      const archiveName = archiveType === 'FAST' ? 'TagLoggingFast' : 'TagLoggingSlow';
      const cycle = formatTiaCycle(tag.cycleSec);
      const dataType = 'Real';

      if (options?.expandCount && tag.count > 1) {
        for (let i = 1; i <= tag.count; i++) {
          const tagName = `${baseName}_${i}`;
          const comment = `Archive: ${archiveName}, WinCC Pro MS SQL [Instance ${i}/${tag.count}]`;
          rows.push(createTagRow(tagName, dataType, 'Cyclic in operation', cycle, comment, options));
        }
      } else {
        const comment = `Count: ${tag.count}x, Archive: ${archiveName}, WinCC Professional MS SQL`;
        rows.push(createTagRow(baseName, dataType, 'Cyclic in operation', cycle, comment, options));
      }
    });
  }

  const wb = XLSX.utils.book_new();
  const wsHmiTags = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsHmiTags, 'Hmi Tags');

  const wsSubstitute = XLSX.utils.aoa_to_sheet([TIA_SUBSTITUTE_VALUE_HEADERS]);
  XLSX.utils.book_append_sheet(wb, wsSubstitute, 'Substitute Value Usage');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}

/**
 * Generates an XLSX workbook for Siemens TIA Portal alarm tags (discrete alarm triggers).
 */
export function generateTiaPortalAlarmXlsx(
  alarmTags: UnifiedAlarmTag[],
  alarmLogs?: { id: string; name: string }[],
  options?: TiaXlsxExportOptions
): Uint8Array {
  const alarmLogMap = new Map((alarmLogs || []).map(al => [al.id, al.name]));
  const rows: any[][] = [TIA_HMI_TAGS_HEADERS];

  alarmTags.forEach((at, idx) => {
    const baseName = sanitizeName(at.name || `Alarm_${idx + 1}`);
    const targetLog = (at.alarmLogId && alarmLogMap.get(at.alarmLogId)) || 'Alarms_log';
    const totalEv = Math.round((at.eventsPerDay || 0) * (at.count || 1));
    const dataType = 'Bool';
    const acqMode: 'Cyclic in operation' = 'Cyclic in operation';
    const acqCycle = 'T250ms';

    if (options?.expandCount && at.count > 1) {
      for (let i = 1; i <= at.count; i++) {
        const tagName = `${baseName}_${i}`;
        const comment = `Class: ${at.alarmClass}, TargetLog: ${targetLog} [Instance ${i}/${at.count}]`;
        rows.push(createTagRow(tagName, dataType, acqMode, acqCycle, comment, options));
      }
    } else {
      const comment = `Class: ${at.alarmClass}, TargetLog: ${targetLog}, Events: ${at.eventsPerDay}/day, Count: ${at.count}x, Total: ${totalEv} ev/day`;
      rows.push(createTagRow(baseName, dataType, acqMode, acqCycle, comment, options));
    }
  });

  const wb = XLSX.utils.book_new();
  const wsHmiTags = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsHmiTags, 'Hmi Tags');

  const wsSubstitute = XLSX.utils.aoa_to_sheet([TIA_SUBSTITUTE_VALUE_HEADERS]);
  XLSX.utils.book_append_sheet(wb, wsSubstitute, 'Substitute Value Usage');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}

/**
 * Exports tags to Siemens TIA Portal Historical Data / Logging Tags CSV format.
 * Uses semicolon delimiter and UTF-8 BOM so TIA Portal and Excel open with correct encoding.
 */
export function generateTiaPortalCsv(
  tab: ActiveTab,
  tags: (UnifiedTag | ComfortTag | ProfessionalTag)[],
  logName: string = 'ProcessDataLog',
  dataLogs?: { id: string; name: string }[]
): string {
  const BOM = '\uFEFF';

  if (tab === 'unified') {
    // WinCC Unified Logging Tag CSV structure
    const dataLogMap = new Map((dataLogs || []).map(dl => [dl.id, dl.name]));
    const header = 'Name;Data log;Logging mode;Logging cycle;Data type;Deadband;Smoothing;Comment\r\n';
    const rows = (tags as UnifiedTag[]).map((tag, idx) => {
      const tagName = sanitizeName(tag.description || `Unified_Tag_${idx + 1}`);
      const targetLog = (tag.dataLogId && dataLogMap.get(tag.dataLogId)) || logName;
      const mode = tag.mode === 'cyclic' ? 'Cyclic' : 'On change';
      const cycle = tag.mode === 'cyclic' ? `${tag.cycleSec} s` : 'None';
      const dataType = tag.dataType || 'Real';
      const comment = `Count: ${tag.count}x, Rate: ${tag.entriesPerSec} rec/s`;
      return `${tagName};${targetLog};${mode};${cycle};${dataType};0;None;${comment}`;
    }).join('\r\n');

    return BOM + header + rows;
  } else if (tab === 'comfort') {
    // WinCC Comfort / Advanced Historical Data CSV structure
    const header = 'Name;Data log;Logging mode;Logging cycle;Acquisition cycle;Comment\r\n';
    const rows = (tags as ComfortTag[]).map((tag, idx) => {
      const tagName = sanitizeName(tag.description || `Comfort_Tag_${idx + 1}`);
      const mode = tag.mode === 'cyclic' ? 'Cyclic' : 'On change';
      const cycle = tag.mode === 'cyclic' ? `${tag.cycleSec} s` : 'None';
      const comment = `Count: ${tag.count}x, Comfort Historical Data`;
      return `${tagName};${logName};${mode};${cycle};1 s;${comment}`;
    }).join('\r\n');

    return BOM + header + rows;
  } else {
    // WinCC Professional Tag Logging CSV structure
    const header = 'Name;Archive name;Archive type;Cycle time;Acquisition type;Comment\r\n';
    const rows = (tags as ProfessionalTag[]).map((tag, idx) => {
      const tagName = sanitizeName(tag.description || `SCADA_Tag_${idx + 1}`);
      const archiveType = (tag.archiveType || (tag.cycleSec < 60 ? 'fast' : 'slow')).toUpperCase();
      const cycle = `${tag.cycleSec} s`;
      const archiveName = archiveType === 'FAST' ? 'TagLoggingFast' : 'TagLoggingSlow';
      const comment = `Count: ${tag.count}x, WinCC Professional MS SQL`;
      return `${tagName};${archiveName};${archiveType};${cycle};Cyclic;${comment}`;
    }).join('\r\n');

    return BOM + header + rows;
  }
}

export function generateTiaPortalAlarmCsv(
  alarmTags: UnifiedAlarmTag[],
  alarmLogs?: { id: string; name: string }[]
): string {
  const BOM = '\uFEFF';
  const header = 'Name;Alarm log;Alarm class;Trigger type;Events per day;Count;Comment\r\n';
  const alarmLogMap = new Map((alarmLogs || []).map(al => [al.id, al.name]));
  const rows = alarmTags.map((at, idx) => {
    const name = sanitizeName(at.name || `Alarm_${idx + 1}`);
    const targetLog = (at.alarmLogId && alarmLogMap.get(at.alarmLogId)) || 'Alarms_log';
    const totalEv = Math.round((at.eventsPerDay || 0) * (at.count || 1));
    const comment = `Events: ${at.eventsPerDay}/day, Count: ${at.count}x, Total: ${totalEv} ev/day`;
    return `${name};${targetLog};${at.alarmClass};${at.triggerType};${at.eventsPerDay};${at.count};${comment}`;
  }).join('\r\n');

  return BOM + header + rows;
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadXlsxFile(data: Uint8Array | ArrayBuffer, filename: string) {
  const blob = new Blob([data as any], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
