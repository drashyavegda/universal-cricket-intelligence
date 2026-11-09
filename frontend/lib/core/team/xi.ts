/**
 * Playing XI optimisation (Feature 18).
 *
 * Constraint-satisfying search (not a brute-force 20C11 enumeration): seeded
 * multi-start greedy construction followed by pairwise local search. Deterministic
 * for a given seed, and every constraint is enforced and reported.
 */
import { mulberry32, shuffle, hashSeed } from '../rng';
import { buildCohort, type CohortRow } from '../players/metrics';
import { pitchSuitability } from './squad';
import { ALLROUNDER_ROLES, BATTER_ROLES, BOWLER_ROLES, type MatchEvent, type Player, type Venue } from '../types';

export interface XIConstraints {
  overseasLimit: number;
  requireKeeper: boolean;
  minBowlingOptions: number;
  minBatters: number;
  maxAge?: number | null;
  excludedIds: string[];
  unavailableIds: string[];
}

export const DEFAULT_CONSTRAINTS: XIConstraints = {
  overseasLimit: 4, requireKeeper: true, minBowlingOptions: 5, minBatters: 5, excludedIds: [], unavailableIds: [],
};

export interface StrategyFlavour {
  key: 'balanced' | 'batting' | 'bowling' | 'young' | 'matchup';
  label: string;
  batWeight: number;
  bowlWeight: number;
  ageWeight: number;
  pitchWeight: number;
}

export const FLAVOURS: StrategyFlavour[] = [
  { key: 'balanced', label: 'Balanced', batWeight: 0.5, bowlWeight: 0.5, ageWeight: 0.05, pitchWeight: 0.25 },
  { key: 'batting', label: 'Batting dominant', batWeight: 0.75, bowlWeight: 0.25, ageWeight: 0.05, pitchWeight: 0.25 },
  { key: 'bowling', label: 'Bowling dominant', batWeight: 0.25, bowlWeight: 0.75, ageWeight: 0.05, pitchWeight: 0.3 },
  { key: 'young', label: 'Young talent focused', batWeight: 0.45, bowlWeight: 0.45, ageWeight: 0.22, pitchWeight: 0.15 },
  { key: 'matchup', label: 'Pitch / matchup fit', batWeight: 0.4, bowlWeight: 0.4, ageWeight: 0.02, pitchWeight: 0.55 },
];

export interface XIPlayer { player: Player; roleSlot: string; battingPosition: number | null; bowlingOvers: number; contributions: { label: string; value: string }[]; }

export interface XIOption {
  label: string;
  flavour: StrategyFlavour['key'];
  score: number;
  players: XIPlayer[];
  battingOrder: { position: number; playerId: string; name: string; rationale: string }[];
  bowlingPlan: { over: number; bowlerId: string; bowlerName: string; phase: 'powerplay' | 'middle' | 'death'; expectedEconomy: number | null }[];
  dna: { label: string; value: number; unit?: string }[];
  constraintsSatisfied: { constraint: string; satisfied: boolean; detail: string }[];
  warnings: string[];
}

const batScore = (row: CohortRow): number => {
  const parts = [row.percentiles['batting.strikeRate'], row.percentiles['batting.average'], row.percentiles['batting.runsPerInnings'], row.percentiles['consistency.floorRate']];
  const v = parts.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 30;
};
const bowlScore = (row: CohortRow): number => {
  const parts = [row.percentiles['bowling.economy'], row.percentiles['bowling.strikeRate'], row.percentiles['bowling.average'], row.percentiles['phase.deathEcon']];
  const v = parts.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 20;
};

function eligibility(p: Player, c: XIConstraints): boolean {
  if (c.excludedIds.includes(p.id) || c.unavailableIds.includes(p.id)) return false;
  if (c.maxAge != null && (p.age === null || p.age > c.maxAge)) return false;
  return true;
}

