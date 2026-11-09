/**
 * Conversational analytics executor (Feature 27).
 * Parses the question deterministically, runs the real engine, then optionally
 * has an LLM narrate the already-computed result.
 */
import { getStore } from '../db/store';
import { buildCohort, computePlayerMetrics } from '../players/metrics';
import { rankPlayers } from '../ranking/engine';
import { STRATEGY_PRESETS } from '../ranking/presets';
import { analyseSquad } from '../team/squad';
import { valuatePlayer } from '../auction/valuation';
import { venueDNA, tossStrategy } from '../pitch/venue';
import { analyseWorkload } from '../workload/engine';
import { simulateMatch } from '../sim/match';
import { buildHelp, parseQuery, type AssistantAnswer } from './nlq';
import { aiCall } from './gateway';
import type { Player } from '../types';

const fmt = (n: number | null | undefined, digits = 1) => (n === null || n === undefined ? '—' : Number(n).toFixed(digits));

export async function answerQuery(query: string, opts: { language?: 'en' | 'hi' | 'gu'; useAi?: boolean } = {}): Promise<AssistantAnswer> {
  const store = getStore();
  const events = store.matches.flatMap((m) => m.events);
  const parsed = parseQuery(query, store.players.map((p) => p.name));
  if (parsed.intent === 'help' || parsed.intent === 'unknown') {
    const help = buildHelp();
    return { ...help, query, parsed: { ...parsed, intent: 'help' } };
  }

  const preset = STRATEGY_PRESETS.find((p) => p.key === parsed.preset) ?? STRATEGY_PRESETS[0];
  const weights = parsed.role && parsed.role.includes('Bowler') ? (STRATEGY_PRESETS.find((p) => p.key === 'economical_bowler')!.weights) : preset.weights;

  let answer = '';
  const evidence: AssistantAnswer['evidence'] = [];
  const actions: AssistantAnswer['actions'] = [];
  let confirmRequired = false;
  let confirmationPrompt: string | undefined;

  if (parsed.intent === 'rank_players' || parsed.intent === 'find_role') {
    const ranking = rankPlayers(store.players, {
      weights, roles: parsed.role ? [parsed.role] : undefined,
      maxAge: parsed.maxAge, minAge: parsed.minAge, requireAge: parsed.maxAge !== null,
      ageWeight: parsed.maxAge ? 0.6 : 0, limit: 8, presetKey: preset.key,
    }, events);
    const top = ranking.rows;
    answer = top.length
      ? `Under the "${preset.label}" weighting${parsed.role ? ` for ${parsed.role}s` : ''}${parsed.maxAge ? ` aged ≤ ${parsed.maxAge}` : ''}, the cohort contains ${ranking.cohortSize} eligible players. The leading candidates are: ${top.map((r, i) => `${i + 1}. ${r.player.name} (${r.player.age ?? 'age n/a'}, ${r.player.role}) — score ${r.score.toFixed(1)}, SR ${fmt(computePlayerMetrics(r.player).batting.strikeRate)}, avg ${fmt(computePlayerMetrics(r.player).batting.average)}, economy ${fmt(computePlayerMetrics(r.player).bowling.economy, 2)}`).join('; ')}. Each score is a weighted average of percentile ranks in this cohort, multiplied by an evidence adjustment of ×${top[0]?.evidenceAdjustment ?? 1} for sample reliability.`
      : 'No player matched those filters. Try widening the age range or removing the role filter.';
    top.slice(0, 6).forEach((r) => evidence.push({ label: `#${r.rank} ${r.player.name}`, value: `score ${r.score.toFixed(1)} · ${r.positives[0] ?? 'no standout metric'}`, source: 'Ranking engine' }));
    evidence.push({ label: 'Cohort', value: `${ranking.cohortSize} players after filters`, source: 'Ranking engine' });
    actions.push({ label: 'Open in Talent Discovery', href: `/talent?maxAge=${parsed.maxAge ?? 23}&preset=${preset.key}` });
  } else if (parsed.intent === 'compare_players' || parsed.intent === 'explain_player') {
    const players = parsed.players.map((n) => store.players.find((p) => p.name === n)).filter((p): p is Player => Boolean(p));
    if (players.length === 0) {
      answer = 'I could not match those player names in the current workspace. Names must match the dataset exactly; try the Comparison page for a searchable picker.';
    } else if (parsed.intent === 'explain_player' || players.length === 1) {
      const p = players[0];
      const ranking = rankPlayers(store.players, { weights, limit: store.players.length, presetKey: preset.key }, events);
      const row = ranking.rows.find((r) => r.player.id === p.id);
      const m = computePlayerMetrics(p, events);
      answer = row
        ? `${p.name} ranks #${row.rank} of ${ranking.rows.length} under the "${preset.label}" weighting with a score of ${row.score.toFixed(1)}. Raw weighted percentile ${row.rawScore.toFixed(1)}, evidence adjustment ×${row.evidenceAdjustment}, age headroom +${row.ageBonus.toFixed(1)}. Strongest signals: ${row.positives.join('; ')}. Weakest: ${row.negatives.join('; ') || 'nothing below the 40th percentile'}. Sample: ${p.batting.balls} balls faced, ${p.bowling.balls} balls bowled — labelled "${m.batting.sampleLabel}".`
        : `${p.name} is not in the ranked cohort (possibly filtered out).`;
      if (row) row.components.filter((c) => !c.missing).forEach((c) => evidence.push({ label: c.label, value: `${c.percentile?.toFixed(0)}th percentile · weight ${c.weight} · contributes ${c.contribution}`, source: 'Ranking engine' }));
      actions.push({ label: 'Open player profile', href: `/players/${p.id}` });
    } else {
      const metrics = players.map((p) => ({ p, m: computePlayerMetrics(p, events) }));
      answer = `Comparing ${players.length} players: ${metrics.map(({ p, m }) => `${p.name} — SR ${fmt(m.batting.strikeRate)}, avg ${fmt(m.batting.average)}, boundary% ${fmt(m.batting.boundaryPct)}, economy ${fmt(m.bowling.economy, 2)}, bowling SR ${fmt(m.bowling.strikeRate)}, form ${fmt(m.form.formIndex)}`).join('; ')}. Differences under roughly 10 strike-rate points are usually inside sampling noise for these sample sizes (${metrics.map(({ p }) => `${p.name.split(' ')[0]} ${p.batting.balls}b`).join(', ')}).`;
      metrics.forEach(({ p, m }) => evidence.push({ label: p.name, value: `SR ${fmt(m.batting.strikeRate)} · avg ${fmt(m.batting.average)} · econ ${fmt(m.bowling.economy, 2)} · n=${p.batting.balls} balls`, source: 'Computed metrics' }));
      actions.push({ label: 'Open comparison lab', href: `/compare?ids=${players.map((p) => p.id).join(',')}` });
    }
  } else if (parsed.intent === 'auction_value') {
    const cohort = buildCohort(store.players, events);
    const targets = parsed.players.length
      ? parsed.players.map((n) => store.players.find((p) => p.name === n)).filter((p): p is Player => Boolean(p))
      : store.players.filter((p) => !p.overseas && p.age !== null && p.age <= (parsed.maxAge ?? 24)).slice(0, 5);
    const valuations = targets.map((p) => valuatePlayer({ player: p, cohort, roleScarcity: 0.6, teamNeed: 0.55, competitorDemand: 0.5, history: store.auctions }));
    answer = valuations.length
      ? `Estimated fair values (not expected auction prices): ${valuations.map((v) => `${v.name} ₹${v.fairValueLakh}L (band ₹${v.rangeLakh.low}–₹${v.rangeLakh.high}L; ceilings conservative ₹${v.maxBid.conservative}L / balanced ₹${v.maxBid.balanced}L / aggressive ₹${v.maxBid.aggressive}L)`).join('; ')}. A maximum bid is a strategy decision that also accounts for the cost of losing the player, so treat the ceilings separately from the fair-value estimate.`
      : 'I could not identify targets for that query.';
    valuations.forEach((v) => evidence.push({ label: v.name, value: `fair ₹${v.fairValueLakh}L · quality ${v.qualityScore}/100 · scarcity ${(v.scarcityIndex * 100).toFixed(0)}%`, source: 'Valuation engine (demo calibration)' }));
    actions.push({ label: 'Open Auction Command Centre', href: '/auction' });
  } else if (parsed.intent === 'pitch') {
    const venue = store.venues.find((v) => query.toLowerCase().includes(v.city.toLowerCase()) || query.toLowerCase().includes(v.name.toLowerCase())) ?? store.venues[0];
    const weather = store.weather.find((w) => w.venueId === venue.id) ?? null;
    const dna = venueDNA(venue, weather, store.matches);
    const toss = tossStrategy(venue, weather);
    answer = `${dna.summary} Toss lean: ${toss.decision === 'bowl' ? 'bowl first' : 'bat first'} at ${(toss.confidence * 100).toFixed(0)}% confidence — ${toss.reasons.join(' ')} Pace rating ${venue.pitch.paceRating}/10 vs spin ${venue.pitch.spinRating}/10. ${toss.caveat}`;
    dna.values.slice(0, 6).forEach((v) => evidence.push({ label: v.label, value: `${v.value} (${v.evidence})`, source: v.note }));
    actions.push({ label: 'Open Pitch & Venue Intelligence', href: `/pitch?venue=${venue.id}` });
  } else if (parsed.intent === 'workload') {
    const p = parsed.players.length ? store.players.find((x) => x.name === parsed.players[0])! : store.players[0];
    const w = analyseWorkload(p, store.settings.referenceDate);
    answer = `${p.name}: ${w.matchesLast21} matches and ${w.ballsBowledLast21} balls bowled in the last 21 days, acute:chronic ratio ${w.acuteChronicRatio ?? 'n/a'}, workload index ${w.workloadIndex}/100 (${w.riskIndicator}). ${w.rotationSuggestion} ${w.disclaimer}`;
    w.flags.forEach((f) => evidence.push({ label: f.label, value: f.detail, source: f.action }));
    actions.push({ label: 'Open Workload Management', href: '/workload' });
  } else if (parsed.intent === 'squad_analysis') {
    const team = store.teams.find((t) => t.isUserTeam)!;
    const squad = store.players.filter((p) => team.squadIds.includes(p.id));
    const analysis = analyseSquad(team, squad, store.players, events);
    answer = `${team.name} has ${squad.length} players with a balance score of ${analysis.balanceScore}/100. Batting depth ${analysis.battingDepth}, bowling depth ${analysis.bowlingDepth}, ${analysis.paceOptions} pace and ${analysis.spinOptions} spin options, ${analysis.allRounders} all-rounders, ${analysis.keepers} keeper(s). Weaknesses: ${analysis.weaknesses.map((w) => `${w.title} (${w.severity})`).join('; ') || 'none detected'}. Priorities: ${analysis.recommendations.slice(0, 3).map((r) => `${r.priority} ${r.action}`).join('; ') || 'none'}.`;
    analysis.weaknesses.forEach((w) => evidence.push({ label: w.title, value: w.evidence, source: w.suggestion }));
    actions.push({ label: 'Open Team Intelligence', href: '/team' });
  } else if (parsed.intent === 'prediction') {
    const team = store.teams.find((t) => t.isUserTeam)!;
    const other = store.teams.find((t) => t.id !== team.id)!;
    const xiA = store.players.filter((p) => team.squadIds.slice(0, 11).includes(p.id));
    const xiB = store.players.filter((p) => other.squadIds.slice(0, 11).includes(p.id));
    const sim = simulateMatch({ teamId: team.id, name: team.name, players: xiA }, { teamId: other.id, name: other.name, players: xiB }, { venue: store.venues[0], simulations: 3000, seed: 99 });
    answer = `Simulating ${team.name} vs ${other.name} over ${sim.runs.toLocaleString()} seeded innings pairs: ${team.name} win probability ${(sim.teamA.winProbability * 100).toFixed(1)}% (±${(sim.simulationError * 100).toFixed(1)}pp simulation error), projected score ${sim.teamA.projected} vs ${sim.teamB.projected}. This is a distribution, not a guarantee — the 90% band for ${team.name} is ${sim.teamA.score.p05}–${sim.teamA.score.p95}.`;
    evidence.push({ label: 'Win probability', value: `${(sim.teamA.winProbability * 100).toFixed(1)}% ±${(sim.simulationError * 100).toFixed(1)}pp`, source: 'Monte Carlo, seeded' });
    evidence.push({ label: 'Projected scores', value: `${sim.teamA.projected} vs ${sim.teamB.projected}`, source: 'Median of simulations' });
    actions.push({ label: 'Open Prediction Lab', href: '/prediction' });
  } else if (parsed.intent === 'write_action') {
    confirmRequired = true;
    confirmationPrompt = 'This request would change workspace data. Nothing has been written. Use the relevant page (Data Room for approvals, Talent → Shortlists for saving, Reports for generating a document) and confirm there, so the action itself is audited with your account attached.';
    answer = 'I can read, rank, compare and explain — but I never write to the workspace on my own. Saving a shortlist, approving a dataset or generating a report are consequential actions that require an explicit confirmation in the UI (and are recorded in the audit log with your user). Tell me which one you want and open the page from the actions below.';
    actions.push({ label: 'Open shortlists', href: '/talent' });
    actions.push({ label: 'Open Data Room', href: '/data' });
  } else if (parsed.intent === 'report') {
    confirmRequired = true;
    confirmationPrompt = 'Generating a report saves a new artefact in the workspace (and may consume AI tokens if a live model is configured). Confirm to proceed.';
    answer = `I can prepare a ${parsed.players.length ? `${parsed.players[0]} scouting report` : 'talent discovery report'} with evidence tables and a quality score. Nothing has been written yet — this action needs your confirmation.`;
    actions.push({ label: 'Open Reports workspace', href: '/reports' });
  }

  if (!answer) {
    answer = `I parsed this as “${parsed.interpretation}”, but there is no read-only handler for it yet, so I will not guess. Try asking about rankings, comparisons, auction value, pitch conditions, workload, squad balance or a match prediction.`;
    actions.push({ label: 'See what I can answer', href: '/assistant' });
  }

  let aiMode: string | undefined; let aiNote: string | undefined;
  if (opts.useAi !== false) {
    const res = await aiCall({
      purpose: 'assistant.narrate',
      prompt: `Question: ${query}\n\nComputed result (authoritative — do not add numbers):\n${answer}\n\nRewrite as a crisp analyst answer of at most 120 words. Do not invent statistics.`,
      fallback: answer,
    });
    aiMode = res.mode;
    aiNote = res.note;
    if (res.mode === 'live' && res.text) answer = res.text;
  }

  return {
    query, parsed: { ...parsed, language: opts.language ?? parsed.language },
    answer, evidence, actions, followUps: parsed.suggestions.slice(0, 3),
    confirmRequired, confirmationPrompt, aiMode, aiNote,
  };
}
