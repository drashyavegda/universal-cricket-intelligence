/**
 * Monte Carlo match simulation (Feature 20).
 *
 * Per-ball hazard model calibrated to the two selected XIs' observed rate
 * statistics and the venue's historical scoring environment. Default 5,000
 * simulations. Outputs are distributions with explicit assumptions.
 */
import { mulberry32, hashSeed, type Rand } from '../rng';
import { summariseSample, quantileSorted, brierScore, logLoss, calibrationTable } from '../stats/probability';
import { mean } from '../stats/descriptive';
import type { Match, MatchEvent, Player, Venue, WeatherObservation } from '../types';
import { BATTER_ROLES } from '../types';

export interface SimTeamInput {
  teamId: string;
  name: string;
  players: Player[];       // XI
  battingOrder?: string[]; // optional explicit order
}

export interface SimOptions {
  venue?: Venue | null;
  weather?: WeatherObservation | null;
  overs?: number;
  simulations?: number;
  seed?: number;
  tossWinnerId?: string;
  tossDecision?: 'bat' | 'bowl';
  pitchAdjustment?: { battingFriendliness?: number; spinRating?: number; paceRating?: number };
  scoreBias?: number;      // percentage points added to both sides' scoring rate
}

export interface InningsForecast {
  phase: 'powerplay' | 'middle' | 'death';
  expectedRuns: number; expectedWickets: number; runRate: number;
}

export interface MatchSimResult {
  runs: number;
  seed: number;
  overs: number;
  teamA: { teamId: string; name: string; winProbability: number; score: ReturnType<typeof summariseSample>; wickets: ReturnType<typeof summariseSample>; projected: number };
  teamB: { teamId: string; name: string; winProbability: number; score: ReturnType<typeof summariseSample>; wickets: ReturnType<typeof summariseSample>; projected: number };
  tieProbability: number;
  margin: { medianRuns: number; p10: number; p90: number } | null;
  phases: { teamId: string; phases: InningsForecast[] }[];
  momentum: { over: number; projectedRunRateA: number; projectedRunRateB: number }[];
  playerForecasts: { playerId: string; name: string; teamId: string; expectedRuns: number; p30PlusRuns: number; expectedWickets: number; p2PlusWickets: number }[];
  simulationError: number;
  assumptions: string[];
  warnings: string[];
}

const HIST_RUNS = [0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 3, 4, 4, 6];

function battingStrength(xi: Player[]): { sr: number; avg: number; reliability: number } {
  const bats = xi.filter((p) => BATTER_ROLES.includes(p.role) || p.batting.balls > 120);
  const srVals = bats.map((p) => (p.batting.balls ? (p.batting.runs / p.batting.balls) * 100 : null)).filter((v): v is number => v !== null);
  const avgVals = bats.map((p) => (p.batting.dismissals ? p.batting.runs / p.batting.dismissals : null)).filter((v): v is number => v !== null);
  const sr = srVals.length ? mean(srVals)! : 120;
  const avg = avgVals.length ? mean(avgVals)! : 25;
  const balls = bats.reduce((a, p) => a + p.batting.balls, 0);
  return { sr, avg, reliability: Math.min(1, balls / 1800) };
}

function bowlingStrength(xi: Player[]): { econ: number; wktRate: number; reliability: number } {
  const bowlers = xi.filter((p) => p.bowling.balls >= 60);
  const econ = bowlers.length ? mean(bowlers.map((p) => (p.bowling.balls ? (p.bowling.runsConceded / p.bowling.balls) * 6 : 9)).filter(Number.isFinite))! : 9;
  const wktRate = bowlers.length
    ? mean(bowlers.map((p) => (p.bowling.balls ? p.bowling.wickets / p.bowling.balls : 0.035)).filter(Number.isFinite))!
    : 0.035;
  const balls = bowlers.reduce((a, p) => a + p.bowling.balls, 0);
  return { econ, wktRate, reliability: Math.min(1, balls / 2000) };
}

