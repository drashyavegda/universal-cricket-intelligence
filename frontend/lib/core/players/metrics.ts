/**
 * Cricket metric computation. Every metric returns `null` rather than a
 * fabricated value when its inputs are absent or its sample is too small.
 */
import { mean, median, sd, coefficientOfVariation, linearRegression, percentile } from '../stats/descriptive';
import type { MatchEvent, Player } from '../types';

export interface BattingMetrics {
  matches: number; innings: number; runs: number; balls: number;
  average: number | null; strikeRate: number | null; runsPerInnings: number | null;
  boundaryPct: number | null; ballsPerBoundary: number | null; sixShare: number | null;
  notOutRate: number | null; conversionRate: number | null; highScore: number;
  sample: number; sampleLabel: 'insufficient' | 'limited' | 'moderate' | 'strong';
}

export interface BowlingMetrics {
  matches: number; innings: number; balls: number; wickets: number; runsConceded: number;
  average: number | null; economy: number | null; strikeRate: number | null;
  wicketRatePerBall: number | null; dotBallPct: number | null; sample: number;
  sampleLabel: 'insufficient' | 'limited' | 'moderate' | 'strong';
}

export interface ConsistencyMetrics {
  sdRuns: number | null; cv: number | null; floorRate: number | null;
  ceiling: number | null; boomBust: number | null; sampleSize: number;
}

export interface FormMetrics {
  last5Runs: number[]; last5Avg: number | null; last5SR: number | null;
  trendSlope: number | null; formIndex: number | null; sampleSize: number;
}

export interface PhaseMetrics {
  powerplaySR: number | null; middleSR: number | null; deathSR: number | null;
  powerplayEcon: number | null; middleEcon: number | null; deathEcon: number | null;
  bestBattingPhase: 'powerplay' | 'middle' | 'death' | null;
  bestBowlingPhase: 'powerplay' | 'middle' | 'death' | null;
  phaseVersatility: number | null;
}

export interface PlayerMetrics {
  playerId: string;
  batting: BattingMetrics;
  bowling: BowlingMetrics;
  consistency: ConsistencyMetrics;
  form: FormMetrics;
  phase: PhaseMetrics;
  fielding: { catchesPerMatch: number | null; stumpings: number; keepingShare: number };
  allRounderIndex: number | null;
  availabilityUnknown: boolean;
}

const sampleLabel = (n: number): BattingMetrics['sampleLabel'] =>
  n < 60 ? 'insufficient' : n < 180 ? 'limited' : n < 450 ? 'moderate' : 'strong';

