// Data cleaning engine

interface CleaningResult {
  data: Record<string, any>[];
  report: CleaningReport;
}

interface CleaningReport {
  totalRows: number;
  validRows: number;
  issues: CleaningIssue[];
  columns: ColumnInfo[];
}

interface CleaningIssue {
  row: number;
  column: string;
  original: any;
  action: string;
}

interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'unknown';
  nullCount: number;
}

export function cleanData(raw: Record<string, any>[]): CleaningResult {
  if (!raw.length) return { data: [], report: { totalRows: 0, validRows: 0, issues: [], columns: [] } };

  const headers = Object.keys(raw[0]);
  const issues: CleaningIssue[] = [];
  const columns: ColumnInfo[] = [];

  // Detect column types
  for (const col of headers) {
    const values = raw.map((r) => r[col]).filter((v) => v != null && v !== '');
    const type = detectColumnType(values);
    const nullCount = raw.length - values.length;
    columns.push({ name: col, type, nullCount });
  }

  // Clean each row
  const data = raw.map((row, i) => {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
      const colInfo = columns.find((c) => c.name === key);
      if (colInfo?.type === 'date') {
        const parsed = parseDate(value);
        if (parsed) {
          cleaned[key] = parsed.toISOString().split('T')[0];
        } else if (value != null && value !== '') {
          issues.push({ row: i + 1, column: key, original: value, action: '无法解析为日期，保留原值' });
          cleaned[key] = value;
        } else {
          cleaned[key] = null;
        }
      } else if (colInfo?.type === 'number') {
        const num = parseNumber(value);
        if (num !== null) {
          cleaned[key] = num;
        } else {
          issues.push({ row: i + 1, column: key, original: value, action: '非数值，设为空' });
          cleaned[key] = null;
        }
      } else {
        // Trim strings
        cleaned[key] = typeof value === 'string' ? value.trim() : value;
      }
    }

    return cleaned;
  });

  return {
    data,
    report: { totalRows: raw.length, validRows: data.length, issues, columns },
  };
}

function detectColumnType(values: any[]): 'string' | 'number' | 'date' | 'unknown' {
  let dateCount = 0;
  let numCount = 0;
  let strCount = 0;
  const total = Math.min(values.length, 50); // sample first 50

  for (let i = 0; i < total; i++) {
    const v = values[i];
    if (v == null || v === '') continue;
    if (typeof v === 'number') { numCount++; continue; }
    if (parseDate(v)) { dateCount++; continue; }
    if (parseNumber(v) !== null) { numCount++; continue; }
    strCount++;
  }

  const nonNull = dateCount + numCount + strCount || 1;
  if (dateCount / nonNull > 0.6) return 'date';
  if (numCount / nonNull > 0.6) return 'number';
  if (strCount / nonNull > 0.6) return 'string';
  return 'unknown';
}

function parseDate(v: any): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    // Excel serial date
    if (v > 30000 && v < 80000) {
      return new Date((v - 25569) * 86400 * 1000);
    }
    return null;
  }
  if (typeof v !== 'string') return null;
  // Try common date formats
  const formats = [
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
    /^(\d{4})年(\d{1,2})月(\d{1,2})日$/,
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/,
  ];
  for (const fmt of formats) {
    const m = v.match(fmt);
    if (m) {
      const parts = fmt.source.startsWith('^(\\d{1,2})')
        ? [m[3], m[1], m[2]]
        : [m[1], m[2], m[3]];
      const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function parseNumber(v: any): number | null {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/[,，￥$%\s]/g, '');
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

export { type CleaningResult, type CleaningReport, type CleaningIssue, type ColumnInfo };