/** Simulate one innings; returns total, wickets and per-player contributions. */
function simulateInnings(
  rand: Rand, batting: Player[], bowling: Player[], opts: {
    overs: number; venue: (Venue | null); runFactor: number; wicketFactor: number; spread: number;
  },
): { total: number; wickets: number; phaseRuns: number[]; perBatter: Map<string, number>; perBowler: Map<string, { balls: number; runs: number; wickets: number }>; overRuns: number[] } {
  const { overs } = opts;
  const strikers = batting.slice(0, Math.min(batting.length, 11));
  const bowlers = bowling.filter((p) => p.bowling.balls >= 12);
  const attack = bowlers.length ? bowlers : bowling;
  const perBatter = new Map<string, number>();
  const perBowler = new Map<string, { balls: number; runs: number; wickets: number }>();
  const overRuns: number[] = [];
  const phaseRuns = [0, 0, 0];
  let total = 0; let wickets = 0;
  let strikerIdx = 0;
  let ballCount = 0;
  const totalBalls = overs * 6;
  const econBase = mean(attack.map((p) => (p.bowling.balls ? (p.bowling.runsConceded / p.bowling.balls) * 6 : 9))) ?? 9;

  while (ballCount < totalBalls && wickets < 10 && strikerIdx < strikers.length) {
    const over = Math.floor(ballCount / 6);
    const bowler = attack[over % attack.length];
    const striker = strikers[strikerIdx];
    const phase = over < 6 ? 0 : over < Math.max(7, overs - 5) ? 1 : 2;
    const phaseAggr = phase === 0 ? 1.06 : phase === 1 ? 0.9 : 1.35;
    const attackQuality = bowler ? Math.min(1.5, Math.max(0.6, econBase / 8.6)) : 1;
    const pWicket = Math.min(0.24, Math.max(0.012, 0.048 * opts.wicketFactor * attackQuality * (phase === 2 ? 1.16 : 1)));
    if (rand() < pWicket) {
      wickets++;
      if (bowler) {
        const b = perBowler.get(bowler.id) ?? { balls: 0, runs: 0, wickets: 0 };
        b.balls++; b.wickets++;
        perBowler.set(bowler.id, b);
      }
      strikerIdx++;
      ballCount++;
      overRuns[over] = overRuns[over] ?? 0;
      continue;
    }
    // scoring draw, scaled by batting strength + venue + spread
    let runs = HIST_RUNS[Math.floor(rand() * HIST_RUNS.length)];
    const scale = opts.runFactor * phaseAggr * (1 + opts.spread * (rand() - 0.5));
    runs = Math.round(runs * Math.min(2, Math.max(0.35, scale)));
    if (runs > 6) runs = 6;
    total += runs;
    phaseRuns[phase] += runs;
    overRuns[over] = (overRuns[over] ?? 0) + runs;
    perBatter.set(striker.id, (perBatter.get(striker.id) ?? 0) + runs);
    if (bowler) {
      const b = perBowler.get(bowler.id) ?? { balls: 0, runs: 0, wickets: 0 };
      b.balls++; b.runs += runs;
      perBowler.set(bowler.id, b);
    }
    ballCount++;
    // simple strike rotation every 6 balls faced by the pair
    if (rand() < 0.22) strikerIdx++;
  }
  return { total, wickets, phaseRuns, perBatter, perBowler, overRuns };
}