export function computePlayerMetrics(p: Player, events?: MatchEvent[]): PlayerMetrics {
  const b = p.batting;
  const bw = p.bowling;
  const dismissals = b.dismissals > 0 ? b.dismissals : Math.max(1, b.innings - b.notOuts);
  const average = b.innings > 0 ? b.runs / dismissals : null;
  const strikeRate = b.balls > 0 ? (b.runs / b.balls) * 100 : null;
  const boundaryPct = b.balls > 0 ? ((b.fours + b.sixes) / b.balls) * 100 : null;
  const ballsPerBoundary = b.fours + b.sixes > 0 ? b.balls / (b.fours + b.sixes) : null;
  const sixShare = b.fours + b.sixes > 0 ? b.sixes / (b.fours + b.sixes) : null;
  const notOutRate = b.innings > 0 ? b.notOuts / b.innings : null;
  const conversionRate = b.innings > 0 ? (b.fifties + b.hundreds) / Math.max(1, b.innings) : null;

  const bowlingAverage = bw.wickets > 0 ? bw.runsConceded / bw.wickets : null;
  const economy = bw.balls > 0 ? (bw.runsConceded / bw.balls) * 6 : null;
  const bowlingSR = bw.wickets > 0 ? bw.balls / bw.wickets : null;
  const wicketRatePerBall = bw.balls > 0 ? bw.wickets / bw.balls : null;

  let dotBallPct: number | null = null;
  if (events && events.length) {
    const asBowler = events.filter((e) => e.bowlerId === p.id);
    if (asBowler.length >= 30) {
      dotBallPct = (asBowler.filter((e) => !e.isWicket && e.runs === 0).length / asBowler.length) * 100;
    }
  }

  const runsLog = p.matchLog.map((m) => m.runs);
  const srLog = p.matchLog.map((m) => (m.ballsFaced > 0 ? (m.runs / m.ballsFaced) * 100 : 0));
  const last5 = p.matchLog.slice(-5);
  const trend = runsLog.length >= 4 ? linearRegression(runsLog.map((_, i) => i), runsLog) : null;
  const formIndex = last5.length
    ? Math.min(100, Math.max(0, (mean(last5.map((m) => m.runs)) ?? 0) * 1.6 + (mean(last5.map((m) => (m.ballsFaced ? (m.runs / m.ballsFaced) * 100 : 0))) ?? 0) * 0.45))
    : null;

  const pb = p.phaseBatting; const pw = p.phaseBowling;
  const phaseSR = (l: { balls: number; runs: number }) => (l.balls > 0 ? (l.runs / l.balls) * 100 : null);
  const phaseEcon = (l: { balls: number; runs: number }) => (l.balls > 0 ? (l.runs / l.balls) * 6 : null);
  const battingPhases = { powerplay: phaseSR(pb.powerplay), middle: phaseSR(pb.middle), death: phaseSR(pb.death) };
  const bowlingPhases = { powerplay: phaseEcon(pw.powerplay), middle: phaseEcon(pw.middle), death: phaseEcon(pw.death) };
  const bestBat = (Object.entries(battingPhases).filter(([, v]) => v !== null) as [keyof typeof battingPhases, number][])
    .sort((a, c) => c[1] - a[1])[0]?.[0] ?? null;
  const bestBowl = (Object.entries(bowlingPhases).filter(([, v]) => v !== null) as [keyof typeof bowlingPhases, number][])
    .sort((a, c) => a[1] - c[1])[0]?.[0] ?? null;
  const phaseVals = [battingPhases.powerplay, battingPhases.middle, battingPhases.death].filter((v): v is number => v !== null);
  const phaseVersatility = phaseVals.length === 3 ? 100 - ((sd(phaseVals) ?? 0) / Math.max(1, mean(phaseVals) ?? 1)) * 100 : null;

  const allRounderIndex = average !== null && economy !== null
    ? Math.min(100, Math.round(
      (Math.min(1, (strikeRate ?? 0) / 150) * 35) + (Math.min(1, (average ?? 0) / 45) * 25) +
      (Math.min(1, Math.max(0, (10 - economy) / 4)) * 25) + (Math.min(1, (bw.wickets / Math.max(1, bw.innings)) / 1.4) * 15),
    ))
    : null;

  return {
    playerId: p.id,
    batting: {
      matches: b.matches, innings: b.innings, runs: b.runs, balls: b.balls,
      average: average === null ? null : Number(average.toFixed(2)),
      strikeRate: strikeRate === null ? null : Number(strikeRate.toFixed(2)),
      runsPerInnings: b.innings ? Number((b.runs / b.innings).toFixed(2)) : null,
      boundaryPct: boundaryPct === null ? null : Number(boundaryPct.toFixed(2)),
      ballsPerBoundary: ballsPerBoundary === null ? null : Number(ballsPerBoundary.toFixed(2)),
      sixShare: sixShare === null ? null : Number(sixShare.toFixed(3)),
      notOutRate: notOutRate === null ? null : Number(notOutRate.toFixed(3)),
      conversionRate: conversionRate === null ? null : Number(conversionRate.toFixed(3)),
      highScore: b.highScore,
      sample: b.balls,
      sampleLabel: sampleLabel(b.balls),
    },
    bowling: {
      matches: bw.matches, innings: bw.innings, balls: bw.balls, wickets: bw.wickets, runsConceded: bw.runsConceded,
      average: bowlingAverage === null ? null : Number(bowlingAverage.toFixed(2)),
      economy: economy === null ? null : Number(economy.toFixed(2)),
      strikeRate: bowlingSR === null ? null : Number(bowlingSR.toFixed(2)),
      wicketRatePerBall: wicketRatePerBall === null ? null : Number(wicketRatePerBall.toFixed(4)),
      dotBallPct: dotBallPct === null ? null : Number(dotBallPct.toFixed(2)),
      sample: bw.balls,
      sampleLabel: sampleLabel(bw.balls),
    },
    consistency: {
      sdRuns: runsLog.length >= 2 ? Number(sd(runsLog)!.toFixed(2)) : null,
      cv: runsLog.length >= 3 && (mean(runsLog) ?? 0) > 0 ? Number(coefficientOfVariation(runsLog)!.toFixed(3)) : null,
      floorRate: runsLog.length ? Number((runsLog.filter((r) => r >= 20).length / runsLog.length).toFixed(3)) : null,
      ceiling: runsLog.length ? Math.max(...runsLog) : null,
      boomBust: runsLog.length ? Number((runsLog.filter((r) => r >= 40).length / runsLog.length - runsLog.filter((r) => r < 10).length / runsLog.length).toFixed(3)) : null,
      sampleSize: runsLog.length,
    },
    form: {
      last5Runs: last5.map((m) => m.runs),
      last5Avg: last5.length ? Number(mean(last5.map((m) => m.runs))!.toFixed(2)) : null,
      last5SR: last5.length ? Number(mean(srLog.slice(-5))!.toFixed(2)) : null,
      trendSlope: trend ? Number(trend.slope.toFixed(3)) : null,
      formIndex: formIndex === null ? null : Number(formIndex.toFixed(1)),
      sampleSize: last5.length,
    },
    phase: {
      powerplaySR: battingPhases.powerplay, middleSR: battingPhases.middle, deathSR: battingPhases.death,
      powerplayEcon: bowlingPhases.powerplay, middleEcon: bowlingPhases.middle, deathEcon: bowlingPhases.death,
      bestBattingPhase: bestBat, bestBowlingPhase: bestBowl,
      phaseVersatility: phaseVersatility === null ? null : Number(phaseVersatility.toFixed(1)),
    },
    fielding: {
      catchesPerMatch: b.matches ? Number((p.fielding.catches / b.matches).toFixed(2)) : null,
      stumpings: p.fielding.stumpings,
      keepingShare: p.wicketkeeper ? 1 : 0,
    },
    allRounderIndex,
    availabilityUnknown: true,
  };
}

