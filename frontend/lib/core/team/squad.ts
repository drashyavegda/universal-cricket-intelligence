/** Squad & team strategy intelligence (Feature 10/19). */
import { buildCohort, type CohortRow } from '../players/metrics';
import type { MatchEvent, Match, Player, Team, Venue } from '../types';
import { ALLROUNDER_ROLES, BATTER_ROLES, BOWLER_ROLES } from '../types';

export interface SquadAnalysis {
  teamId: string;
  teamName: string;
  squadSize: number;
  overseasCount: number;
  overseasLimit: number;
  roleBreakdown: { role: string; count: number; qualityAvg: number }[];
  battingDepth: number;
  bowlingDepth: number;
  paceOptions: number;
  spinOptions: number;
  allRounders: number;
  keepers: number;
  phaseCoverage: { phase: 'powerplay' | 'middle' | 'death'; batting: number; bowling: number; note: string }[];
  balanceScore: number;
  weaknesses: { title: string; severity: 'high' | 'medium' | 'low'; evidence: string; suggestion: string }[];
  strengths: { title: string; evidence: string }[];
  avgAge: number | null;
  ageProfile: { bucket: string; count: number }[];
  recommendations: { action: string; rationale: string; priority: 'P1' | 'P2' | 'P3' }[];
  trust: number;
}

const qualityOf = (row: CohortRow): number => {
  const b = row.percentiles['batting.strikeRate'] ?? null;
  const avg = row.percentiles['batting.average'] ?? null;
  const econ = row.percentiles['bowling.economy'] ?? null;
  const bowlSr = row.percentiles['bowling.strikeRate'] ?? null;
  const bat = b !== null && avg !== null ? (b + avg) / 2 : b ?? avg;
  const bowl = econ !== null && bowlSr !== null ? (econ + bowlSr) / 2 : econ ?? bowlSr;
  const vals = [bat, bowl].filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((a, c) => a + c, 0) / vals.length : 40;
};

