/**
 * File ingestion (Feature 1). Server-side only.
 * CSV/TSV/JSON/XLSX/PDF(+OCR passthrough detection) with size limits, hashing,
 * duplicate detection and explicit warnings instead of silent failure.
 */
import Papa from 'papaparse';
import crypto from 'node:crypto';

export type ExtractionKind = 'csv' | 'xlsx' | 'json' | 'pdf-text' | 'pdf-ocr' | 'text' | 'failed';

export interface ParsedFile {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  rows: Record<string, unknown>[];
  columns: string[];
  extraction: ExtractionKind;
  warnings: string[];
  pages?: number;
  text?: string;
  sheetNames?: string[];
}

const MAX_ROWS = Number(process.env.MAX_ROWS_PER_DATASET || 25000);

export function detectType(filename: string, mimeType: string, buffer: Buffer): 'csv' | 'xlsx' | 'json' | 'pdf' | 'text' {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (['csv', 'tsv'].includes(ext) || mimeType.includes('csv') || mimeType.includes('tab-separated')) return 'csv';
  if (['xlsx', 'xls', 'xlsm'].includes(ext) || mimeType.includes('spreadsheet')) return 'xlsx';
  if (ext === 'json' || mimeType.includes('json')) return 'json';
  if (ext === 'pdf' || mimeType.includes('pdf')) return 'pdf';
  if (['txt', 'md'].includes(ext) || mimeType.startsWith('text/')) return 'text';
  const head = buffer.subarray(0, 5).toString('latin1');
  if (head === '%PDF-') return 'pdf';
  if (head.startsWith('PK')) return 'xlsx';
  // fall back to sniffing delimiters
  const sample = buffer.subarray(0, 2048).toString('utf8');
  if (sample.includes(',') && sample.includes('\n')) return 'csv';
  return 'text';
}

export function isEncryptedPdf(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 4096).toString('latin1');
  return head.includes('/Encrypt') || head.includes('/Encrypted');
}

export async function parseFile(filename: string, mimeType: string, buffer: Buffer): Promise<ParsedFile> {
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const base: ParsedFile = {
    filename, mimeType, sizeBytes: buffer.length, sha256, rows: [], columns: [], extraction: 'failed', warnings: [],
  };

  const type = detectType(filename, mimeType, buffer);

  try {
    if (type === 'csv') {
      const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
      const delimiter = detectDelimiter(text, filename.endsWith('.tsv') ? '\t' : null);
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true, skipEmptyLines: 'greedy', dynamicTyping: true, delimiter, transformHeader: (h) => h.trim(),
      });
      const rows = (parsed.data as Record<string, unknown>[]).filter((r) => Object.values(r).some((v) => v !== null && v !== '' && v !== undefined));
      base.rows = rows.slice(0, MAX_ROWS);
      base.columns = parsed.meta.fields ?? Object.keys(rows[0] ?? {});
      base.extraction = 'csv';
      if (rows.length > MAX_ROWS) base.warnings.push(`File contains ${rows.length} rows; only the first ${MAX_ROWS} were ingested (configurable via MAX_ROWS_PER_DATASET).`);
      if (parsed.errors.length) base.warnings.push(`${parsed.errors.length} CSV parse warning(s); first: ${parsed.errors[0].message}`);
      if (!base.columns.length) base.warnings.push('No header row detected — file may be malformed.');
      return base;
    }

    if (type === 'json') {
      const raw = JSON.parse(buffer.toString('utf8')) as unknown;
      let arr: Record<string, unknown>[] = [];
      if (Array.isArray(raw)) arr = raw as Record<string, unknown>[];
      else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const key = ['data', 'records', 'players', 'rows', 'items'].find((k) => Array.isArray(obj[k]));
        if (key) arr = obj[key] as Record<string, unknown>[];
        else arr = [obj];
      }
      base.rows = arr.slice(0, MAX_ROWS);
      base.columns = Array.from(new Set(arr.flatMap((r) => Object.keys(r ?? {}))));
      base.extraction = 'json';
      if (!arr.length) base.warnings.push('JSON contained no records.');
      return base;
    }

    if (type === 'xlsx') {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      base.sheetNames = wb.SheetNames;
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false });
      base.rows = rows.slice(0, MAX_ROWS);
      base.columns = rows.length ? Object.keys(rows[0]) : [];
      base.extraction = 'xlsx';
      if (wb.SheetNames.length > 1) base.warnings.push(`Workbook has ${wb.SheetNames.length} sheets (${wb.SheetNames.join(', ')}). Only "${wb.SheetNames[0]}" was ingested; upload other sheets separately.`);
      if (rows.length > MAX_ROWS) base.warnings.push(`Truncated to ${MAX_ROWS} rows.`);
      return base;
    }

    if (type === 'pdf') {
      if (isEncryptedPdf(buffer)) {
        base.extraction = 'failed';
        base.warnings.push('PDF appears to be password-protected/encrypted. Remove the password and re-upload.');
        return base;
      }
      const pdfParse = (await import('pdf-parse')).default as (b: Buffer) => Promise<{ text: string; numpages: number }>;
      const parsed = await pdfParse(buffer);
      base.pages = parsed.numpages;
      base.text = parsed.text;
      const textLen = parsed.text.replace(/\s+/g, '').length;
      if (textLen < 40) {
        base.extraction = 'failed';
        base.warnings.push('No text layer found — this looks like a scanned PDF. OCR is not bundled in the free demo build; enable OCR_PROVIDER and re-run, or upload a CSV export of the same table.');
        return base;
      }
      const table = tableFromText(parsed.text);
      base.rows = table.rows.slice(0, MAX_ROWS);
      base.columns = table.columns;
      base.extraction = 'pdf-text';
      if (table.confidence < 0.6) base.warnings.push(`Table reconstruction confidence is low (${(table.confidence * 100).toFixed(0)}%). Review every extracted row before approving.`);
      if (!base.rows.length) base.warnings.push('Text was extracted but no tabular rows could be reconstructed. Text is preserved below for manual mapping.');
      return base;
    }

    // plain text
    const text = buffer.toString('utf8');
    base.text = text;
    const table = tableFromText(text);
    base.rows = table.rows.slice(0, MAX_ROWS);
    base.columns = table.columns;
    base.extraction = 'text';
    if (!base.rows.length) base.warnings.push('No delimited table detected in text file; raw text preserved.');
    return base;
  } catch (error) {
    base.extraction = 'failed';
    base.warnings.push(`Extraction failed: ${(error as Error).message}. The original file is preserved so it can be retried.`);
    return base;
  }
}

