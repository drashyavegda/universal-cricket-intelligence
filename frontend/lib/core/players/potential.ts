/**
 * Potential model (Feature 6/22). Potential is deliberately separate from
 * demonstrated performance and is always returned as a distribution.
 */
import { linearRegression, mean, sd } from '../stats/descriptive';
import { ageHeadroom } from '../ranking/presets';
import type { CohortRow } from './metrics';
import type { Player } from '../types';

export interface PotentialResult {
  playerId: string;
  name: string;
  age: number | null;
  demonstrated: number;
  potential: number;
  band: 'Elite headroom' | 'High headroom' | 'Moderate headroom' | 'Limited headroom' | 'Unknown (no DOB)';
  scenarios: { label: 'low' | 'expected' | 'high'; score: number; note: string }[];
  drivers: { label: string; value: string; effect: 'positive' | 'neutral' | 'negative'; detail: string }[];
  improvementSlope: number | null;
  seasonsTracked: number;
  confidence: number;
  caveats: string[];
}

const percentileAvg = (row: CohortRow, keys: string[]): number | null => {
  const vals = keys.map((k) => row.percentiles[k]).filter((v): v is number => v !== null);
  return vals.length ? mean(vals) : null;
};

export function assessPotential(row: CohortRow): PotentialResult {
  const p = row.player;
  const battingPct = percentileAvg(row, ['batting.average', 'batting.strikeRate', 'batting.runsPerInnings', 'phase.powerplaySR', 'phase.deathSR']);
  const bowlingPct = percentileAvg(row, ['bowling.economy', 'bowling.average', 'bowling.strikeRate', 'phase.deathEcon']);
  const consistencyPct = percentileAvg(row, ['consistency.floorRate', 'consistency.cv', 'form.formIndex']);
  const demonstrated = Math.max(battingPct ?? 0, bowlingPct ?? 0) * 0.65 + Math.min(battingPct ?? 0, bowlingPct ?? 0) * 0.2 + (consistencyPct ?? 0) * 0.15;

  const seasonRuns = p.career.map((s) => s.runs);
  const seasonWkts = p.career.map((s) => s.wickets);
  const slopeRuns = seasonRuns.length >= 3 ? linearRegression(seasonRuns.map((_, i) => i), seasonRuns)?.slope ?? null : null;
  const slopeWkts = seasonWkts.length >= 3 ? linearRegression(seasonWkts.map((_, i) => i), seasonWkts)?.slope ?? null : null;
  const improvement = slopeRuns !== null ? Math.max(-1, Math.min(1, slopeRuns / Math.max(20, mean(seasonRuns) ?? 20))) : null;

  const headroom = ageHeadroom(p.age);
  const sampleReliability = Math.min(1, Math.max(p.batting.balls, p.bowling.balls) / 400);
  const dobKnown = p.age !== null;

  const potentialRaw = demonstrated * 0.58 + headroom * 34 + (improvement ?? 0) * 12 + sampleReliability * 8;
  const potential = Math.max(0, Math.min(100, potentialRaw));

  const band: PotentialResult['band'] = !dobKnown ? 'Unknown (no DOB)'
    : potential >= 75 ? 'Elite headroom' : potential >= 62 ? 'High headroom' : potential >= 48 ? 'Moderate headroom' : 'Limited headroom';

  const spreadBase = 6 + (1 - sampleReliability) * 12 + (dobKnown ? 0 : 8);
  const scenarios = [
    { label: 'low' as const, score: Math.max(0, Number((potential - spreadBase * 1.1).toFixed(1))), note: 'Limited development, role unchanged, similar competition strength.' },
    { label: 'expected' as const, score: Number(potential.toFixed(1)), note: 'Current trajectory continues at the same competition level.' },
    { label: 'high' as const, score: Math.min(100, Number((potential + spreadBase).toFixed(1))), note: 'Step up in competition handled well plus a defined technical gain.' },
  ];

  const drivers: PotentialResult['drivers'] = [
    { label: 'Age headroom', value: p.age === null ? 'unknown' : `${p.age} yrs`, effect: headroom > 0.5 ? 'positive' : headroom > 0.2 ? 'neutral' : 'negative', detail: `Headroom multiplier ${headroom.toFixed(2)} (full ≤19, zero ≥31).` },
    { label: 'Demonstrated level', value: `${demonstrated.toFixed(1)}/100`, effect: demonstrated > 60 ? 'positive' : demonstrated > 40 ? 'neutral' : 'negative', detail: 'Best-format percentile blend of batting and bowling impact.' },
    { label: 'Season-on-season trend', value: slopeRuns === null ? 'insufficient seasons' : `${slopeRuns >= 0 ? '+' : ''}${slopeRuns.toFixed(1)} runs/season`, effect: (improvement ?? 0) > 0.05 ? 'positive' : (improvement ?? 0) < -0.05 ? 'negative' : 'neutral', detail: 'Ordinary least squares over season totals; 3+ seasons required.' },
    { label: 'Sample reliability', value: `${(sampleReliability * 100).toFixed(0)}%`, effect: sampleReliability > 0.6 ? 'positive' : 'neutral', detail: 'Balls faced/bowled relative to a 400-ball reference.' },
  ];

  const caveats = [
    'Potential is a projection with explicit assumptions, not a prediction of international success.',
    dobKnown ? 'Age is computed from date of birth at the workspace reference date.' : 'DOB missing — age-dependent terms use a neutral 0.5 multiplier and the band is marked unknown.',
    'Competition strength is not directly modelled in demo mode; treat cross-league comparisons cautiously.',
    `Simulated range ±${spreadBase.toFixed(1)} points reflects sample size and DOB availability only.`,
  ];

  return {
    playerId: p.id, name: p.name, age: p.age,
    demonstrated: Number(demonstrated.toFixed(1)),
    potential: Number(potential.toFixed(1)),
    band, scenarios, drivers,
    improvementSlope: slopeRuns === null ? null : Number(slopeRuns.toFixed(2)),
    seasonsTracked: p.career.length,
    confidence: Number((0.4 + sampleReliability * 0.45 + (dobKnown ? 0.15 : 0)).toFixed(2)),
    caveats,
  };
}

export function potentialForPlayers(rows: CohortRow[]): PotentialResult[] {
  return rows.map(assessPotential).sort((a, b) => b.potential - a.potential);
}

export function talentCohort(players: Player[], maxAge: number, minAge = 16): Player[] {
  return players.filter((p) => p.age !== null && p.age >= minAge && p.age <= maxAge && !p.capped);
}

export function ageDistribution(players: Player[]): { bucket: string; count: number }[] {
  const buckets = ['16-18', '19-20', '21-22', '23-24', '25-26', '27-29', '30+'];
  return buckets.map((b) => {
    const [lo, hi] = b === '30+' ? [30, 99] : b.split('-').map(Number);
    return { bucket: b, count: players.filter((p) => p.age !== null && p.age >= lo && p.age <= (b === '16-18' ? 18 : hi)).length };
  });
}

export const sdOf = sd;