export function analyseSquad(team: Team, squad: Player[], allPlayers: Player[], events?: MatchEvent[]): SquadAnalysis {
  const cohort = buildCohort(allPlayers, events);
  const rows = cohort.filter((r) => squad.some((p) => p.id === r.player.id));
  const battingRows = rows.filter((r) => BATTER_ROLES.includes(r.player.role) || r.metrics.batting.balls > 150);
  const bowlingRows = rows.filter((r) => BOWLER_ROLES.includes(r.player.role) || ALLROUNDER_ROLES.includes(r.player.role));
  const battingDepth = battingRows.length ? battingRows.reduce((a, r) => a + qualityOf(r), 0) / Math.max(1, 11) : 0;
  const bowlingDepth = bowlingRows.length ? bowlingRows.reduce((a, r) => a + qualityOf(r), 0) / Math.max(1, 6) : 0;
  const paceOptions = squad.filter((p) => p.bowlingType === 'Pace' && p.bowling.balls >= 60).length;
  const spinOptions = squad.filter((p) => p.bowlingType === 'Spin' && p.bowling.balls >= 60).length;
  const allRounders = squad.filter((p) => ALLROUNDER_ROLES.includes(p.role)).length;
  const keepers = squad.filter((p) => p.wicketkeeper).length;

  const phaseCoverage = (['powerplay', 'middle', 'death'] as const).map((phase) => {
    const bat = rows.reduce((acc, r) => {
      const v = phase === 'powerplay' ? r.metrics.phase.powerplaySR : phase === 'death' ? r.metrics.phase.deathSR : r.metrics.batting.strikeRate;
      return acc + (v ?? 0);
    }, 0) / Math.max(1, rows.length);
    const bowl = rows.reduce((acc, r) => {
      const v = phase === 'powerplay' ? r.metrics.phase.powerplayEcon : phase === 'death' ? r.metrics.phase.deathEcon : r.metrics.bowling.economy;
      return acc + (v ?? 0);
    }, 0) / Math.max(1, rows.length);
    return {
      phase,
      batting: Number(bat.toFixed(1)),
      bowling: Number(bowl.toFixed(2)),
      note: phase === 'death' ? 'Death economy is the most predictive phase signal for T20 bowling depth.' : phase === 'powerplay' ? 'Powerplay strike rate and economy both matter; field restrictions amplify intent.' : 'Middle overs decide match-ups; spin control is usually the differentiator.',
    };
  });

  const overseasCount = squad.filter((p) => p.overseas).length;
  const avgAge = squad.length ? squad.reduce((a, p) => a + (p.age ?? 0), 0) / squad.filter((p) => p.age !== null).length : null;

  const weaknesses: SquadAnalysis['weaknesses'] = [];
  if (paceOptions < 3) weaknesses.push({ title: 'Thin pace attack', severity: paceOptions < 2 ? 'high' : 'medium', evidence: `Only ${paceOptions} pace options with ≥60 balls of evidence in the squad.`, suggestion: 'Target a wicket-taking or death-phase pace option in the auction.' });
  if (spinOptions < 2) weaknesses.push({ title: 'Limited spin control', severity: 'medium', evidence: `${spinOptions} spinner(s) with ≥60 balls of evidence.`, suggestion: 'Add a middle-over spin controller, ideally one with low middle-overs economy.' });
  if (keepers === 0) weaknesses.push({ title: 'No wicketkeeper', severity: 'high', evidence: 'No player in the squad is flagged as a wicketkeeper.', suggestion: 'A keeper is a hard XI constraint — add one before the auction closes.' });
  if (allRounders < 2) weaknesses.push({ title: 'Few all-rounders', severity: 'medium', evidence: `${allRounders} all-rounder(s) provide two-way cover.`, suggestion: 'An all-rounder improves XI flexibility and covers a failed role pick.' });
  const deathBowl = phaseCoverage.find((p) => p.phase === 'death')!;
  if (deathBowl.bowling > 9.2) weaknesses.push({ title: 'Death-overs bowling risk', severity: 'high', evidence: `Squad-average death economy proxy ${deathBowl.bowling} runs/over.`, suggestion: 'Recruit a specialist death bowler — verify with phase data, not overall economy.' });
  const ppBat = phaseCoverage.find((p) => p.phase === 'powerplay')!;
  if (ppBat.batting < 125) weaknesses.push({ title: 'Slow powerplay scoring', severity: 'medium', evidence: `Squad-average powerplay strike rate proxy ${ppBat.batting}.`, suggestion: 'An aggressive opener raises the powerplay ceiling.' });
  if (squad.filter((p) => p.age === null).length) weaknesses.push({ title: 'Incomplete age data', severity: 'low', evidence: `${squad.filter((p) => p.age === null).length} squad members have no DOB.`, suggestion: 'Complete DOB records to enable age-adjusted and retention analysis.' });

  const strengths: SquadAnalysis['strengths'] = [];
  if (paceOptions >= 4) strengths.push({ title: 'Pace depth', evidence: `${paceOptions} pace options with meaningful samples.` });
  if (spinOptions >= 3) strengths.push({ title: 'Spin depth', evidence: `${spinOptions} spin options available.` });
  if (allRounders >= 3) strengths.push({ title: 'All-rounder flexibility', evidence: `${allRounders} two-way players.` });

  const depthComponent = Math.min(100, (battingDepth * 0.35 + bowlingDepth * 0.35));
  const structureComponent = Math.min(100, paceOptions * 12 + spinOptions * 12 + allRounders * 10 + Math.min(keepers, 2) * 8);
  const phaseComponent = Math.max(0, 100 - Math.max(0, deathBowl.bowling - 7) * 12);
  const balanceScore = Math.max(0, Math.min(100, depthComponent * 0.5 + structureComponent * 0.25 + phaseComponent * 0.25));

  const buckets = ['≤20', '21-24', '25-28', '29-32', '33+'];
  const ageProfile = buckets.map((b) => ({
    bucket: b,
    count: squad.filter((p) => p.age === null ? false : b === '≤20' ? p.age <= 20 : b === '21-24' ? p.age >= 21 && p.age <= 24 : b === '25-28' ? p.age >= 25 && p.age <= 28 : b === '29-32' ? p.age >= 29 && p.age <= 32 : p.age >= 33).length,
  }));

  const recommendations: SquadAnalysis['recommendations'] = [];
  if (keepers === 0) recommendations.push({ action: 'Recruit a wicketkeeper-batter', rationale: 'Hard XI constraint. Without one the optimiser must field an out-of-position keeper.', priority: 'P1' });
  if (paceOptions < 3) recommendations.push({ action: 'Add a frontline pace bowler', rationale: 'Pace depth drives both powerplay and death-phase options.', priority: 'P1' });
  if (deathBowl.bowling > 9.2) recommendations.push({ action: 'Target a death specialist', rationale: 'Verify with phase-split economy; overall economy can hide death leakage.', priority: 'P1' });
  if (allRounders < 2) recommendations.push({ action: 'Add an all-rounder', rationale: 'Improves XI flexibility and injury cover.', priority: 'P2' });
  if ((avgAge ?? 0) > 30) recommendations.push({ action: 'Rebalance toward younger talent', rationale: `Squad average age proxy ${avgAge?.toFixed(1)} limits long-term headroom.`, priority: 'P3' });

  return {
    teamId: team.id, teamName: team.name, squadSize: squad.length,
    overseasCount, overseasLimit: team.overseasLimit,
    roleBreakdown: [...new Set(squad.map((p) => p.role))].map((role) => {
      const inRole = rows.filter((r) => r.player.role === role);
      return { role, count: inRole.length, qualityAvg: Number((inRole.reduce((a, r) => a + qualityOf(r), 0) / Math.max(1, inRole.length)).toFixed(1)) };
    }),
    battingDepth: Number(battingDepth.toFixed(1)),
    bowlingDepth: Number(bowlingDepth.toFixed(1)),
    paceOptions, spinOptions, allRounders, keepers,
    phaseCoverage, balanceScore: Number(balanceScore.toFixed(1)),
    weaknesses, strengths, avgAge: avgAge === null ? null : Number(avgAge.toFixed(1)), ageProfile,
    recommendations,
    trust: Number((squad.reduce((a, p) => a + p.confidence, 0) / Math.max(1, squad.length) * 100).toFixed(1)),
  };
}

