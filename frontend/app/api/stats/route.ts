import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, serverError } from '@/lib/api/helpers';
import { describe, histogram, linearRegression, pearson, spearman, outliersIQR, movingAverage, zScores, normalizeMinMax, confidenceIntervalMean, coefficientOfVariation } from '@/lib/core/stats/descriptive';
import { METRIC_DEFS } from '@/lib/core/ranking/presets';
import { buildCohort } from '@/lib/core/players/metrics';

export const dynamic = 'force-dynamic';

const EXTRACTORS: Record<string, (p: import('@/lib/core/types').Player, m: import('@/lib/core/players/metrics').PlayerMetrics) => number | null> = {
  runs: (p) => p.batting.runs,
  balls: (p) => p.batting.balls,
  average: (_, m) => m.batting.average,
  strikeRate: (_, m) => m.batting.strikeRate,
  boundaryPct: (_, m) => m.batting.boundaryPct,
  wickets: (p) => p.bowling.wickets,
  economy: (_, m) => m.bowling.economy,
  bowlingSR: (_, m) => m.bowling.strikeRate,
  dotBallPct: (_, m) => m.bowling.dotBallPct,
  formIndex: (_, m) => m.form.formIndex,
  floorRate: (_, m) => m.consistency.floorRate,
  cv: (_, m) => m.consistency.cv,
  age: (p) => p.age,
  deathSR: (_, m) => m.phase.deathSR,
  deathEcon: (_, m) => m.phase.deathEcon,
};

export async function GET() {
  const g = guard('view'); if (!g.ok) return g.response;
  return json({
    operations: ['describe', 'histogram', 'regression', 'correlation', 'outliers', 'moving-average', 'z-scores', 'normalise', 'series', 'confidence-interval'],
    metrics: Object.keys(EXTRACTORS),
    metricDefinitions: METRIC_DEFS,
    explanation: 'All operations are deterministic. Each returns the formula used and its sample size so the result can be audited.',
  });
}

export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ operation: string; metric?: string; metricY?: string; playerIds?: string[]; window?: number; series?: 'runs' | 'strikeRate' | 'wickets' }>(req);
    const store = getStore();
    const events = store.matches.flatMap((m) => m.events);
    const cohort = buildCohort(store.players, events);
    const scoped = body.playerIds?.length ? cohort.filter((r) => body.playerIds!.includes(r.player.id)) : cohort;
    const getValue = (metric: string) => scoped.map((r) => EXTRACTORS[metric]?.(r.player, r.metrics) ?? null).filter((v): v is number => v !== null);

    switch (body.operation) {
      case 'describe': {
        const metric = body.metric ?? 'strikeRate';
        const values = getValue(metric);
        return json({
          operation: 'describe', metric, values: values.length,
          result: describe(values),
          histogram: histogram(values, 10),
          formula: 'mean = Σx/n · variance = Σ(x−x̄)²/(n−1) · CV = sd/mean · percentiles via linear interpolation',
          suitability: metric === 'strikeRate' ? 'CV is not meaningful for strike rate (its zero point is arbitrary); use SD and IQR instead.' : 'CV is valid for ratio metrics with a meaningful zero (runs, wickets).',
        });
      }
      case 'histogram': {
        const values = getValue(body.metric ?? 'runs');
        return json({ operation: 'histogram', bins: histogram(values, 12), n: values.length });
      }
      case 'regression': {
        const xs = scoped.map((r) => EXTRACTORS[body.metric ?? 'age']?.(r.player, r.metrics) ?? null);
        const ys = scoped.map((r) => EXTRACTORS[body.metricY ?? 'strikeRate']?.(r.player, r.metrics) ?? null);
        const pairs = xs.map((x, i) => ({ x, y: ys[i] })).filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null);
        const reg = linearRegression(pairs.map((p) => p.x), pairs.map((p) => p.y));
        return json({
          operation: 'regression', n: pairs.length,
          result: reg ? { slope: Number(reg.slope.toFixed(4)), intercept: Number(reg.intercept.toFixed(3)), r2: Number(reg.r2.toFixed(4)), r: Number(reg.r.toFixed(4)), standardError: Number(reg.standardError.toFixed(3)) } : null,
          points: pairs.slice(0, 200),
          interpretation: reg ? `A one-unit increase in ${body.metric ?? 'age'} is associated with a ${reg.slope.toFixed(3)} change in ${body.metricY ?? 'strikeRate'}. R² = ${(reg.r2 * 100).toFixed(1)}%, so ${(100 - reg.r2 * 100).toFixed(1)}% of variation is unexplained. Association is not causation.` : 'Not enough paired observations.',
        });
      }
      case 'correlation': {
        const xs = scoped.map((r) => EXTRACTORS[body.metric ?? 'runs']?.(r.player, r.metrics) ?? null);
        const ys = scoped.map((r) => EXTRACTORS[body.metricY ?? 'strikeRate']?.(r.player, r.metrics) ?? null);
        const pairs = xs.map((x, i) => ({ x, y: ys[i] })).filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null);
        return json({
          operation: 'correlation', n: pairs.length,
          pearson: pearson(pairs.map((p) => p.x), pairs.map((p) => p.y)),
          spearman: spearman(pairs.map((p) => p.x), pairs.map((p) => p.y)),
          note: 'Pearson measures linear association; Spearman measures monotonic association and is robust to outliers/rank-only data.',
        });
      }
      case 'outliers': {
        const values = getValue(body.metric ?? 'runs');
        const flagged = outliersIQR(values);
        return json({
          operation: 'outliers', n: values.length,
          outliers: flagged.map((o) => ({ ...o, player: scoped[o.index]?.player.name })),
          method: 'Tukey fences: Q1 − 1.5·IQR and Q3 + 1.5·IQR. Outliers are candidates for review, not errors.',
        });
      }
      case 'moving-average': {
        const playerId = body.playerIds?.[0];
        const player = store.players.find((p) => p.id === playerId) ?? store.players[0];
        const runs = player.matchLog.map((m) => m.runs);
        return json({
          operation: 'moving-average', player: player.name,
          series: runs.map((v, i) => ({ label: `Inn ${i + 1}`, value: v, movingAverage: movingAverage(runs, body.window ?? 3)[i] })),
          formula: `Moving average over a window of ${body.window ?? 3} innings; null until the window is full.`,
        });
      }
      case 'z-scores': {
        const values = getValue(body.metric ?? 'strikeRate');
        return json({ operation: 'z-scores', players: zScores(values).map((z, i) => ({ player: scoped[i]?.player.name, value: values[i], z: Number(z.toFixed(2)) })).slice(0, 100), formula: 'z = (x − mean) / SD' });
      }
      case 'normalise': {
        const values = getValue(body.metric ?? 'strikeRate');
        return json({ operation: 'normalise', players: normalizeMinMax(values).map((v, i) => ({ player: scoped[i]?.player.name, value: values[i], normalised: Number(v.toFixed(3)) })).slice(0, 100), formula: '(x − min) / (max − min)' });
      }
      case 'confidence-interval': {
        const values = getValue(body.metric ?? 'strikeRate');
        return json({ operation: 'confidence-interval', n: values.length, ci: confidenceIntervalMean(values), cv: coefficientOfVariation(values), formula: 'x̄ ± 1.96 · s/√n (normal approximation). For proportions use the Wilson interval exposed at /api/stats?op=wilson.' });
      }
      default:
        return json({ error: 'Unknown operation' }, { status: 400 });
    }
  } catch (error) { return serverError(error); }
}
