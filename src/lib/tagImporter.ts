import readXlsxFile from 'read-excel-file/universal';
import { UnifiedTag, ComfortTag, ProfessionalTag } from './types';

export interface ParsedTagItem {
  name: string;
  dataType: UnifiedTag['dataType'];
  mode: 'cyclic' | 'onchange';
  cycleSec: number;
  entriesPerSec: number;
  count: number;
  comment?: string;
}

export interface ImportParseResult {
  success: boolean;
  filename: string;
  totalDetected: number;
  tags: ParsedTagItem[];
  errors: string[];
  format: 'xlsx' | 'csv';
  sheetName?: string;
}

export interface DetectedColumns {
  nameIdx: number;
  typeIdx: number;
  cycleIdx: number;
  modeIdx: number;
  commentIdx: number;
  countIdx: number;
}

/**
 * Parses Siemens TIA cycle strings like T250ms, 250ms, T1s, 2s, T1m, 10m, 10 into seconds.
 */
export function parseCycleString(val: unknown): number {
  if (val === null || val === undefined) return 1;
  const str = String(val).trim();
  if (!str || str === '<No Value>' || str === '-') return 1;

  // Milliseconds: T250ms, 250ms, 100 ms
  const msMatch = str.match(/(?:T)?(\d+(?:[.,]\d+)?)\s*ms/i);
  if (msMatch) {
    const ms = parseFloat(msMatch[1].replace(',', '.'));
    if (!isNaN(ms) && ms > 0) {
      return Math.max(0.01, Number((ms / 1000).toFixed(4)));
    }
  }

  // Seconds: T1s, 2s, 0.5 s, 10 sec, 10 seconds
  const sMatch = str.match(/(?:T)?(\d+(?:[.,]\d+)?)\s*(?:s|sec|second[s]?)/i);
  if (sMatch) {
    const s = parseFloat(sMatch[1].replace(',', '.'));
    if (!isNaN(s) && s > 0) return Math.max(0.01, s);
  }

  // Minutes: T1m, 1m, 5 min, 10 minutes
  const mMatch = str.match(/(?:T)?(\d+(?:[.,]\d+)?)\s*(?:m|min|minute[s]?)/i);
  if (mMatch) {
    const m = parseFloat(mMatch[1].replace(',', '.'));
    if (!isNaN(m) && m > 0) return Math.max(0.01, m * 60);
  }

  // Hours: T1h, 1h, 2 hr, 1 hour
  const hMatch = str.match(/(?:T)?(\d+(?:[.,]\d+)?)\s*(?:h|hr|hour[s]?)/i);
  if (hMatch) {
    const h = parseFloat(hMatch[1].replace(',', '.'));
    if (!isNaN(h) && h > 0) return Math.max(0.01, h * 3600);
  }

  // Days: T1d, 1d, 1 day, 2 days
  const dMatch = str.match(/(?:T)?(\d+(?:[.,]\d+)?)\s*(?:d|day[s]?)/i);
  if (dMatch) {
    const d = parseFloat(dMatch[1].replace(',', '.'));
    if (!isNaN(d) && d > 0) return Math.max(0.01, d * 86400);
  }

  // Raw numeric value (seconds)
  const num = parseFloat(str.replace(',', '.'));
  if (!isNaN(num) && num > 0) {
    return Math.max(0.01, num);
  }

  return 1;
}

/**
 * Maps Siemens TIA Portal data types to UnifiedTag data types.
 */
export function parseDataTypeString(val: unknown): UnifiedTag['dataType'] {
  if (val === null || val === undefined) return 'Real';
  const str = String(val).trim().toLowerCase();

  if (str.includes('bool')) return 'Bool';
  if (str.includes('lreal') || str.includes('double')) return 'LReal';
  if (str.includes('real') || str.includes('float')) return 'Real';
  if (str.includes('dint') || str.includes('dword') || str.includes('udint') || str.includes('long')) return 'DInt';
  if (
    str.includes('int') || 
    str.includes('word') || 
    str.includes('uint') || 
    str.includes('sint') || 
    str.includes('short') || 
    str.includes('byte')
  ) {
    return 'Int';
  }
  if (str.includes('string') || str.includes('char') || str.includes('wstring') || str.includes('wchar')) {
    return 'String';
  }

  return 'Real';
}

/**
 * Parses acquisition / logging mode: cyclic vs onchange.
 */
export function parseModeString(val: unknown): 'cyclic' | 'onchange' {
  if (val === null || val === undefined) return 'cyclic';
  const str = String(val).trim().toLowerCase();

  if (str.includes('change') || str.includes('измен')) {
    return 'onchange';
  }
  return 'cyclic';
}

/**
 * Discovers column positions based on fuzzy matching header titles.
 */
