import { UnifiedTag, ComfortTag, ProfessionalTag, ActiveTab } from './types';

/**
 * Exports tags to Siemens TIA Portal Historical Data / Logging Tags CSV format.
 * Uses semicolon delimiter and UTF-8 BOM so TIA Portal and Excel open with correct encoding.
 */
export function generateTiaPortalCsv(
  tab: ActiveTab,
  tags: (UnifiedTag | ComfortTag | ProfessionalTag)[],
  logName: string = 'ProcessDataLog'
): string {
  const BOM = '\uFEFF';

  if (tab === 'unified') {
    // WinCC Unified Logging Tag CSV structure
    const header = 'Name;Data log;Logging mode;Logging cycle;Data type;Deadband;Smoothing;Comment\r\n';
    const rows = (tags as UnifiedTag[]).map((tag, idx) => {
      const tagName = sanitizeName(tag.description || `Unified_Tag_${idx + 1}`);
      const mode = tag.mode === 'cyclic' ? 'Cyclic' : 'On change';
      const cycle = tag.mode === 'cyclic' ? `${tag.cycleSec} s` : 'None';
      const dataType = tag.dataType || 'Real';
      const comment = `Count: ${tag.count}x, Rate: ${tag.entriesPerSec} rec/s`;
      return `${tagName};${logName};${mode};${cycle};${dataType};0;None;${comment}`;
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

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\u0400-\u04FF]/g, '_').substring(0, 60);
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
