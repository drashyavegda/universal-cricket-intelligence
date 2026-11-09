/**
 * Multi-file merging with identity matching and conflict detection (Feature 4).
 * Ambiguous matches are surfaced to a human; nothing is merged silently.
 */
import { nameKey, parseDate, computeAge } from './synonyms';
import type { DatasetRecord } from '../types';

export interface MergedField {
  field: string;
  values: { value: string | number | null; sourceDataset: string; recordId: string; confidence: number }[];
  conflict: boolean;
  resolvedValue: string | number | null;
  resolution: 'single-source' | 'highest-confidence' | 'identical' | 'unresolved' | 'manual';
}

export interface MergeCandidate {
  key: string;
  displayName: string;
  recordIds: string[];
  datasetIds: string[];
  matchConfidence: number;
  status: 'auto-matched' | 'needs-review' | 'conflict';
  fields: MergedField[];
  conflicts: string[];
  provenance: { datasetId: string; recordId: string; row: number; confidence: number }[];
}

const NUMERIC_FIELDS = new Set(['runs', 'balls', 'fours', 'sixes', 'wickets', 'runsConceded', 'matches', 'innings', 'catches', 'stumpings', 'bowlingBalls', 'age', 'basePrice', 'soldPrice']);

export function mergeDatasets(input: { datasetId: string; records: DatasetRecord[] }[], opts: { ageReference: string }): {
  candidates: MergeCandidate[]; stats: { groups: number; autoMatched: number; needsReview: number; conflicts: number; unmatched: number };
} {
  const groups = new Map<string, { record: DatasetRecord; datasetId: string }[]>();
  for (const ds of input) {
    for (const r of ds.records) {
      const key = nameKey(r.playerName) || r.playerName.toLowerCase().trim();
      groups.set(key, [...(groups.get(key) ?? []), { record: r, datasetId: ds.datasetId }]);
    }
  }

  const candidates: MergeCandidate[] = [];
  for (const [key, entries] of groups) {
    const fieldNames = new Set<string>();
    entries.forEach((e) => {
      Object.entries(e.record.mapped as Record<string, unknown>).forEach(([k, v]) => {
        if (v !== null && v !== undefined && k !== 'normalisedName') fieldNames.add(k);
      });
    });
    const fields: MergedField[] = [];
    for (const field of fieldNames) {
      const values = entries
        .map((e) => ({ value: (e.record.mapped as Record<string, unknown>)[field] as string | number | null, sourceDataset: e.datasetId, recordId: e.record.id, confidence: e.record.confidence }))
        .filter((v) => v.value !== null && v.value !== undefined && v.value !== '');
      const distinct = new Set(values.map((v) => String(v.value).trim().toLowerCase()));
      let conflict = false;
      if (distinct.size > 1 && NUMERIC_FIELDS.has(field)) {
        const nums = values.map((v) => Number(v.value)).filter((n) => Number.isFinite(n));
        if (nums.length > 1) {
          const spread = Math.max(...nums) - Math.min(...nums);
          const tolerance = field === 'age' ? 1 : Math.max(2, Math.abs(Math.max(...nums)) * 0.02);
          conflict = spread > tolerance;
        }
      } else if (distinct.size > 1 && ['dob', 'team', 'role'].includes(field)) {
        conflict = true;
      }
      const best = [...values].sort((a, b) => b.confidence - a.confidence)[0];
      fields.push({
        field, values, conflict,
        resolvedValue: conflict ? null : best ? best.value : null,
        resolution: distinct.size <= 1 ? 'identical' : conflict ? 'unresolved' : 'highest-confidence',
      });
    }

    const dobVal = fields.find((f) => f.field === 'dob')?.resolvedValue;
    const ageField = fields.find((f) => f.field === 'age');
    if (ageField && typeof dobVal === 'string') {
      const derived = computeAge(parseDate(dobVal).iso, opts.ageReference);
      if (derived !== null) { ageField.resolvedValue = derived; ageField.resolution = ageField.resolution === 'unresolved' ? 'unresolved' : 'manual'; }
    }

    const conflicts = fields.filter((f) => f.conflict).map((f) => f.field);
    const recordIds = entries.map((e) => e.record.id);
    const datasetIds = [...new Set(entries.map((e) => e.datasetId))];
    const matchConfidence = entries.length > 1
      ? Math.min(0.99, 0.6 + 0.1 * datasetIds.length + (conflicts.length ? -0.15 : 0.2))
      : 0.95;
    candidates.push({
      key,
      displayName: entries[0].record.playerName,
      recordIds, datasetIds,
      matchConfidence: Number(matchConfidence.toFixed(2)),
      status: conflicts.length ? 'conflict' : entries.length > 1 && matchConfidence < 0.75 ? 'needs-review' : 'auto-matched',
      fields,
      conflicts,
      provenance: entries.map((e) => ({ datasetId: e.datasetId, recordId: e.record.id, row: e.record.sourceRow, confidence: e.record.confidence })),
    });
  }

  const stats = {
    groups: candidates.length,
    autoMatched: candidates.filter((c) => c.status === 'auto-matched').length,
    needsReview: candidates.filter((c) => c.status === 'needs-review').length,
    conflicts: candidates.filter((c) => c.status === 'conflict').length,
    unmatched: candidates.filter((c) => c.recordIds.length === 1).length,
  };
  return { candidates: candidates.sort((a, b) => b.conflicts.length - a.conflicts.length), stats };
}

/** Apply human decisions to a merge candidate, producing a player-shaped patch. */
export function resolveMerge(candidate: MergeCandidate, decisions: Record<string, string | number | null>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of candidate.fields) {
    const decided = decisions[f.field];
    const value = decided !== undefined ? decided : f.resolvedValue;
    if (value !== null && value !== undefined && value !== '') patch[f.field] = value;
  }
  return patch;
}