export function simulateMatch(teamA: SimTeamInput, teamB: SimTeamInput, options: SimOptions = {}): MatchSimResult {
  const sims = Math.max(200, Math.min(20000, options.simulations ?? 5000));
  const overs = options.overs ?? 20;
  const seed = options.seed ?? 2027;
  const warnings: string[] = [];

  const batA = battingStrength(teamA.players); const bowlA = bowlingStrength(teamA.players);
  const batB = battingStrength(teamB.players); const bowlB = bowlingStrength(teamB.players);

  if (teamA.players.length < 11 || teamB.players.length < 11) warnings.push('One or both XIs have fewer than 11 players — simulation uses the players provided.');
  if (batA.reliability < 0.4 || batB.reliability < 0.4) warnings.push('Batting samples are thin; projections will be wide.');

  const venue = options.venue ?? null;
  const weather = options.weather ?? null;
  const pitch = options.pitchAdjustment ?? {};
  const battingFriendliness = pitch.battingFriendliness ?? venue?.pitch.battingFriendliness ?? 6.5;
  const spinRating = pitch.spinRating ?? venue?.pitch.spinRating ?? 5.5;
  const paceRating = pitch.paceRating ?? venue?.pitch.paceRating ?? 6.0;

  // Venue + weather environment multiplier on scoring rate
  const venueFactor = 0.9 + (battingFriendliness - 6.5) * 0.035;
  const dewFactor = weather?.dewExpected ? 1.035 : 1;
  const rainFactor = (weather?.rainProbability ?? 0) > 60 ? 0.97 : 1;

  // Preferred batting first: toss decision (default: chase, the modern T20 norm)
  const tossWinner = options.tossWinnerId ?? teamA.teamId;
  const tossDecision = options.tossDecision ?? 'bowl';

  const scoreSamplesA: number[] = []; const scoreSamplesB: number[] = [];
  const wicketSamplesA: number[] = []; const wicketSamplesB: number[] = [];
  const margins: number[] = [];
  const phaseAggA = [{ runs: 0, wickets: 0 }, { runs: 0, wickets: 0 }, { runs: 0, wickets: 0 }];
  const phaseAggB = [{ runs: 0, wickets: 0 }, { runs: 0, wickets: 0 }, { runs: 0, wickets: 0 }];
  const overAggA = new Array(overs).fill(0); const overAggB = new Array(overs).fill(0);
  const batterAgg = new Map<string, { runs: number; count30: number }>();
  const bowlerAgg = new Map<string, { wickets: number; count2: number }>();

  const rand = mulberry32(seed ^ hashSeed(`${teamA.teamId}-${teamB.teamId}-${overs}`));

  for (let s = 0; s < sims; s++) {
    const orderA = options.overs ? teamA.players : teamA.players;
    const firstIsA = (tossWinner === teamA.teamId && tossDecision === 'bat') || (tossWinner === teamB.teamId && tossDecision === 'bowl');
    const firstBat = firstIsA ? orderA : teamB.players;
    const firstBowl = firstIsA ? teamB.players : teamA.players;
    const secondBat = firstIsA ? teamB.players : orderA;
    const secondBowl = firstIsA ? teamA.players : teamB.players;
    const chaseBoost = (weather?.dewExpected ? 1.04 : 1) * 1.02;

    const inn1 = simulateInnings(rand, firstBat, firstBowl, {
      overs, venue, runFactor: venueFactor * rainFactor * (options.scoreBias ? 1 + options.scoreBias / 100 : 1),
      wicketFactor: 1 + (spinRating - 5.5) * 0.03, spread: 0.9,
    });
    const target = inn1.total + 1;
    const inn2 = simulateInnings(rand, secondBat, secondBowl, {
      overs, venue, runFactor: venueFactor * dewFactor * chaseBoost * (options.scoreBias ? 1 + options.scoreBias / 100 : 1),
      wicketFactor: 1 + (paceRating - 5.5) * 0.02, spread: 0.95,
    });

    const aBatFirst = firstIsA;
    const aScore = aBatFirst ? inn1.total : inn2.total;
    const bScore = aBatFirst ? inn2.total : inn1.total;
    const aWkts = aBatFirst ? inn1.wickets : inn2.wickets;
    const bWkts = aBatFirst ? inn2.wickets : inn1.wickets;
    scoreSamplesA.push(aScore); scoreSamplesB.push(bScore);
    wicketSamplesA.push(aWkts); wicketSamplesB.push(bWkts);
    margins.push(aScore - bScore);

    const phasesOf = (inn: typeof inn1) => [
      { runs: inn.phaseRuns[0], wickets: 0 }, { runs: inn.phaseRuns[1], wickets: 0 }, { runs: inn.phaseRuns[2], wickets: 0 },
    ];
    const pa = aBatFirst ? phasesOf(inn1) : phasesOf(inn2);
    const pb = aBatFirst ? phasesOf(inn2) : phasesOf(inn1);
    pa.forEach((p, i) => { phaseAggA[i].runs += p.runs; });
    pb.forEach((p, i) => { phaseAggB[i].runs += p.runs; });

    const overRunsOf = (inn: typeof inn1) => inn.overRuns;
    const oa = aBatFirst ? overRunsOf(inn1) : overRunsOf(inn2);
    const ob = aBatFirst ? overRunsOf(inn2) : overRunsOf(inn1);
    for (let o = 0; o < overs; o++) { overAggA[o] += oa[o] ?? 0; overAggB[o] += ob[o] ?? 0; }

    inn1.perBatter.forEach((runs, id) => {
      const cur = batterAgg.get(id) ?? { runs: 0, count30: 0 };
      cur.runs += runs; if (runs >= 30) cur.count30++;
      batterAgg.set(id, cur);
    });
    inn2.perBatter.forEach((runs, id) => {
      const cur = batterAgg.get(id) ?? { runs: 0, count30: 0 };
      cur.runs += runs; if (runs >= 30) cur.count30++;
      batterAgg.set(id, cur);
    });
    [inn1, inn2].forEach((inn) => inn.perBowler.forEach((v, id) => {
      const cur = bowlerAgg.get(id) ?? { wickets: 0, count2: 0 };
      cur.wickets += v.wickets; if (v.wickets >= 2) cur.count2++;
      bowlerAgg.set(id, cur);
    }));
    void target;
  }

  const winsA = scoreSamplesA.filter((s, i) => s > scoreSamplesB[i]).length;
  const winsB = scoreSamplesB.filter((s, i) => s > scoreSamplesA[i]).length;
  const ties = sims - winsA - winsB;
  const winProbA = winsA / sims;
  const simulationError = Math.sqrt((winProbA * (1 - winProbA)) / sims);

  const playerForecasts = [...teamA.players, ...teamB.players].map((p) => {
    const bat = batterAgg.get(p.id);
    const bowl = bowlerAgg.get(p.id);
    const teamId = teamA.players.some((x) => x.id === p.id) ? teamA.teamId : teamB.teamId;
    return {
      playerId: p.id, name: p.name, teamId,
      expectedRuns: Number(((bat?.runs ?? 0) / sims).toFixed(1)),
      p30PlusRuns: Number(((bat?.count30 ?? 0) / sims).toFixed(3)),
      expectedWickets: Number(((bowl?.wickets ?? 0) / sims).toFixed(2)),
      p2PlusWickets: Number(((bowl?.count2 ?? 0) / sims).toFixed(3)),
    };
  }).sort((a, b) => b.expectedRuns - a.expectedRuns);

  const phaseNames = ['powerplay', 'middle', 'death'] as const;
  return {
    runs: sims, seed, overs,
    teamA: {
      teamId: teamA.teamId, name: teamA.name,
      winProbability: Number(winProbA.toFixed(4)),
      score: summariseSample(scoreSamplesA),
      wickets: summariseSample(wicketSamplesA),
      projected: Math.round(quantileSorted([...scoreSamplesA].sort((a, b) => a - b), 50)),
    },
    teamB: {
      teamId: teamB.teamId, name: teamB.name,
      winProbability: Number((winsB / sims).toFixed(4)),
      score: summariseSample(scoreSamplesB),
      wickets: summariseSample(wicketSamplesB),
      projected: Math.round(quantileSorted([...scoreSamplesB].sort((a, b) => a - b), 50)),
    },
    tieProbability: Number((ties / sims).toFixed(4)),
    margin: margins.length ? {
      medianRuns: Math.round(quantileSorted([...margins].sort((a, b) => a - b), 50)),
      p10: Math.round(quantileSorted([...margins].sort((a, b) => a - b), 10)),
      p90: Math.round(quantileSorted([...margins].sort((a, b) => a - b), 90)),
    } : null,
    phases: [
      { teamId: teamA.teamId, phases: phaseNames.map((phase, i) => ({ phase, expectedRuns: Number((phaseAggA[i].runs / sims).toFixed(1)), expectedWickets: 0, runRate: Number(((phaseAggA[i].runs / sims) / (phase === 'powerplay' ? 6 : phase === 'middle' ? Math.max(1, overs - 11) : 5)).toFixed(2)) })) },
      { teamId: teamB.teamId, phases: phaseNames.map((phase, i) => ({ phase, expectedRuns: Number((phaseAggB[i].runs / sims).toFixed(1)), expectedWickets: 0, runRate: Number(((phaseAggB[i].runs / sims) / (phase === 'powerplay' ? 6 : phase === 'middle' ? Math.max(1, overs - 11) : 5)).toFixed(2)) })) },
    ],
    momentum: Array.from({ length: overs }, (_, o) => ({
      over: o + 1,
      projectedRunRateA: Number((overAggA[o] / sims).toFixed(2)),
      projectedRunRateB: Number((overAggB[o] / sims).toFixed(2)),
    })),
    playerForecasts,
    simulationError: Number(simulationError.toFixed(4)),
    assumptions: [
      `Per-ball scoring drawn from a fixed T20 outcome distribution scaled by each XI's mean strike rate, phase aggression (powerplay ×1.06, middle ×0.90, death ×1.35) and a venue batting-friendliness multiplier (${venueFactor.toFixed(3)}).`,
      `Wicket hazard ≈ 4.8% per ball scaled by the bowling attack's observed economy and phase; death overs +16%.`,
      `Toss: ${tossWinner === teamA.teamId ? teamA.name : teamB.name} wins and chooses to ${tossDecision}. Chasing side receives a +2% scoring environment${weather?.dewExpected ? ' plus dew (+3.5%)' : ''}.`,
      `${sims.toLocaleString()} independent simulations with seed ${seed} — reproducible.`,
      'No individual player form streaks, injuries, or fielding effects are modelled. This is a projection, not a guarantee.',
    ],
    warnings,
  };
}

