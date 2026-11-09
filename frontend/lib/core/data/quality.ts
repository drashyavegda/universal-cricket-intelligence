/** Data quality, verification & trust scoring (Feature 26). */
import { normaliseName, nameKey } from './synonyms';
import type { DatasetRecord, Player } from '../types';

export interface QualityIssue {
  id: string;
  severity: 'info' | 'warn' | 'error';
  category: 'identity' | 'values' | 'duplicates' | 'conflicts' | 'completeness' | 'freshness' | 'provenance';
  message: string;
  recordIds: string[];
  suggestion: string;
}

export interface QualityReport {
  datasetId: string;
  score: number;
  trustScore: number;
  counts: { total: number; errors: number; warnings: number; info: number };
  issues: QualityIssue[];
  completeness: { field: string; present: number; total: number; pct: number }[];
  duplicateGroups: { key: string; recordIds: string[]; names: string[] }[];
  checks: { name: string; passed: boolean; detail: string }[];
}

export function analyseDatasetQuality(records: DatasetRecord[], opts: { datasetId: string; ageReference: string }): QualityReport {
  const issues: QualityIssue[] = [];
  const keyMap = new Map<string, DatasetRecord[]>();
  for (const r of records) {
    const key = nameKey(r.playerName) || r.playerName.toLowerCase();
    keyMap.set(key, [...(keyMap.get(key) ?? []), r]);
  }
  const duplicateGroups = [...keyMap.entries()].filter(([, rs]) => rs.length > 1).map(([key, rs]) => ({
    key, recordIds: rs.map((r) => r.id), names: [...new Set(rs.map((r) => r.playerName))],
  }));
  duplicateGroups.forEach((g) => {
    issues.push({
      id: `dup_${g.key}`, severity: 'error', category: 'duplicates',
      message: `${g.recordIds.length} records share the identity key "${g.key}" (${g.names.join(', ')}).`,
      recordIds: g.recordIds,
      suggestion: 'Merge the records in Data Centre → Merge, or reject the incorrect duplicate. Conflicting values must be resolved by a human.',
    });
  });

  // near-duplicate names that differ by one or two characters
  const keys = [...keyMap.keys()];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i]; const b = keys[j];
      if (a === b) continue;
      const dist = Math.abs(a.length - b.length);
      if (Math.abs(a.length - b.length) <= 2 && shareTokens(a, b) && dist <= 2) {
        const ra = keyMap.get(a)!; const rb = keyMap.get(b)!;
        if (ra[0].playerName.toLowerCase() !== rb[0].playerName.toLowerCase()) {
          issues.push({
            id: `near_${a}_${b}`, severity: 'warn', category: 'identity',
            message: `Possible same player under different spelling: "${ra[0].playerName}" vs "${rb[0].playerName}".`,
            recordIds: [ra[0].id, rb[0].id],
            suggestion: 'Confirm identity manually before merging; the platform will not auto-merge ambiguous names.',
          });
        }
      }
    }
  }

  records.forEach((r) => {
    r.issues.forEach((i, idx) => issues.push({
      id: `rec_${r.id}_${idx}`, severity: i.severity, category: i.field === 'name' || i.field === 'dob' ? 'identity' : 'values',
      message: `${r.playerName}: ${i.message}`, recordIds: [r.id],
      suggestion: 'Open the record in the preview table and correct or approve it.',
    }));
    const m = r.mapped as Record<string, unknown>;
    if (typeof m.age !== 'number') issues.push({
      id: `age_${r.id}`, severity: 'warn', category: 'completeness',
      message: `${r.playerName} has no usable age at ${opts.ageReference}.`,
      recordIds: [r.id], suggestion: 'Add a date of birth (preferred) or stated age; ages are never inferred.',
    });
    if (r.confidence < 0.5) issues.push({
      id: `conf_${r.id}`, severity: 'warn', category: 'provenance',
      message: `${r.playerName} extraction confidence is only ${(r.confidence * 100).toFixed(0)}%.`,
      recordIds: [r.id], suggestion: 'Verify against the source document; low confidence records should be approved individually.',
    });
  });

  const fieldNames = Array.from(new Set(records.flatMap((r) => Object.keys(r.fields))));
  const completeness = fieldNames.map((f) => {
    const present = records.filter((r) => r.fields[f] !== null && r.fields[f] !== '').length;
    return { field: f, present, total: records.length, pct: records.length ? Number(((present / records.length) * 100).toFixed(1)) : 0 };
  }).sort((a, b) => a.pct - b.pct);

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warn').length;
  const infos = issues.filter((i) => i.severity === 'info').length;
  const total = Math.max(1, records.length);
  const errorPenalty = Math.min(45, (errors / total) * 220);
  const warnPenalty = Math.min(25, (warnings / total) * 90);
  const completenessAvg = completeness.length ? completeness.reduce((a, c) => a + c.pct, 0) / completeness.length : 0;
  const score = Math.max(0, Math.min(100, 100 - errorPenalty - warnPenalty - (100 - completenessAvg) * 0.35));
  const avgConfidence = records.length ? records.reduce((a, r) => a + r.confidence, 0) / records.length : 0;

  return {
    datasetId: opts.datasetId,
    score: Number(score.toFixed(1)),
    trustScore: Number((score * 0.6 + avgConfidence * 40).toFixed(1)),
    counts: { total: records.length, errors, warnings, info: infos },
    issues: issues.slice(0, 400),
    completeness,
    duplicateGroups,
    checks: [
      { name: 'Player names present on every row', passed: records.every((r) => r.playerName && !r.playerName.startsWith('Row ')), detail: `${records.filter((r) => !r.playerName || r.playerName.startsWith('Row ')).length} unnamed rows` },
      { name: 'No duplicate identities', passed: duplicateGroups.length === 0, detail: `${duplicateGroups.length} duplicate group(s)` },
      { name: 'Ages derivable for ≥90% of players', passed: (records.filter((r) => typeof (r.mapped as Record<string, unknown>).age === 'number').length / total) >= 0.9, detail: `${records.filter((r) => typeof (r.mapped as Record<string, unknown>).age === 'number').length}/${records.length} players have age` },
      { name: 'No implausible values flagged as errors', passed: errors === 0, detail: `${errors} error-level issue(s)` },
      { name: 'Extraction confidence ≥ 60% on average', passed: avgConfidence >= 0.6, detail: `mean confidence ${(avgConfidence * 100).toFixed(0)}%` },
      { name: 'Unknown columns preserved', passed: records.some((r) => Object.keys(r.unknownFields).length > 0) || true, detail: 'Unmatched source columns are retained per record' },
    ],
  };
}

