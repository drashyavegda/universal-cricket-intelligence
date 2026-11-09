/** Career trajectory & talent development forecasting (Feature 22). */
import { linearRegression, mean, sd } from '../stats/descriptive';
import { ageHeadroom } from '../ranking/presets';
import type { Player } from '../types';

export interface TrajectoryForecast {
  horizon: string;
  seasonsAhead: number;
  ageThen: number | null;
  scenario: 'conservative' | 'expected' | 'high-growth';
  projectedRuns: number | null;
  projectedStrikeRate: number | null;
  projectedWickets: number | null;
  note: string;
}

export interface CareerTrajectory {
  playerId: string; name: string; age: number | null;
  seasons: { season: string; age: number; runs: number; strikeRate: number; wickets: number; economy: number }[];
  trends: { label: string; slope: number | null; r2: number | null; interpretation: string }[];
  forecasts: TrajectoryForecast[];
  milestones: { label: string; detail: string }[];
  developmentWeaknesses: { area: string; detail: string; suggestion: string }[];
  retentionAdvice: { verdict: string; rationale: string[] };
  uncertainty: string[];
}

export function buildTrajectory(p: Player): CareerTrajectory {
  const seasons = p.career.map((s) => ({
    season: s.season, age: s.age, runs: s.runs, strikeRate: s.strikeRate, wickets: s.wickets, economy: s.economy,
  }));
  const xs = seasons.map((_, i) => i);
  const runReg = seasons.length >= 3 ? linearRegression(xs, seasons.map((s) => s.runs)) : null;
  const srReg = seasons.length >= 3 ? linearRegression(xs, seasons.map((s) => s.strikeRate)) : null;
  const wktReg = seasons.length >= 3 ? linearRegression(xs, seasons.map((s) => s.wickets)) : null;

  const baseRuns = seasons.length ? mean(seasons.map((s) => s.runs)) ?? 0 : p.batting.runs;
  const baseSR = seasons.length ? mean(seasons.map((s) => s.strikeRate)) ?? 0 : 0;
  const baseWkts = seasons.length ? mean(seasons.map((s) => s.wickets)) ?? 0 : p.bowling.wickets;
  const varianceRuns = seasons.length >= 2 ? sd(seasons.map((s) => s.runs)) ?? 0 : baseRuns * 0.25;
  const headroom = ageHeadroom(p.age);

  const horizons: { label: string; seasons: number }[] = [{ label: 'Next season', seasons: 1 }, { label: '2 years', seasons: 2 }, { label: '3 years', seasons: 3 }, { label: '5 years', seasons: 5 }];
  const forecasts: TrajectoryForecast[] = [];
  // No season series → nothing to extrapolate. Emitting a forecast from a single
  // aggregate would fabricate a trend, so the section is left explicitly empty.
  for (const h of seasons.length ? horizons : []) {
    const growth = runReg ? runReg.slope * h.seasons : 0;
    const ageDecline = p.age !== null && p.age + h.seasons > 30 ? -((p.age + h.seasons - 30) * baseRuns * 0.08) : 0;
    const expected = Math.max(0, Math.round(baseRuns + growth + ageDecline));
    const band = Math.round(varianceRuns * Math.sqrt(h.seasons) * 0.8 + baseRuns * 0.06);
    forecasts.push(
      { horizon: h.label, seasonsAhead: h.seasons, ageThen: p.age === null ? null : p.age + h.seasons, scenario: 'conservative', projectedRuns: Math.max(0, expected - band), projectedStrikeRate: Math.round(baseSR * 0.96), projectedWickets: Math.max(0, Math.round(baseWkts)), note: 'No development gain; competition level constant.' },
      { horizon: h.label, seasonsAhead: h.seasons, ageThen: p.age === null ? null : p.age + h.seasons, scenario: 'expected', projectedRuns: expected, projectedStrikeRate: Math.round(baseSR), projectedWickets: Math.max(0, Math.round(baseWkts + (wktReg?.slope ?? 0) * h.seasons)), note: 'Current trend continues linearly.' },
      { horizon: h.label, seasonsAhead: h.seasons, ageThen: p.age === null ? null : p.age + h.seasons, scenario: 'high-growth', projectedRuns: expected + band + Math.round(baseRuns * headroom * 0.18), projectedStrikeRate: Math.round(baseSR * 1.08), projectedWickets: Math.max(0, Math.round(baseWkts * 1.2 + (wktReg?.slope ?? 0) * h.seasons)), note: 'Development step-up plus a favourable role change.' },
    );
  }

  const trends = [
    { label: 'Runs per season', slope: runReg?.slope ?? null, r2: runReg ? Number(runReg.r2.toFixed(3)) : null, interpretation: runReg ? (runReg.slope > 0 ? `Improving by ~${runReg.slope.toFixed(0)} runs/season` : `Declining by ~${Math.abs(runReg.slope).toFixed(0)} runs/season`) : 'Insufficient seasons for a trend' },
    { label: 'Strike rate', slope: srReg?.slope ?? null, r2: srReg ? Number(srReg.r2.toFixed(3)) : null, interpretation: srReg ? (srReg.slope > 0 ? `Strike rate rising ${srReg.slope.toFixed(1)} per season` : `Strike rate falling ${Math.abs(srReg.slope).toFixed(1)} per season`) : 'Insufficient seasons' },
    { label: 'Wickets', slope: wktReg?.slope ?? null, r2: wktReg ? Number(wktReg.r2.toFixed(3)) : null, interpretation: wktReg ? (wktReg.slope >= 0 ? `Wicket output rising ${wktReg.slope.toFixed(1)}/season` : `Wicket output falling ${Math.abs(wktReg.slope).toFixed(1)}/season`) : 'Insufficient seasons' },
  ];

  const developmentWeaknesses: CareerTrajectory['developmentWeaknesses'] = [];
  const avg = p.batting.dismissals ? p.batting.runs / p.batting.dismissals : null;
  const sr = p.batting.balls ? (p.batting.runs / p.batting.balls) * 100 : null;
  if (avg !== null && avg < 22 && sr !== null && sr > 135) developmentWeaknesses.push({ area: 'Conversion / shot selection', detail: `High intent (SR ${sr.toFixed(0)}) with low average (${avg.toFixed(1)}): starts are not converting.`, suggestion: 'Target a 20% improvement in balls-per-dismissal; it is worth more than extra power.' });
  if (avg !== null && avg > 34 && sr !== null && sr < 118) developmentWeaknesses.push({ area: 'Scoring tempo', detail: `Solid average (${avg.toFixed(1)}) but modest strike rate (${sr.toFixed(0)}).`, suggestion: 'Work on boundary options against spin in the middle overs.' });
  if (p.bowling.balls > 60 && (p.bowling.runsConceded / p.bowling.balls) * 6 > 9.5) developmentWeaknesses.push({ area: 'Economy under pressure', detail: `Economy ${((p.bowling.runsConceded / p.bowling.balls) * 6).toFixed(2)} across ${p.bowling.balls} balls.`, suggestion: 'Review death-overs plans and yorker execution; consider a phase-specific role first.' });
  if (p.bowling.balls > 60 && p.bowling.wickets / (p.bowling.balls / 6) < 0.8) developmentWeaknesses.push({ area: 'Wicket-taking', detail: `Only ${(p.bowling.wickets / (p.bowling.balls / 6 || 1)).toFixed(2)} wickets per over of work.`, suggestion: 'Build one reliable wicket ball rather than adding variations.' });
  if (!developmentWeaknesses.length) developmentWeaknesses.push({ area: 'No clear statistical weakness', detail: 'Rate metrics are balanced within the role.', suggestion: 'Focus on scenario exposure: pressure chases, death overs, and unfamiliar surfaces.' });

  const milestones = [
    { label: 'Seasons tracked', detail: `${p.career.length} season(s) of record in this workspace` },
    { label: 'Career runs (workspace)', detail: `${p.batting.runs} runs from ${p.batting.innings} innings` },
    { label: 'Career wickets (workspace)', detail: `${p.bowling.wickets} wickets from ${p.bowling.balls} balls` },
    { label: 'Age at reference date', detail: p.age === null ? 'Unknown (no DOB)' : `${p.age}` },
  ];

  const retentionVerdict = (p.age !== null && p.age <= 23 && (runReg?.slope ?? 0) > 0) ? 'Retain / invest'
    : (p.age !== null && p.age >= 30 && (runReg?.slope ?? 0) < 0) ? 'Re-evaluate' : 'Conditional';
  return {
    playerId: p.id, name: p.name, age: p.age, seasons, trends, forecasts, milestones, developmentWeaknesses,
    retentionAdvice: {
      verdict: retentionVerdict,
      rationale: [
        retentionVerdict === 'Retain / invest' ? 'Young with a positive performance trend — the cost of replacement typically exceeds retention cost.' : retentionVerdict === 'Re-evaluate' ? 'Age and trend both point downward; compare against cheaper alternative options in the same role.' : 'Evidence is mixed; retain at the right price rather than at any price.',
        `Age headroom multiplier ${headroom.toFixed(2)}.`,
        'Retention advice ignores contract mechanics and purse structure — combine with the auction module.',
      ],
    },
    uncertainty: [
      'Forecasts are linear extrapolations of season aggregates plus an age curve. Cricket careers are not linear.',
      `Season-to-season variation is large (SD ≈ ${varianceRuns.toFixed(0)} runs); treat the bands as the honest range.`,
      'No adjustment is made for competition strength changes, role changes or injury history.',
      ...(seasons.length === 0 ? ['No season-by-season record exists in this workspace for this player, so no trajectory has been forecast. Upload season aggregates to enable it.'] : []),
    ],
  };
}
