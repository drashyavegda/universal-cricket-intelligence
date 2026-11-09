/**
 * Ranking & recommendation engine.
 * Deterministic: score = Σ(wᵢ · percentileᵢ) / Σwᵢ, then an explicit evidence
 * adjustment. Nothing here calls an AI model — narration is layered on top.
 */
import { spearman, mean } from '../stats/descriptive';
import { buildCohort, type CohortRow } from '../players/metrics';
import { METRIC_BY_KEY, STRATEGY_PRESETS, ageHeadroom, type StrategyPreset } from './presets';
import type { MatchEvent, Player, PlayerRole } from '../types';

export interface RankOptions {
  weights: Record<string, number>;
  roles?: PlayerRole[];
  minAge?: number | null;
  maxAge?: number | null;
  requireAge?: boolean;
  excludedRoles?: PlayerRole[];
  ageWeight?: number;
  minBalls?: number;
  limit?: number;
  presetKey?: string;
  competition?: string;
  format?: string;
  /** extra filters used by team-aware ranking */
  excludePlayerIds?: string[];
}

export interface RankedPlayer {
  rank: number;
  player: Player;
  score: number;
  rawScore: number;
  evidenceAdjustment: number;
  ageBonus: number;
  reliability: number;
  components: { key: string; label: string; weight: number; percentile: number | null; contribution: number; missing: boolean }[];
  positives: string[];
  negatives: string[];
  explanation: string;
  coverage: number;
}

export interface RankingResult {
  rows: RankedPlayer[];
  cohortSize: number;
  missingMetrics: string[];
  weightSum: number;
  presetKey: string;
  sensitivity: { key: string; label: string; spearman: number | null; maxRankShift: number }[];
  assumptions: string[];
}

export function presetByKey(key: string): StrategyPreset | undefined {
  return STRATEGY_PRESETS.find((p) => p.key === key);
}

function reliabilityScore(p: Player, row: CohortRow): number {
  const balls = p.batting.balls;
  const bowlingBalls = p.bowling.balls;
  const sample = Math.max(balls, bowlingBalls * 1.4);
  const sampleFactor = Math.min(1, sample / 420);
  return Math.max(0.15, Math.min(1, 0.45 * p.confidence + 0.35 * sampleFactor + 0.2 * (p.dob ? 1 : 0.6)));
}