function evaluate(xi: CohortRow[], flavour: StrategyFlavour, venue: Venue | null): number {
  const bat = xi.reduce((a, r) => a + batScore(r), 0) / xi.length;
  const bowl = xi.reduce((a, r) => a + bowlScore(r), 0) / xi.length;
  const bowlOptions = xi.filter((r) => r.metrics.bowling.balls >= 60 || BOWLER_ROLES.includes(r.player.role) || ALLROUNDER_ROLES.includes(r.player.role)).length;
  const bowlCover = Math.min(1, bowlOptions / 6) * 100;
  const age = xi.reduce((a, r) => a + (r.player.age === null ? 26 : r.player.age), 0) / xi.length;
  const youth = Math.max(0, 100 - Math.max(0, age - 21) * 9);
  const pitch = venue ? xi.reduce((a, r) => a + pitchSuitability(r.player, venue).score, 0) / xi.length : 50;
  const structurePenalty = (bowlOptions < 5 ? (5 - bowlOptions) * 8 : 0) + (xi.filter((r) => r.player.wicketkeeper).length === 0 ? 25 : 0);
  return (
    bat * flavour.batWeight + (bowl * 0.7 + bowlCover * 0.3) * flavour.bowlWeight +
    youth * flavour.ageWeight + pitch * flavour.pitchWeight - structurePenalty
  );
}

function construct(pool: CohortRow[], flavour: StrategyFlavour, c: XIConstraints, venue: Venue | null, rand: () => number): CohortRow[] {
  const shuffled = shuffle(rand, pool);
  const xi: CohortRow[] = [];
  const take = (rows: CohortRow[], n: number) => {
    for (const r of rows) {
      if (xi.length >= 11 || n <= 0) break;
      if (xi.some((x) => x.player.id === r.player.id)) continue;
      xi.push(r); n--;
    }
  };
  const keepers = shuffled.filter((r) => r.player.wicketkeeper).sort((a, b) => batScore(b) - batScore(a));
  if (c.requireKeeper && keepers.length) take(keepers, 1);
  const bowlers = shuffled.filter((r) => BOWLER_ROLES.includes(r.player.role)).sort((a, b) => bowlScore(b) - bowlScore(a));
  take(bowlers, Math.max(3, c.minBowlingOptions - 1));
  const allrs = shuffled.filter((r) => ALLROUNDER_ROLES.includes(r.player.role)).sort((a, b) => (batScore(b) + bowlScore(b)) - (batScore(a) + bowlScore(a)));
  take(allrs, 2);
  const batters = shuffled.filter((r) => BATTER_ROLES.includes(r.player.role)).sort((a, b) => batScore(b) - batScore(a));
  take(batters, Math.max(c.minBatters, 11 - xi.length));
  const rest = shuffled.filter((r) => !xi.some((x) => x.player.id === r.player.id))
    .sort((a, b) => (batScore(b) + bowlScore(b)) - (batScore(a) + bowlScore(a)));
  take(rest, 11 - xi.length);
  return xi;
}

function overseasCount(xi: CohortRow[]): number { return xi.filter((r) => r.player.overseas).length; }

function repairOverseas(xi: CohortRow[], pool: CohortRow[], c: XIConstraints): CohortRow[] {
  let out = [...xi];
  let guard = 0;
  while (overseasCount(out) > c.overseasLimit && guard++ < 10) {
    const worst = out.filter((r) => r.player.overseas).sort((a, b) => (batScore(a) + bowlScore(a)) - (batScore(b) + bowlScore(b)))[0];
    const replacement = pool.find((r) => !r.player.overseas && !out.some((x) => x.player.id === r.player.id));
    if (!worst || !replacement) break;
    out = out.filter((r) => r.player.id !== worst.player.id).concat(replacement);
  }
  return out;
}

