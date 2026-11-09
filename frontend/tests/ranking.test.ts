import { describe, expect, it } from 'vitest';
import { generatePlayers } from '@/lib/core/db/seed';
import { rankPlayers } from '@/lib/core/ranking/engine';
import { STRATEGY_PRESETS, ageHeadroom, METRIC_BY_KEY, presetByKey } from '@/lib/core/ranking/presets';
import { buildCohort, computePlayerMetrics } from '@/lib/core/players/metrics';
import type { Player } from '@/lib/core/types';

const players = generatePlayers(120, 424242, '2027-04-01');

function blankPlayer(id: string): Player {
  return {
    ...players[0],
    id,
    name: 'Blank Sample',
    batting: { matches: 2, innings: 0, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, highScore: 0, dismissals: 0 },
    bowling: { matches: 2, innings: 0, balls: 0, runsConceded: 0, wickets: 0, maidens: 0, bestWickets: 0, bestRuns: 0 },
    matchLog: [],
  };
}

describe('ranking engine', () => {
  it('is deterministic for the same inputs', () => {
    const weights = { 'batting.strikeRate': 3, 'batting.average': 2, 'form.formIndex': 1 };
    const a = rankPlayers(players, { weights, maxAge: 25, limit: 20 });
    const b = rankPlayers(players, { weights, maxAge: 25, limit: 20 });
    expect(a.rows.map((r) => r.player.id)).toEqual(b.rows.map((r) => r.player.id));
    expect(a.rows.map((r) => r.score)).toEqual(b.rows.map((r) => r.score));
  });

  it('never imputes a missing metric — the metric is marked missing and coverage drops', () => {
    const pool = [...players, blankPlayer('pl_blank')];
    const res = rankPlayers(pool, { weights: { 'batting.strikeRate': 1, 'batting.boundaryPct': 1 }, limit: 500 });
    const blank = res.rows.find((r) => r.player.id === 'pl_blank');
    expect(blank).toBeDefined();
    expect(blank!.coverage).toBeLessThan(1);
    expect(blank!.components.every((c) => c.percentile === null)).toBe(true);
    expect(blank!.components.every((c) => c.contribution === 0)).toBe(true);
  });

  it('leaves players out of a metric percentile rather than treating them as zero', () => {
    const pool = [...players, blankPlayer('pl_blank')];
    const cohort = buildCohort(pool);
    const blankRow = cohort.find((r) => r.player.id === 'pl_blank');
    expect(blankRow!.percentiles['batting.strikeRate']).toBeNull();
    const scored = cohort.filter((r) => r.percentiles['batting.strikeRate'] !== null);
    expect(scored.every((r) => (r.percentiles['batting.strikeRate'] as number) >= 0)).toBe(true);
  });

  it('scores stay inside 0..100 plus the explicit age bonus', () => {
    const res = rankPlayers(players, { weights: { 'batting.strikeRate': 1 }, ageWeight: 0.1, limit: 100 });
    for (const r of res.rows) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100 * 1.0 + 10 + 0.001);
    }
  });

  it('applies age filters strictly and never ranks a player with unknown age when requireAge is set', () => {
    const res = rankPlayers(players, { weights: { 'batting.strikeRate': 1 }, maxAge: 21, requireAge: true, limit: 200 });
    expect(res.rows.every((r) => r.player.age !== null && r.player.age <= 21)).toBe(true);
  });

  it('recomputes percentiles inside the filtered cohort (like-for-like comparison)', () => {
    const young = rankPlayers(players, { weights: { 'batting.strikeRate': 1 }, maxAge: 20, limit: 5 });
    if (young.rows.length) expect(young.rows[0].components[0].percentile).toBeGreaterThanOrEqual(80);
  });

  it('produces a sensitivity report when a preset is used', () => {
    const preset = presetByKey('young_talented_batter') ?? STRATEGY_PRESETS[0];
    const res = rankPlayers(players, { weights: preset.weights, presetKey: preset.key, limit: 30 });
    expect(res.sensitivity.length).toBeGreaterThan(0);
    for (const s of res.sensitivity) expect(s.spearman === null || (s.spearman >= -1 && s.spearman <= 1)).toBe(true);
  });

  it('every preset metric exists in the catalogue', () => {
    for (const p of STRATEGY_PRESETS) {
      for (const key of Object.keys(p.weights)) expect(METRIC_BY_KEY[key]).toBeDefined();
    }
  });

  it('age headroom is bounded, neutral when age is unknown, and decreasing with age', () => {
    expect(ageHeadroom(18)).toBe(1);
    expect(ageHeadroom(31)).toBe(0);
    expect(ageHeadroom(null)).toBe(0.5);
    expect(ageHeadroom(20)).toBeGreaterThan(ageHeadroom(27));
    for (const age of [16, 19, 23, 28, 30]) {
      const h = ageHeadroom(age);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
    }
  });
});

describe('metric computation', () => {
  it('returns null rather than 0 when the inputs are absent', () => {
    const m = computePlayerMetrics(blankPlayer('pl_blank'));
    expect(m.batting.strikeRate).toBeNull();
    expect(m.batting.average).toBeNull();
    expect(m.bowling.economy).toBeNull();
    expect(m.batting.sampleLabel).toBe('insufficient');
  });

  it('computes rates against the correct denominators', () => {
    const p = players.find((x) => x.batting.balls > 0)!;
    const m = computePlayerMetrics(p);
    // metrics are rounded to 2dp for display, so compare at that precision
    expect(m.batting.strikeRate).toBeCloseTo((p.batting.runs / p.batting.balls) * 100, 1);
    if (p.bowling.balls > 0) expect(m.bowling.economy).toBeCloseTo((p.bowling.runsConceded / p.bowling.balls) * 6, 1);
  });
});