export interface CohortRow {
  player: Player;
  metrics: PlayerMetrics;
  percentiles: Record<string, number | null>;
}

const PCT_METRICS: { key: string; get: (m: PlayerMetrics) => number | null; higherBetter: boolean }[] = [
  { key: 'batting.average', get: (m) => m.batting.average, higherBetter: true },
  { key: 'batting.strikeRate', get: (m) => m.batting.strikeRate, higherBetter: true },
  { key: 'batting.boundaryPct', get: (m) => m.batting.boundaryPct, higherBetter: true },
  { key: 'batting.runsPerInnings', get: (m) => m.batting.runsPerInnings, higherBetter: true },
  { key: 'batting.conversionRate', get: (m) => m.batting.conversionRate, higherBetter: true },
  { key: 'bowling.economy', get: (m) => m.bowling.economy, higherBetter: false },
  { key: 'bowling.average', get: (m) => m.bowling.average, higherBetter: false },
  { key: 'bowling.strikeRate', get: (m) => m.bowling.strikeRate, higherBetter: false },
  { key: 'bowling.dotBallPct', get: (m) => m.bowling.dotBallPct, higherBetter: true },
  { key: 'phase.powerplaySR', get: (m) => m.phase.powerplaySR, higherBetter: true },
  { key: 'phase.deathSR', get: (m) => m.phase.deathSR, higherBetter: true },
  { key: 'phase.deathEcon', get: (m) => m.phase.deathEcon, higherBetter: false },
  { key: 'phase.powerplayEcon', get: (m) => m.phase.powerplayEcon, higherBetter: false },
  { key: 'consistency.floorRate', get: (m) => m.consistency.floorRate, higherBetter: true },
  { key: 'consistency.cv', get: (m) => m.consistency.cv, higherBetter: false },
  { key: 'form.formIndex', get: (m) => m.form.formIndex, higherBetter: true },
  { key: 'allRounderIndex', get: (m) => m.allRounderIndex, higherBetter: true },
  { key: 'fielding.catchesPerMatch', get: (m) => m.fielding.catchesPerMatch, higherBetter: true },
];

/** Build a cohort with per-metric percentile ranks (0–100) inside the cohort. */
export function buildCohort(players: Player[], events?: MatchEvent[]): CohortRow[] {
  const rows = players.map((p) => ({ player: p, metrics: computePlayerMetrics(p, events), percentiles: {} as Record<string, number | null> }));
  for (const def of PCT_METRICS) {
    const values = rows.map((r) => def.get(r.metrics));
    const valid = values.filter((v): v is number => v !== null);
    rows.forEach((r, i) => {
      const v = values[i];
      if (v === null || valid.length < 3) { r.percentiles[def.key] = null; return; }
      const below = valid.filter((x) => x < v).length;
      const equal = valid.filter((x) => x === v).length;
      const pct = ((below + 0.5 * equal) / valid.length) * 100;
      r.percentiles[def.key] = Number((def.higherBetter ? pct : 100 - pct).toFixed(1));
    });
  }
  return rows;
}

export function cohortPercentile(rows: CohortRow[], playerId: string, key: string): number | null {
  return rows.find((r) => r.player.id === playerId)?.percentiles[key] ?? null;
}

/** Percentile rank of a raw value within a cohort array (used by lab tools). */
export function rankPercentile(values: number[], value: number): number | null {
  if (!values.length) return null;
  const below = values.filter((v) => v < value).length;
  return Number(((below / values.length) * 100).toFixed(1));
}

export const percentileOf = percentile;
export const median3 = (xs: number[]) => median(xs);