export interface ReplacementImpact {
  out: Player; in: Player;
  deltaBatting: number; deltaBowling: number; deltaBalance: number;
  verdict: string; caveats: string[];
}

/** Player replacement simulator (Feature 8/10). */
export function simulateReplacement(team: Team, squad: Player[], outId: string, inId: string, allPlayers: Player[]): ReplacementImpact {
  const out = squad.find((p) => p.id === outId) ?? allPlayers.find((p) => p.id === outId)!;
  const inn = allPlayers.find((p) => p.id === inId)!;
  const before = analyseSquad(team, squad, allPlayers);
  const after = analyseSquad(team, squad.filter((p) => p.id !== outId).concat(inn), allPlayers);
  const verdict = after.balanceScore > before.balanceScore + 1
    ? `Improves squad balance by ${(after.balanceScore - before.balanceScore).toFixed(1)} points.`
    : after.balanceScore < before.balanceScore - 1
      ? `Reduces squad balance by ${(before.balanceScore - after.balanceScore).toFixed(1)} points.`
      : 'Broadly neutral on squad balance — decide on role fit and price.';
  return {
    out, in: inn,
    deltaBatting: Number((after.battingDepth - before.battingDepth).toFixed(1)),
    deltaBowling: Number((after.bowlingDepth - before.bowlingDepth).toFixed(1)),
    deltaBalance: Number((after.balanceScore - before.balanceScore).toFixed(1)),
    verdict,
    caveats: [
      'Replacement impact is a proxy using squad-level aggregates, not a full match simulation.',
      'Overseas slots and purse constraints are not enforced here — check the auction module before committing.',
      inn.role !== out.role ? `Role change: ${out.role} → ${inn.role}. XI structure may need reshaping.` : 'Same role, so the XI structure is preserved.',
    ],
  };
}

export function teamForm(matches: Match[], teamId: string): { played: number; wins: number; losses: number; ties: number; winRate: number | null; recent: ('W' | 'L' | 'T')[] } {
  const played = matches.filter((m) => m.homeId === teamId || m.awayId === teamId);
  const wins = played.filter((m) => m.winnerId === teamId).length;
  const ties = played.filter((m) => m.winnerId === null).length;
  return {
    played: played.length, wins, losses: played.length - wins - ties, ties,
    winRate: played.length ? Number((wins / played.length).toFixed(3)) : null,
    recent: played.slice(-5).map((m) => (m.winnerId === teamId ? 'W' : m.winnerId === null ? 'T' : 'L')),
  };
}

export function pitchSuitability(player: Player, venue: Venue): { score: number; reason: string } {
  const p = venue.pitch;
  const isSpinner = player.bowlingType === 'Spin';
  const isPacer = player.bowlingType === 'Pace';
  let score = 50;
  const reasons: string[] = [];
  if (isSpinner) {
    score += (p.spinRating - 5) * 7;
    reasons.push(`spin rating ${p.spinRating}/10 at ${venue.name}`);
  }
  if (isPacer) {
    score += (p.paceRating - 5) * 6 + (p.seamRating - 5) * 2;
    reasons.push(`pace/seam ratings ${p.paceRating}/${p.seamRating} at ${venue.name}`);
  }
  if (BATTER_ROLES.includes(player.role)) {
    score += (p.battingFriendliness - 6) * 5 - (p.twoPaced - 4) * 2;
    reasons.push(`batting friendliness ${p.battingFriendliness}/10, two-paced ${p.twoPaced}/10`);
  }
  if (venue.dewRisk > 0.6 && isSpinner) { score -= 6; reasons.push('high dew risk reduces second-innings spin grip'); }
  return { score: Number(Math.max(0, Math.min(100, score)).toFixed(1)), reason: reasons.join('; ') || 'Neutral surface profile' };
}
