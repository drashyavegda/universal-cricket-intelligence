/** Opposition scouting & tactical intelligence (Feature 19). */
import { analyseSquad, teamForm, type SquadAnalysis } from './squad';
import { buildCohort } from '../players/metrics';
import { matchups } from '../sim/match';
import type { Match, MatchEvent, Player, Team } from '../types';

export interface OppositionReport {
  teamId: string; teamName: string;
  form: ReturnType<typeof teamForm>;
  structure: { role: string; count: number; threat: number }[];
  keyPlayers: { playerId: string; name: string; role: string; threat: number; why: string; counter: string }[];
  dependency: { metric: string; value: string; interpretation: string }[];
  weaknesses: SquadAnalysis['weaknesses'];
  bowlingPlan: { phase: string; plan: string; evidence: string }[];
  battingPlan: { phase: string; plan: string; evidence: string }[];
  matchups: ReturnType<typeof matchups>;
  scenarios: { scenario: string; effect: string }[];
  caveat: string;
}

export function scoutOpposition(team: Team, squad: Player[], allPlayers: Player[], matches: Match[], events: MatchEvent[], ownSquad: Player[]): OppositionReport {
  const analysis = analyseSquad(team, squad, allPlayers, events);
  const cohort = buildCohort(allPlayers, events);
  const scoringPlayers = squad.map((p) => {
    const row = cohort.find((r) => r.player.id === p.id);
    const bat = row?.percentiles['batting.strikeRate'] ?? 0;
    const bowl = row?.percentiles['bowling.strikeRate'] ?? 0;
    return { player: p, threat: Number(((bat ?? 0) * 0.55 + (bowl ?? 0) * 0.45).toFixed(1)) };
  }).sort((a, b) => b.threat - a.threat);

  const keyPlayers = scoringPlayers.slice(0, 5).map((s) => {
    const m = cohort.find((r) => r.player.id === s.player.id)?.metrics;
    return {
      playerId: s.player.id, name: s.player.name, role: s.player.role, threat: s.threat,
      why: `SR ${m?.batting.strikeRate ?? '—'} · avg ${m?.batting.average ?? '—'} · econ ${m?.bowling.economy ?? '—'} · best phase ${m?.phase.bestBattingPhase ?? 'n/a'}`,
      counter: s.player.bowlingType === 'Spin' ? 'Attack with a left-handed hitter inside the powerplay; spin from one end only.' : s.player.role.includes('Finisher') ? 'Take pace off in the death overs; use wide-yorker plans and a sweeper.' : 'Deny pace on the ball early; use a leg-spinner into the pitch.',
    };
  });

  const totalRuns = squad.reduce((a, p) => a + p.batting.runs, 0) || 1;
  const keyShare = scoringPlayers.slice(0, 3).reduce((a, s) => a + s.player.batting.runs, 0) / totalRuns;

  return {
    teamId: team.id, teamName: team.name,
    form: teamForm(matches, team.id),
    structure: analysis.roleBreakdown.map((r) => ({ role: r.role, count: r.count, threat: r.qualityAvg })),
    keyPlayers,
    dependency: [
      { metric: 'Top-3 run share', value: `${(keyShare * 100).toFixed(0)}%`, interpretation: keyShare > 0.55 ? 'Heavily dependent on three batters — early wickets are disproportionately valuable.' : 'Runs are spread; removing one batter is unlikely to collapse the innings.' },
      { metric: 'Squad balance score', value: `${analysis.balanceScore}/100`, interpretation: analysis.balanceScore > 65 ? 'Well-balanced squad; attack the thinner phase rather than the personnel.' : 'Structurally uneven — target the phase where their depth is weakest.' },
      { metric: 'Death economy proxy', value: `${analysis.phaseCoverage.find((p) => p.phase === 'death')?.bowling}`, interpretation: 'Above ~9.2 suggests a death-bowling weakness worth planning for.' },
    ],
    weaknesses: analysis.weaknesses,
    bowlingPlan: [
      { phase: 'Powerplay', plan: `Use your best new-ball bowler against their ${keyPlayers[0]?.name ?? 'top-order'}; keep a catching mid-off and a fine leg.`, evidence: `Opposition powerplay strike-rate proxy ${analysis.phaseCoverage[0].batting}.` },
      { phase: 'Middle overs', plan: analysis.spinOptions >= 2 ? 'Match up spin against their middle order; two-over spells to deny rhythm.' : 'Use cutters and hard lengths; their middle order scores at a moderate rate.', evidence: `Opposition middle-overs run rate proxy from phase splits.` },
      { phase: 'Death', plan: `Their death economy proxy is ${analysis.phaseCoverage[2].bowling}; the batters will look to clear the shorter boundary — protect it with your best yorker bowler.`, evidence: 'Phase-split economy aggregate across the squad.' },
    ],
    battingPlan: [
      { phase: 'Powerplay', plan: analysis.paceOptions < 3 ? 'Take on their thin pace attack early — the third seamer is a target.' : 'Play out the new ball with minimal risk; their pace depth is real.', evidence: `${analysis.paceOptions} pace options in their squad.` },
      { phase: 'Middle overs', plan: analysis.spinOptions >= 3 ? 'Rotate strike, avoid cross-bat shots against spin; target the weakest spinner.' : 'Use the middle overs to attack spin; they lack a frontline controller.', evidence: `${analysis.spinOptions} spin options.` },
      { phase: 'Death', plan: 'Their keeper/fielding shape can be exploited with hard-run twos; identify the boundary-rider with the weakest arm.', evidence: 'Fielding aggregates only — no tracking data available.' },
    ],
    matchups: matchups(events, allPlayers).filter((m) => squad.some((p) => p.id === m.batterId) && ownSquad.some((p) => p.id === m.bowlerId)).slice(0, 12),
    scenarios: [
      { scenario: 'If they bat first and reach 60/1 at six overs', effect: 'Their win share rises sharply; counter with spin from both ends in overs 7–12.' },
      { scenario: 'If you remove their top scorer inside the powerplay', effect: 'Their top-3 dependency means the middle order is exposed against your best death bowler.' },
      { scenario: 'If dew arrives after 15 overs', effect: 'Their chase becomes easier; keep an extra seamer for wet-ball yorkers.' },
    ],
    caveat: 'This report is inferred from observed scorecards and squad composition in this workspace. It does not represent any team’s private plans, selection thinking, or internal data.',
  };
}