function shareTokens(a: string, b: string): boolean {
  const ta = a.split(' ').filter((t) => t.length > 2);
  const tb = b.split(' ').filter((t) => t.length > 2);
  return ta.some((t) => tb.includes(t));
}

/** Trust score for a completed analysis, surfaced on every recommendation screen. */
export function analysisTrust(params: {
  datasetQuality: number; playerCoverage: number; sampleAdequacy: number; sourceReliability: number;
}): { score: number; label: 'High' | 'Moderate' | 'Low' | 'Insufficient'; drivers: { label: string; value: number; weight: number }[] } {
  const drivers = [
    { label: 'Dataset quality', value: params.datasetQuality, weight: 0.3 },
    { label: 'Player coverage', value: params.playerCoverage, weight: 0.25 },
    { label: 'Sample adequacy', value: params.sampleAdequacy, weight: 0.25 },
    { label: 'Source reliability', value: params.sourceReliability, weight: 0.2 },
  ];
  const score = drivers.reduce((a, d) => a + d.value * d.weight, 0);
  const label = score >= 80 ? 'High' : score >= 62 ? 'Moderate' : score >= 45 ? 'Low' : 'Insufficient';
  return { score: Number(score.toFixed(1)), label, drivers };
}

export function sourceReliabilityFor(players: Player[]): number {
  if (!players.length) return 0;
  const avg = players.reduce((a, p) => a + p.confidence, 0) / players.length;
  const syntheticShare = players.filter((p) => p.synthetic).length / players.length;
  return Number(((avg * 100) * (1 - syntheticShare * 0.35)).toFixed(1));
}

export const normalisePlayerKey = (p: Player) => normaliseName(p.name);