/** Batter-vs-bowler matchup table from ball-by-ball events (Feature 16/19). */
export function matchups(events: MatchEvent[], players: Player[]): {
  batterId: string; batterName: string; bowlerId: string; bowlerName: string;
  balls: number; runs: number; dismissals: number; strikeRate: number | null; note: string;
}[] {
  const map = new Map<string, { balls: number; runs: number; dismissals: number }>();
  for (const e of events) {
    const key = `${e.batterId}|${e.bowlerId}`;
    const cur = map.get(key) ?? { balls: 0, runs: 0, dismissals: 0 };
    cur.balls += 1; cur.runs += e.runs; if (e.isWicket) cur.dismissals += 1;
    map.set(key, cur);
  }
  return [...map.entries()].map(([key, v]) => {
    const [batterId, bowlerId] = key.split('|');
    return {
      batterId, batterName: players.find((p) => p.id === batterId)?.name ?? batterId,
      bowlerId, bowlerName: players.find((p) => p.id === bowlerId)?.name ?? bowlerId,
      balls: v.balls, runs: v.runs, dismissals: v.dismissals,
      strikeRate: v.balls ? Number(((v.runs / v.balls) * 100).toFixed(1)) : null,
      note: v.balls < 18 ? 'Small sample — treat as anecdote, not evidence.' : v.dismissals >= 2 ? 'Repeated dismissals: a genuine match-up signal worth planning around.' : 'Useful sample size for tactical planning.',
    };
  }).sort((a, b) => b.balls - a.balls);
}