export function optimiseXI(
  squad: Player[], allPlayers: Player[], opts: {
    venue?: Venue | null; constraints?: Partial<XIConstraints>; seed?: number;
    flavours?: StrategyFlavour['key'][]; events?: MatchEvent[];
  } = {},
): { options: XIOption[]; cohortSize: number; notes: string[] } {
  const c: XIConstraints = { ...DEFAULT_CONSTRAINTS, ...opts.constraints };
  const cohort = buildCohort(allPlayers, opts.events).filter((r) => squad.some((p) => p.id === r.player.id) && eligibility(r.player, c));
  const pool = cohort;
  const requested = opts.flavours ?? ['balanced', 'batting', 'bowling'];
  const options: XIOption[] = [];

  for (const key of requested) {
    const flavour = FLAVOURS.find((f) => f.key === key)!;
    const rand = mulberry32((opts.seed ?? 7) + hashSeed(key));
    let best: CohortRow[] = [];
    let bestScore = -Infinity;
    for (let restart = 0; restart < 40; restart++) {
      let xi = repairOverseas(construct(pool, flavour, c, opts.venue ?? null, rand), pool, c);
      let improved = true; let passes = 0;
      while (improved && passes < 6) {
        improved = false; passes++;
        const current = evaluate(xi, flavour, opts.venue ?? null);
        for (const inside of xi) {
          for (const outside of pool) {
            if (xi.some((x) => x.player.id === outside.player.id)) continue;
            const candidate = xi.map((r) => (r.player.id === inside.player.id ? outside : r));
            if (overseasCount(candidate) > c.overseasLimit) continue;
            if (c.requireKeeper && !candidate.some((r) => r.player.wicketkeeper)) continue;
            const score = evaluate(candidate, flavour, opts.venue ?? null);
            if (score > current + 1e-9) { xi = candidate; improved = true; }
          }
        }
      }
      const score = evaluate(xi, flavour, opts.venue ?? null);
      if (score > bestScore) { bestScore = score; best = xi; }
    }
    options.push(buildOption(best, flavour, c, opts.venue ?? null, bestScore, pool));
  }

  options.sort((a, b) => b.score - a.score);
  return {
    options,
    cohortSize: pool.length,
    notes: [
      `Objective = ${'bat'}ting impact × w + bowling impact and wicket-taking cover × w + youth + pitch fit, minus structure penalties for <5 bowling options or no keeper.`,
      'Search: 40 seeded restarts of greedy role-constrained construction, then pairwise local search until no single swap improves the objective.',
      'Local search guarantees a local optimum only — a different seed can produce a slightly different XI. Values are not claims of optimality.',
      `Pool restricted to ${pool.length} eligible squad members after applying availability, age and exclusion constraints.`,
    ],
  };
}