export function rankPlayers(players: Player[], options: RankOptions, events?: MatchEvent[]): RankingResult {
  const weights = Object.fromEntries(Object.entries(options.weights).filter(([, w]) => Number.isFinite(w) && w > 0));
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);

  let cohort = buildCohort(players, events);
  let filtered = cohort;
  if (options.roles?.length) filtered = filtered.filter((r) => options.roles!.includes(r.player.role));
  if (options.excludedRoles?.length) filtered = filtered.filter((r) => !options.excludedRoles!.includes(r.player.role));
  if (options.minAge != null) filtered = filtered.filter((r) => r.player.age !== null && r.player.age >= options.minAge!);
  if (options.maxAge != null) filtered = filtered.filter((r) => r.player.age !== null && r.player.age <= options.maxAge!);
  if (options.requireAge) filtered = filtered.filter((r) => r.player.age !== null);
  if (options.minBalls) filtered = filtered.filter((r) => Math.max(r.player.batting.balls, r.player.bowling.balls) >= options.minBalls!);
  if (options.competition) filtered = filtered.filter((r) => r.player.competition === options.competition);
  if (options.format) filtered = filtered.filter((r) => r.player.format === options.format);
  if (options.excludePlayerIds?.length) filtered = filtered.filter((r) => !options.excludePlayerIds!.includes(r.player.id));

  // percentiles are recomputed inside the filtered cohort so comparisons are like-for-like
  const scoped = buildCohort(filtered.map((r) => r.player), events);
  cohort = scoped;

  const missingMetrics = Object.keys(weights).filter((k) => scoped.every((r) => r.percentiles[k] === null));

  const scored = scoped.map((row) => {
    let total = 0; let used = 0;
    const components: RankedPlayer['components'] = [];
    for (const [key, w] of Object.entries(weights)) {
      const pct = row.percentiles[key] ?? null;
      const def = METRIC_BY_KEY[key];
      const contribution = pct === null ? 0 : (pct * w) / weightSum;
      components.push({
        key, label: def?.label ?? key, weight: w, percentile: pct, contribution: Number(contribution.toFixed(3)), missing: pct === null,
      });
      if (pct !== null) { total += contribution; used += w; }
    }
    const coverage = weightSum > 0 ? used / weightSum : 0;
    const rawScore = coverage > 0 ? total / coverage : 0;
    const reliability = reliabilityScore(row.player, row);
    const evidenceAdjustment = 0.82 + 0.18 * reliability;
    const ageBonus = options.ageWeight ? (ageHeadroom(row.player.age) * options.ageWeight * 100) : 0;
    const score = rawScore * evidenceAdjustment + ageBonus;
    const sorted = [...components].filter((c) => c.percentile !== null).sort((a, b) => b.contribution - a.contribution);
    const positives = sorted.slice(0, 3).map((c) => `${c.label}: ${c.percentile!.toFixed(0)}th percentile in this cohort`);
    const negatives = [...sorted].reverse().filter((c) => (c.percentile ?? 0) < 40).slice(0, 2)
      .map((c) => `${c.label} below cohort median (${c.percentile!.toFixed(0)}th percentile)`);
    return {
      player: row.player, score: Number(score.toFixed(2)), rawScore: Number(rawScore.toFixed(2)),
      evidenceAdjustment: Number(evidenceAdjustment.toFixed(3)), ageBonus: Number(ageBonus.toFixed(2)),
      reliability: Number(reliability.toFixed(3)), components, positives, negatives, coverage,
      rank: 0,
      explanation: `Weighted percentile score ${rawScore.toFixed(1)}/100 over ${components.filter((c) => !c.missing).length} metrics; evidence adjustment ×${evidenceAdjustment.toFixed(2)} (reliability ${(reliability * 100).toFixed(0)}%)${ageBonus ? `; +${ageBonus.toFixed(1)} age headroom` : ''}.`,
    };
  }).sort((a, b) => b.score - a.score);

  scored.forEach((r, i) => (r.rank = i + 1));

  // Sensitivity: perturb each weight ±20% and measure how much the ordering moves.
  const baseOrder = scored.map((r) => r.player.id);
  const sensitivity = Object.keys(weights).map((key) => {
    const factor = 1.2;
    const newWeightSum = weightSum + weights[key] * (factor - 1);
    const alt = scored.map((r) => {
      const pct = r.components.find((c) => c.key === key)?.percentile ?? null;
      if (pct === null || newWeightSum === 0) return r.score;
      const newRaw = (r.rawScore * weightSum - pct * weights[key] * (1 - factor)) / newWeightSum;
      return newRaw * r.evidenceAdjustment + r.ageBonus;
    });
    const altOrder = scored.map((r, i) => ({ id: r.player.id, v: alt[i] })).sort((a, b) => b.v - a.v).map((x) => x.id);
    const rho = spearman(baseOrder.map((_, i) => i + 1), altOrder.map((id) => baseOrder.indexOf(id) + 1));
    const maxShift = Math.max(...altOrder.map((id, i) => Math.abs(i - baseOrder.indexOf(id))));
    return { key, label: METRIC_BY_KEY[key]?.label ?? key, spearman: rho === null ? null : Number(rho.toFixed(3)), maxRankShift: maxShift };
  }).sort((a, b) => (a.spearman ?? 1) - (b.spearman ?? 1));

  const assumptions = [
    `Scores are percentile ranks computed inside a cohort of ${scoped.length} players that pass the filters, then weighted.`,
    'Evidence adjustment shrinks scores for thin samples: 0.82 + 0.18 × reliability (never zeroes a player out).',
    options.ageWeight ? `Age headroom adds up to ${(options.ageWeight * 100).toFixed(0)} points, full at ≤19 and zero at ≥31.` : 'No age weighting applied.',
    'Missing metrics are excluded from the weighted mean (coverage shown per player), never imputed.',
    'A percentile is relative to this cohort only — switching competition or role changes it.',
  ];

  const rows = (options.limit ? scored.slice(0, options.limit) : scored).map((r) => ({
    ...r,
    explanation: `${r.explanation} Cohort of ${scoped.length}; metric coverage ${(r.coverage * 100).toFixed(0)}%.`,
  }));

  return { rows, cohortSize: scoped.length, missingMetrics, weightSum, presetKey: options.presetKey ?? 'custom', sensitivity, assumptions };
}

export function cohortAverageScore(rows: RankedPlayer[]): number | null {
  return mean(rows.map((r) => r.score));
}