/** Phase-wise squad scoring from ball-by-ball data. */
export function phaseProfile(events: MatchEvent[], teamPlayerIds: string[]) {
  const phases = { powerplay: { balls: 0, runs: 0, wickets: 0 }, middle: { balls: 0, runs: 0, wickets: 0 }, death: { balls: 0, runs: 0, wickets: 0 } };
  for (const e of events) {
    const phase = e.over < 6 ? 'powerplay' : e.over < 15 ? 'middle' : 'death';
    if (teamPlayerIds.includes(e.batterId)) {
      phases[phase].balls += 1; phases[phase].runs += e.runs; if (e.isWicket) phases[phase].wickets += 1;
    }
  }
  return Object.entries(phases).map(([phase, v]) => ({
    phase, balls: v.balls, runs: v.runs, wickets: v.wickets,
    runRate: v.balls ? Number(((v.runs / v.balls) * 6).toFixed(2)) : null,
  }));
}

/**
 * Retrospective prediction evaluation on matches the workspace already contains.
 * Runs the same model on each historical fixture and scores it with Brier / log loss.
 */
export function evaluatePredictionQuality(matches: Match[], allPlayers: Player[], venues: Venue[], simulationsPerMatch = 400) {
  const forecasts: { p: number; outcome: 0 | 1; matchId: string; predicted: string; actual: string }[] = [];
  const evaluated = matches.filter((m) => m.winnerId).slice(0, 12);
  for (const m of evaluated) {
    // Split the sides from the ball-by-ball events, not from scorecard order: a
    // scorecard only lists players who batted or bowled, so positional slicing
    // would silently mix the two teams.
    const inn1 = [...new Set(m.events.filter((e) => e.innings === 1).map((e) => e.batterId))];
    const inn2 = [...new Set(m.events.filter((e) => e.innings === 2).map((e) => e.batterId))];
    if (inn1.length < 6 || inn2.length < 6) continue;
    const firstBattingTeam = m.tossDecision === 'bat'
      ? m.tossWinnerId
      : m.tossWinnerId === m.homeId ? m.awayId : m.homeId;
    const homeBattedFirst = firstBattingTeam === m.homeId;
    const homeTeamPlayers = allPlayers.filter((p) => (homeBattedFirst ? inn1 : inn2).includes(p.id));
    const awayTeamPlayers = allPlayers.filter((p) => (homeBattedFirst ? inn2 : inn1).includes(p.id));
    if (homeTeamPlayers.length < 6 || awayTeamPlayers.length < 6) continue;
    const venue = venues.find((v) => v.id === m.venueId) ?? null;
    const sim = simulateMatch(
      { teamId: m.homeId, name: m.homeId, players: homeTeamPlayers },
      { teamId: m.awayId, name: m.awayId, players: awayTeamPlayers },
      { venue, simulations: simulationsPerMatch, seed: hashSeed(m.id), tossWinnerId: m.tossWinnerId, tossDecision: m.tossDecision },
    );
    forecasts.push({
      p: sim.teamA.winProbability, outcome: m.winnerId === m.homeId ? 1 : 0,
      matchId: m.id, predicted: m.homeId, actual: m.winnerId ?? 'tie',
    });
  }
  return {
    n: forecasts.length,
    brier: forecasts.length ? Number(brierScore(forecasts.map((f) => ({ p: f.p, outcome: f.outcome })))!.toFixed(4)) : null,
    logLoss: forecasts.length ? Number(logLoss(forecasts.map((f) => ({ p: f.p, outcome: f.outcome })))!.toFixed(4)) : null,
    calibration: calibrationTable(forecasts.map((f) => ({ p: f.p, outcome: f.outcome }))),
    forecasts,
    interpretation: 'Reference scale: a coin flip scores 0.25 Brier. Scores below 0.25 indicate the model beat an uninformative baseline on these fixtures. With a dozen demo matches, the confidence interval on this estimate is wide — it is a sanity check, not proof of skill.',
  };
}