function detectDelimiter(text: string, forced: string | null): string {
  if (forced) return forced;
  const firstLines = text.split(/\r?\n/).slice(0, 5).join('\n');
  const candidates = [',', ';', '\t', '|'];
  let best = ','; let bestCount = 0;
  for (const c of candidates) {
    const count = firstLines.split(c).length - 1;
    if (count > bestCount) { bestCount = count; best = c; }
  }
  return best;
}

/**
 * Heuristic fixed-width / whitespace table reconstruction from PDF or text.
 * Cricket PDFs usually render rows as "Name    Team    M    Runs ..." lines.
 */
export function tableFromText(text: string): { columns: string[]; rows: Record<string, unknown>[]; confidence: number } {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/g, '')).filter((l) => l.trim().length > 0);
  const splitLine = (l: string) => l.trim().split(/\s{2,}|\t|\s*\|\s*/).filter((c) => c.length > 0);
  const candidates = lines.map((l) => ({ line: l, cells: splitLine(l) })).filter((c) => c.cells.length >= 3);
  if (!candidates.length) return { columns: [], rows: [], confidence: 0 };
  // header = the row with most non-numeric cells among the first 15 candidate rows
  const headerIdx = candidates.findIndex((c) => c.cells.filter((x) => !/^-?\d+(\.\d+)?%?$/.test(x)).length >= Math.max(2, c.cells.length - 1));
  if (headerIdx === -1) return { columns: [], rows: [], confidence: 0.2 };
  const header = candidates[headerIdx];
  const columns = header.cells.map((c, i) => (c.length > 1 ? c : `Column ${i + 1}`));
  const bodyRows = candidates.slice(headerIdx + 1).filter((c) => c.cells.length >= Math.max(2, columns.length - 2) && c.cells.some((x) => /\d/.test(x)));
  const rows = bodyRows.map((r) => {
    const row: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      const cell = r.cells[i] ?? null;
      const num = cell !== null && /^-?\d+(\.\d+)?$/.test(cell.trim()) ? Number(cell) : cell;
      row[col] = num;
    });
    return row;
  }).filter((r) => Object.keys(r).length > 0);
  const columnCountFit = bodyRows.length ? bodyRows.filter((r) => r.cells.length === columns.length).length / bodyRows.length : 0;
  const confidence = Number((0.35 + columnCountFit * 0.45 + Math.min(0.2, rows.length / 200)).toFixed(2));
  return { columns, rows, confidence };
}

export function sniffCricketDocument(text: string): { looksCricket: boolean; signals: string[] } {
  const signals: string[] = [];
  const checks: [RegExp, string][] = [
    [/wicket|wkts/i, 'wicket column'], [/strike rate|\bsr\b/i, 'strike rate'], [/economy|\becon\b/i, 'economy'],
    [/innings|inns/i, 'innings'], [/overs|\bov\b/i, 'overs'], [/batting|bowling/i, 'batting/bowling section'],
    [/date of birth|\bdob\b/i, 'date of birth'], [/auction|base price|sold/i, 'auction terms'],
  ];
  for (const [re, label] of checks) if (re.test(text)) signals.push(label);
  return { looksCricket: signals.length >= 2, signals };
}