export function detectColumns(headers: string[]): DetectedColumns {
  const norm = headers.map(h => (h ? String(h).trim().toLowerCase() : ''));

  // 1. Tag Name
  let nameIdx = norm.findIndex(h => h === 'name' || h === 'имя' || h === 'тег' || h === 'tag' || h === 'tag name' || h === 'имя тега');
  if (nameIdx === -1) {
    nameIdx = norm.findIndex(h => (h.includes('name') || h.includes('tag') || h.includes('тег')) && !h.includes('substitute'));
  }

  // 2. Data Type (prefer 'datatype' over 'hmi datatype')
  let typeIdx = norm.findIndex(h => h === 'datatype' || h === 'data type' || h === 'тип' || h === 'тип данных');
  if (typeIdx === -1) {
    typeIdx = norm.findIndex(h => h.includes('datatype') || h.includes('data type') || h.includes('тип'));
  }

  // 3. Cycle / Interval
  let cycleIdx = norm.findIndex(h => h === 'acquisition cycle' || h === 'logging cycle' || h === 'cycle' || h === 'цикл' || h === 'период');
  if (cycleIdx === -1) {
    cycleIdx = norm.findIndex(h => h.includes('cycle') || h.includes('цикл') || h.includes('период') || h.includes('interval'));
  }

  // 4. Mode
  let modeIdx = norm.findIndex(h => h === 'acquisition mode' || h === 'logging mode' || h === 'mode' || h === 'режим');
  if (modeIdx === -1) {
    modeIdx = norm.findIndex(h => h.includes('mode') || h.includes('режим'));
  }

  // 5. Comment / Description
  const commentIdx = norm.findIndex(h => h.includes('comment') || h.includes('коммент') || h.includes('desc') || h.includes('описание'));

  // 6. Count / Quantity
  const countIdx = norm.findIndex(h => h === 'count' || h === 'qty' || h === 'кол-во' || h === 'количество');

  return { nameIdx, typeIdx, cycleIdx, modeIdx, commentIdx, countIdx };
}

/**
 * Parses raw 2D row array into structured ParsedTagItem list.
 */
export function parseRowsToTags(rows: unknown[][]): { tags: ParsedTagItem[]; errors: string[] } {
  const errors: string[] = [];
  if (!rows || rows.length < 2) {
    errors.push('Файл пуст или содержит только заголовок');
    return { tags: [], errors };
  }

  // Find header row: scan first 5 rows for column names like 'name' or 'tag'
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const row = rows[r];
    if (Array.isArray(row)) {
      const norm = row.map(c => (c ? String(c).trim().toLowerCase() : ''));
      if (norm.some(c => c === 'name' || c === 'tag' || c === 'имя' || c.includes('name') || c.includes('tag'))) {
        headerRowIdx = r;
        break;
      }
    }
  }

  if (headerRowIdx === -1) {
    headerRowIdx = 0; // fallback to first row
  }

  const headerRow = rows[headerRowIdx].map(c => (c !== null && c !== undefined ? String(c) : ''));
  const cols = detectColumns(headerRow);

  if (cols.nameIdx === -1) {
    errors.push('Не удалось определить столбец с именем тега (Name / Tag)');
    return { tags: [], errors };
  }

  const tags: ParsedTagItem[] = [];

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawName = row[cols.nameIdx];
    if (!rawName) continue;
    const name = String(rawName).trim();
    if (!name || name === '<No Value>' || name === '-' || name.toLowerCase() === 'name') continue;

    const dataType = cols.typeIdx !== -1 ? parseDataTypeString(row[cols.typeIdx]) : 'Real';
    const mode = cols.modeIdx !== -1 ? parseModeString(row[cols.modeIdx]) : 'cyclic';
    const cycleSec = cols.cycleIdx !== -1 ? parseCycleString(row[cols.cycleIdx]) : 1;
    const count = cols.countIdx !== -1 && !isNaN(Number(row[cols.countIdx])) 
      ? Math.max(1, Math.round(Number(row[cols.countIdx]))) 
      : 1;
    const comment = cols.commentIdx !== -1 && row[cols.commentIdx] ? String(row[cols.commentIdx]).trim() : undefined;

    const entriesPerSec = mode === 'cyclic'
      ? Number((1 / Math.max(0.01, cycleSec)).toFixed(4))
      : 0.0167; // 1 per minute on change average

    tags.push({
      name,
      dataType,
      mode,
      cycleSec,
      entriesPerSec,
      count,
      comment,
    });
  }

  return { tags, errors };
}

/**
 * Splits CSV line respecting quotes and delimiters.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parses raw CSV text into 2D row array.
 */
