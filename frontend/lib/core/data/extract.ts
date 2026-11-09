/**
 * Record extraction & validation (Features 2/3/26).
 * Creates DatasetRecord objects with confidence, issues, preserved unknown
 * columns and provenance. Nothing is imputed.
 */
import {
  FIELD_SPECS, computeAge, matchColumn, normaliseName, parseBool, parseDate, parseNumber, type CanonicalField, type FieldSpec,
} from './synonyms';
import type { DatasetRecord } from '../types';

export interface MappingEntry { canonical: CanonicalField; sourceColumn: string; confidence: number }

export function buildMapping(columns: string[]): { mapping: MappingEntry[]; unknownColumns: string[] } {
  const mapping: MappingEntry[] = [];
  const unknownColumns: string[] = [];
  const taken = new Set<CanonicalField>();
  for (const col of columns) {
    const m = matchColumn(col);
    if (m.field && !taken.has(m.field)) {
      mapping.push({ canonical: m.field, sourceColumn: col, confidence: m.confidence });
      taken.add(m.field);
    } else {
      unknownColumns.push(col);
    }
  }
  return { mapping, unknownColumns };
}

const specFor = (field: CanonicalField): FieldSpec | undefined => FIELD_SPECS.find((s) => s.field === field);

export function extractRecords(
  rows: Record<string, unknown>[],
  columns: string[],
  opts: { datasetId: string; referenceDate: string; sourceName: string; startRow?: number },
): { records: DatasetRecord[]; mapping: MappingEntry[]; unknownColumns: string[]; summary: { matched: number; totalCells: number; rowsWithName: number } } {
  const { mapping, unknownColumns } = buildMapping(columns);
  const now = new Date().toISOString();
  let matchedCells = 0; let totalCells = 0; let rowsWithName = 0;

  const records = rows.map((row, idx) => {
    const issues: DatasetRecord['issues'] = [];
    const fields: Record<string, string | number | null> = {};
    const unknownFields: Record<string, string> = {};
    const mapped: Record<string, unknown> = {};

    for (const col of columns) {
      const raw = row[col];
      const value = raw === undefined || raw === null ? null : typeof raw === 'number' ? raw : String(raw).trim();
      fields[col] = value === '' ? null : value;
    }
    for (const col of unknownColumns) {
      const v = fields[col];
      if (v !== null && v !== undefined) unknownFields[col] = String(v);
    }

    for (const m of mapping) {
      const raw = row[m.sourceColumn];
      totalCells++;
      if (raw === null || raw === undefined || String(raw).trim() === '') {
        if (m.canonical === 'name') issues.push({ field: 'name', severity: 'error', message: 'Row has no player name — row cannot be matched and will be skipped.' });
        continue;
      }
      matchedCells++;
      const spec = specFor(m.canonical);
      if (spec?.type === 'number') {
        let num = parseNumber(raw);
        if (m.canonical === 'overs' && num !== null) {
          // "12.4" means 12 overs 4 balls → convert to balls
          const whole = Math.floor(num); const balls = Math.round((num - whole) * 10);
          if (balls > 5) issues.push({ field: m.canonical, severity: 'warn', message: `Overs value "${String(raw)}" has ${balls} balls (invalid); treated as ${whole}.${balls}` });
          mapped.overs = `${whole}.${balls}`;
          mapped.bowlingBalls = whole * 6 + Math.min(5, balls);
        } else if (m.canonical === 'highScore') {
          const str = String(raw);
          if (str.includes('*')) { mapped.highScoreNotOut = true; issues.push({ field: m.canonical, severity: 'info', message: 'High score was marked not-out (*).' }); }
          mapped.highScore = num;
        } else if (spec.min !== undefined && num !== null && num < spec.min) {
          issues.push({ field: m.canonical, severity: 'error', message: `${spec.label} below plausible minimum (${spec.min}): ${num}` });
        } else if (spec.max !== undefined && num !== null && num > spec.max) {
          issues.push({ field: m.canonical, severity: 'warn', message: `${spec.label} above plausible maximum (${spec.max}): ${num} — verify source.` });
          mapped[m.canonical] = num;
        } else {
          mapped[m.canonical] = num;
        }
      } else if (spec?.type === 'date') {
        const d = parseDate(raw);
        if (d.ambiguous) issues.push({ field: m.canonical, severity: 'warn', message: `Date "${String(raw)}" is day/month ambiguous — confirm the intended value.` });
        if (!d.iso) issues.push({ field: m.canonical, severity: 'warn', message: `Could not parse date "${String(raw)}"; left empty rather than guessed.` });
        mapped[m.canonical] = d.iso;
      } else if (spec?.type === 'boolean') {
        const b = parseBool(raw);
        if (b === null && spec) issues.push({ field: m.canonical, severity: 'warn', message: `Unrecognised boolean "${String(raw)}".` });
        mapped[m.canonical] = b;
      } else {
        mapped[m.canonical] = String(raw).trim();
      }
    }

    // Name hygiene checks
    const rawName = String(mapped.name ?? '').trim();
    if (rawName) {
      rowsWithName++;
      if (/^[^a-zA-Z]*$/.test(rawName)) issues.push({ field: 'name', severity: 'error', message: 'Name contains no letters.' });
      if (rawName === rawName.toUpperCase() && rawName.length > 4 && /[A-Z]{3,}\s[A-Z]{3,}/.test(rawName)) issues.push({ field: 'name', severity: 'info', message: 'Name is all-caps in the source; formatting normalised for display only.' });
      if (/\d/.test(rawName)) issues.push({ field: 'name', severity: 'warn', message: 'Name contains digits — possible row misalignment.' });
      mapped.normalisedName = normaliseName(rawName);
    } else {
      issues.push({ field: 'name', severity: 'error', message: 'Missing player name.' });
    }

    // Age derivation, never fabricated
    const dob = typeof mapped.dob === 'string' ? mapped.dob : null;
    const ageFromDob = computeAge(dob, opts.referenceDate);
    const ageGiven = typeof mapped.age === 'number' ? mapped.age : null;
    if (ageFromDob !== null && ageGiven !== null && Math.abs(ageFromDob - ageGiven) > 1) {
      issues.push({ field: 'age', severity: 'warn', message: `Stated age ${ageGiven} conflicts with DOB-derived age ${ageFromDob} at reference date ${opts.referenceDate}; DOB wins.` });
    }
    mapped.age = ageFromDob ?? ageGiven;

    // Cross-field plausibility
    const runs = Number(mapped.runs ?? NaN); const balls = Number(mapped.balls ?? NaN);
    if (Number.isFinite(runs) && Number.isFinite(balls) && balls > 0 && runs / balls > 4) {
      issues.push({ field: 'runs', severity: 'warn', message: `Implausible strike rate (${(runs / balls * 100).toFixed(0)} per 100 balls) — verify runs/balls columns.` });
    }
    const wickets = Number(mapped.wickets ?? NaN); const bBalls = Number(mapped.bowlingBalls ?? NaN);
    if (Number.isFinite(wickets) && Number.isFinite(bBalls) && bBalls > 0 && wickets > bBalls / 3) {
      issues.push({ field: 'wickets', severity: 'warn', message: `Wickets (${wickets}) implausible for ${bBalls} balls bowled.` });
    }
    if (Number.isFinite(wickets) && Number(mapped.matches ?? NaN) > 0 && wickets > Number(mapped.matches) * 6) {
      issues.push({ field: 'wickets', severity: 'warn', message: 'Wickets exceed 6 per match — likely a column misalignment.' });
    }

    const mappedFieldCount = Object.keys(mapped).filter((k) => !['normalisedName', 'overs', 'highScoreNotOut'].includes(k)).length;
    const maxFields = Math.max(1, mapping.length);
    const evidence = mappedFieldCount / maxFields;
    // a flagged value must never out-score a clean record just because it filled more cells
    const penalty = issues.filter((i) => i.severity === 'error').length * 0.2 + issues.filter((i) => i.severity === 'warn').length * 0.08;
    const confidence = Math.max(0.05, Math.min(0.99, 0.35 + evidence * 0.62 - penalty));

    return {
      id: `rec_${opts.datasetId}_${idx + 1}`,
      datasetId: opts.datasetId,
      playerName: rawName || `Row ${(opts.startRow ?? 1) + idx}`,
      fields,
      mapped: mapped as DatasetRecord['mapped'],
      confidence: Number(confidence.toFixed(2)),
      issues,
      status: issues.some((i) => i.severity === 'error') ? 'pending' : 'pending',
      sourceRow: (opts.startRow ?? 1) + idx,
      unknownFields,
      updatedAt: now,
      version: 1,
    } satisfies DatasetRecord;
  });

  return {
    records,
    mapping,
    unknownColumns,
    summary: { matched: records.length, totalCells, rowsWithName },
  };
}

/** Validate a single record (used by the editable preview table). */
export function validateRecord(record: DatasetRecord, referenceDate: string): DatasetRecord['issues'] {
  const issues: DatasetRecord['issues'] = [];
  const m = record.mapped as Record<string, unknown>;
  if (!record.playerName || record.playerName.startsWith('Row ')) issues.push({ field: 'name', severity: 'error', message: 'Player name required.' });
  const dob = typeof m.dob === 'string' ? m.dob : null;
  const ageFromDob = computeAge(dob, referenceDate);
  if (dob && ageFromDob === null) issues.push({ field: 'dob', severity: 'error', message: 'DOB is invalid or implies an implausible age.' });
  if (!dob && typeof m.age !== 'number') issues.push({ field: 'age', severity: 'warn', message: 'No DOB or age — age filters will exclude this player.' });
  const runs = Number(m.runs ?? NaN); const balls = Number(m.balls ?? NaN);
  if (Number.isFinite(runs) && Number.isFinite(balls) && balls > 0 && runs / balls > 4) issues.push({ field: 'runs', severity: 'warn', message: 'Implausible strike rate.' });
  return issues;
}