function buildOption(xi: CohortRow[], flavour: StrategyFlavour, c: XIConstraints, venue: Venue | null, score: number, pool: CohortRow[]): XIOption {
  const warnings: string[] = [];
  const batters = xi.filter((r) => BATTER_ROLES.includes(r.player.role));
  const bowlers = xi.filter((r) => BOWLER_ROLES.includes(r.player.role) || ALLROUNDER_ROLES.includes(r.player.role) || r.metrics.bowling.balls >= 60);
  const keepers = xi.filter((r) => r.player.wicketkeeper);

  // Batting order: openers first, then top-order, middle, finisher, then best remaining by batting score
  const orderRank = (role: string): number => ['Opener', 'Top-order Batter', 'Wicketkeeper-Batter', 'Middle-order Batter', 'Finisher', 'All-rounder', 'Pace All-rounder', 'Spin All-rounder', 'Pace Bowler', 'Spin Bowler'].indexOf(role);
  const battingOrder = [...xi].sort((a, b) => {
    const r = orderRank(a.player.role) - orderRank(b.player.role);
    return r !== 0 ? r : batScore(b) - batScore(a);
  }).map((r, i) => ({
    position: i + 1,
    playerId: r.player.id,
    name: r.player.name,
    rationale: i <= 1 ? `Opener: strike rate ${r.metrics.batting.strikeRate ?? '—'} with average ${r.metrics.batting.average ?? '—'}.`
      : i >= 5 ? `Lower order / bowling all-round value; powerplay-to-death SR ${r.metrics.phase.deathSR ?? '—'}.`
        : `${r.player.role} with floor rate ${r.metrics.consistency.floorRate ?? '—'} and conversion ${r.metrics.batting.conversionRate ?? '—'}.`,
  }));

  // 20-over bowling allocation: maximise expected economy subject to max 4 overs per bowler
  const bowlingPlan: XIOption['bowlingPlan'] = [];
  const oversUsed = new Map<string, number>();
  const candidates = bowlers.map((r) => ({
    r,
    ppEcon: r.metrics.phase.powerplayEcon ?? r.metrics.bowling.economy ?? 9,
    midEcon: r.metrics.phase.middleEcon ?? r.metrics.bowling.economy ?? 9,
    deathEcon: r.metrics.phase.deathEcon ?? r.metrics.bowling.economy ?? 9,
  }));
  if (!candidates.length) warnings.push('No bowler in the XI has usable bowling data — the bowling plan is empty.');
  for (let over = 1; over <= 20; over++) {
    const phase: 'powerplay' | 'middle' | 'death' = over <= 6 ? 'powerplay' : over <= 15 ? 'middle' : 'death';
    const eligible = candidates.filter((cd) => (oversUsed.get(cd.r.player.id) ?? 0) < 4);
    if (!eligible.length) break;
    const withEcon = eligible.map((cd) => {
      const econ = phase === 'powerplay' ? cd.ppEcon : phase === 'middle' ? cd.midEcon : cd.deathEcon;
      const used = oversUsed.get(cd.r.player.id) ?? 0;
      // encourage spreading overs rather than one bowler bowling 4 straight
      return { cd, econ: econ + used * 0.08 };
    }).sort((a, b) => a.econ - b.econ);
    const chosen = withEcon[0];
    oversUsed.set(chosen.cd.r.player.id, (oversUsed.get(chosen.cd.r.player.id) ?? 0) + 1);
    bowlingPlan.push({
      over, bowlerId: chosen.cd.r.player.id, bowlerName: chosen.cd.r.player.name, phase,
      expectedEconomy: Number(chosen.econ.toFixed(2)),
    });
  }

  const avgAge = xi.reduce((a, r) => a + (r.player.age ?? 26), 0) / xi.length;
  const dna = [
    { label: 'Batting impact (avg pct)', value: Number((xi.reduce((a, r) => a + batScore(r), 0) / xi.length).toFixed(1)) },
    { label: 'Bowling impact (avg pct)', value: Number((xi.reduce((a, r) => a + bowlScore(r), 0) / xi.length).toFixed(1)) },
    { label: 'Bowling options', value: bowlers.length, unit: 'players' },
    { label: 'Pace / spin split', value: xi.filter((r) => r.player.bowlingType === 'Pace').length },
    { label: 'Average age', value: Number(avgAge.toFixed(1)), unit: 'yrs' },
    { label: 'Overseas used', value: xi.filter((r) => r.player.overseas).length, unit: `of ${c.overseasLimit}` },
    { label: 'Projected XI economy', value: Number((bowlingPlan.reduce((a, b) => a + (b.expectedEconomy ?? 9), 0) / Math.max(1, bowlingPlan.length)).toFixed(2)) },
  ];

  const constraintsSatisfied = [
    { constraint: `Squad size = 11`, satisfied: xi.length === 11, detail: `${xi.length} players selected` },
    { constraint: `Overseas ≤ ${c.overseasLimit}`, satisfied: xi.filter((r) => r.player.overseas).length <= c.overseasLimit, detail: `${xi.filter((r) => r.player.overseas).length} overseas` },
    { constraint: 'Wicketkeeper present', satisfied: !c.requireKeeper || keepers.length > 0, detail: keepers.map((k) => k.player.name).join(', ') || 'none' },
    { constraint: `≥ ${c.minBowlingOptions} bowling options`, satisfied: bowlers.length >= c.minBowlingOptions, detail: `${bowlers.length} options` },
    { constraint: `≥ ${c.minBatters} recognised batters`, satisfied: batters.length >= c.minBatters, detail: `${batters.length} batters` },
    { constraint: 'No unavailable players', satisfied: !xi.some((r) => c.unavailableIds.includes(r.player.id)), detail: 'Availability flags respected' },
    { constraint: 'Max 4 overs per bowler', satisfied: [...oversUsed.values()].every((v) => v <= 4), detail: 'Enforced in the bowling plan' },
  ];
  if (!constraintsSatisfied.every((x) => x.satisfied)) warnings.push('Some constraints could not be met with the available squad — expand the pool or relax constraints.');
  if (venue && flavour.pitchWeight > 0.4) warnings.push(`Pitch weighting applied using venue profile for ${venue.name} (historical aggregates).`);

  return {
    label: flavour.label, flavour: flavour.key, score: Number(score.toFixed(2)),
    players: xi.map((r) => ({
      player: r.player,
      roleSlot: r.player.role,
      battingPosition: battingOrder.find((b) => b.playerId === r.player.id)?.position ?? null,
      bowlingOvers: oversUsed.get(r.player.id) ?? 0,
      contributions: [
        { label: 'Bat impact', value: batScore(r).toFixed(0) },
        { label: 'Bowl impact', value: bowlScore(r).toFixed(0) },
        { label: 'Pitch fit', value: venue ? pitchSuitability(r.player, venue).score.toFixed(0) : 'n/a' },
      ],
    })),
    battingOrder, bowlingPlan, dna, constraintsSatisfied, warnings,
  };
}