export function parseCsvText(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter among semicolon, comma, tab
  const sample = lines.slice(0, 5).join('\n');
  const semiCount = (sample.match(/;/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;

  let delimiter = ';';
  if (commaCount > semiCount && commaCount > tabCount) delimiter = ',';
  else if (tabCount > semiCount && tabCount > commaCount) delimiter = '\t';

  return lines.map(line => parseCsvLine(line, delimiter));
}

/**
 * Extracts rows from readXlsxFile result regardless of single-sheet or multi-sheet return schema.
 */
export function extractXlsxRows(result: unknown): { rows: unknown[][]; sheetName?: string } {
  if (!Array.isArray(result) || result.length === 0) {
    return { rows: [] };
  }

  // Multi-sheet structure: Array<{ sheet?: string, data?: unknown[][] }>
  const arr = result as Array<{ sheet?: string; data?: unknown[][] }>;
  if (arr[0] && typeof arr[0] === 'object' && Array.isArray(arr[0].data)) {
    // Prefer sheet with 'tag', 'hmi', 'log' in name
    const tagSheet = arr.find((s) =>
      s.sheet && (
        s.sheet.toLowerCase().includes('tag') ||
        s.sheet.toLowerCase().includes('hmi') ||
        s.sheet.toLowerCase().includes('log')
      )
    );
    if (tagSheet && tagSheet.data && tagSheet.data.length > 0) {
      return { rows: tagSheet.data, sheetName: tagSheet.sheet };
    }

    // Otherwise find sheet with max rows
    let maxSheet = arr[0];
    for (const s of arr) {
      if (s.data && s.data.length > (maxSheet.data?.length || 0)) {
        maxSheet = s;
      }
    }
    return { rows: maxSheet.data || [], sheetName: maxSheet.sheet };
  }

  // Single sheet: Array<unknown[]>
  if (Array.isArray(result[0])) {
    return { rows: result as unknown[][] };
  }

  return { rows: [] };
}

/**
 * Main browser entry point: accepts a File and parses it into ParsedTagItem[].
 */
export async function parseTagsFromFile(file: File): Promise<ImportParseResult> {
  const filename = file.name;
  const isXlsx = /\.(xlsx|xls)$/i.test(filename);
  const isCsv = /\.(csv|txt)$/i.test(filename);

  if (!isXlsx && !isCsv) {
    return {
      success: false,
      filename,
      totalDetected: 0,
      tags: [],
      errors: ['Неподдерживаемый формат файла. Загрузите .xlsx, .xls или .csv'],
      format: 'xlsx',
    };
  }

  try {
    if (isXlsx) {
      const buffer = await file.arrayBuffer();
      const xlsxRaw = await readXlsxFile(buffer);
      const { rows, sheetName } = extractXlsxRows(xlsxRaw);
      const { tags, errors } = parseRowsToTags(rows);

      return {
        success: tags.length > 0,
        filename,
        totalDetected: tags.length,
        tags,
        errors,
        format: 'xlsx',
        sheetName,
      };
    } else {
      const text = await file.text();
      const rows = parseCsvText(text);
      const { tags, errors } = parseRowsToTags(rows);

      return {
        success: tags.length > 0,
        filename,
        totalDetected: tags.length,
        tags,
        errors,
        format: 'csv',
      };
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      filename,
      totalDetected: 0,
      tags: [],
      errors: [`Ошибка чтения файла: ${errMsg}`],
      format: isXlsx ? 'xlsx' : 'csv',
    };
  }
}

/**
 * Converts parsed items to WinCC Unified tags.
 */
export function convertToUnifiedTags(items: ParsedTagItem[]): UnifiedTag[] {
  return items.map(item => ({
    id: Math.random().toString(36).substring(2, 9),
    description: item.name,
    mode: item.mode,
    cycleSec: item.cycleSec,
    entriesPerSec: item.entriesPerSec,
    count: item.count,
    dataType: item.dataType,
  }));
}

/**
 * Converts parsed items to WinCC Comfort / Advanced tags.
 */
export function convertToComfortTags(items: ParsedTagItem[]): ComfortTag[] {
  return items.map(item => ({
    id: Math.random().toString(36).substring(2, 9),
    description: item.name,
    mode: item.mode,
    cycleSec: item.cycleSec,
    count: item.count,
  }));
}

/**
 * Converts parsed items to WinCC Professional tags.
 * Tags with cycle <= 1s mapped to Fast Tag Logging, > 1s mapped to Slow Tag Logging.
 */
export function convertToProfessionalTags(items: ParsedTagItem[]): ProfessionalTag[] {
  return items.map(item => ({
    id: Math.random().toString(36).substring(2, 9),
    description: item.name,
    cycleSec: item.cycleSec,
    count: item.count,
    archiveType: item.cycleSec <= 1 ? 'fast' : 'slow',
  }));
}
