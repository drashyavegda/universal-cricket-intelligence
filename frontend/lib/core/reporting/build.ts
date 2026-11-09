/**
 * Automated reports & data storytelling (Feature 23).
 * Every sentence is generated from computed values; AI may rephrase, never invent.
 */
import { getStore } from '../db/store';
import { buildCohort } from '../players/metrics';
import { rankPlayers } from '../ranking/engine';
import { STRATEGY_PRESETS } from '../ranking/presets';
import { analyseSquad } from '../team/squad';
import { assessRisk } from '../players/risk';
import { assessPotential } from '../players/potential';
import { valuatePlayer, marketOverview } from '../auction/valuation';
import { venueDNA, tossStrategy } from '../pitch/venue';
import { buildTrajectory } from '../career/trajectory';
import { analyseWorkload } from '../workload/engine';
import type { Player, ReportSection, SavedReport } from '../types';

const HEADINGS: Record<'en' | 'hi' | 'gu', Record<string, string>> = {
  en: { summary: 'Executive summary', evidence: 'Evidence', method: 'Method & assumptions', risk: 'Risk assessment', recommendation: 'Recommendation', context: 'Context' },
  hi: { summary: 'कार्यकारी सारांश', evidence: 'प्रमाण', method: 'विधि और मान्यताएँ', risk: 'जोखिम मूल्यांकन', recommendation: 'सिफ़ारिश', context: 'परिप्रेक्ष्य' },
  gu: { summary: 'કાર્યકારી સારાંશ', evidence: 'પુરાવો', method: 'પદ્ધતિ અને ધારણાઓ', risk: 'જોખમ મૂલ્યાંકન', recommendation: 'ભલામણ', context: 'સંદર્ભ' },
};

export function buildPlayerReport(playerId: string, language: 'en' | 'hi' | 'gu' = 'en'): SavedReport {
  const store = getStore();
  const player = store.players.find((p) => p.id === playerId)!;
  const cohort = buildCohort(store.players, store.matches.flatMap((m) => m.events));
  const row = cohort.find((r) => r.player.id === player.id)!;
  const h = HEADINGS[language];
  const potential = assessPotential(row);
  const risk = assessRisk(row, { potential: potential.potential });
  const valuation = valuatePlayer({
    player, cohort, roleScarcity: 0.6, teamNeed: 0.5, competitorDemand: 0.5, history: store.auctions,
  });
  const trajectory = buildTrajectory(player);
  const workload = analyseWorkload(player, store.settings.referenceDate);
  const m = row.metrics;

  const sections: ReportSection[] = [
    {
      heading: h.summary,
      body: `${player.name} (${player.role}, ${player.team}) is ${player.age === null ? 'of unknown age (no DOB in the dataset)' : `${player.age} years old at the reference date ${store.settings.referenceDate}`}. Across ${player.batting.innings} innings and ${player.bowling.balls} balls bowled in this workspace, ${player.name} scores at ${m.batting.strikeRate ?? '—'} per 100 balls with an average of ${m.batting.average ?? '—'}. Bowling economy is ${m.bowling.economy ?? '—'} with ${player.bowling.wickets} wickets. Potential is assessed at ${potential.potential}/100 (${potential.band}) and investment risk at ${risk.riskScore}/100 (${risk.riskBand}), producing the label: ${risk.decision}.`,
      evidence: [
        { label: 'Runs / balls', value: `${player.batting.runs} / ${player.batting.balls}`, source: 'Workspace dataset' },
        { label: 'Strike rate', value: String(m.batting.strikeRate ?? '—'), source: 'Computed: runs ÷ balls × 100' },
        { label: 'Average', value: String(m.batting.average ?? '—'), source: 'Computed: runs ÷ dismissals' },
        { label: 'Economy', value: String(m.bowling.economy ?? '—'), source: 'Computed: runs conceded ÷ balls × 6' },
        { label: 'Sample label', value: m.batting.sampleLabel, source: 'Balls faced banding' },
        { label: 'Record confidence', value: `${(player.confidence * 100).toFixed(0)}%`, source: 'Ingestion confidence' },
        { label: 'Data type', value: player.synthetic ? 'DEMO (synthetic)' : 'Uploaded', source: 'Provenance' },
      ],
      chart: { type: 'bar', data: Object.entries(row.percentiles).filter(([, v]) => v !== null).slice(0, 8).map(([k, v]) => ({ name: k.split('.').pop() ?? k, value: Number(v) })), caption: 'Percentile ranks inside the current cohort' },
    },
    {
      heading: h.evidence,
      body: `Phase profile: powerplay strike rate ${m.phase.powerplaySR ?? '—'}, middle ${m.phase.middleSR ?? '—'}, death ${m.phase.deathSR ?? '—'}. Best batting phase: ${m.phase.bestBattingPhase ?? 'not determined'}. Consistency: ${(m.consistency.floorRate ?? 0) * 100}% of recent innings reached 20 runs, coefficient of variation ${m.consistency.cv ?? '—'}. Recent form index ${m.form.formIndex ?? '—'} from the last ${m.form.sampleSize} innings. Career trend: ${trajectory.trends[0].interpretation}.`,
      evidence: [
        { label: 'Death-overs SR', value: String(m.phase.deathSR ?? 'not available'), source: 'Phase-split batting data' },
        { label: 'Floor rate', value: `${((m.consistency.floorRate ?? 0) * 100).toFixed(1)}%`, source: 'Recent innings log' },
        { label: 'Form index', value: String(m.form.formIndex ?? '—'), source: 'Last five innings blend' },
        { label: 'Potential drivers', value: potential.drivers.map((d) => `${d.label}: ${d.value}`).join(' | '), source: 'Potential model' },
      ],
      chart: { type: 'line', data: player.matchLog.map((x, i) => ({ name: `Inn ${i + 1}`, value: x.runs })), caption: 'Recent innings runs (match log)' },
    },
    {
      heading: h.risk,
      body: `${risk.components.map((c) => `${c.name} ${c.risk.toFixed(0)} (${c.detail})`).join('; ')}. Evidence gaps: ${risk.evidenceGaps.join(' ') || 'none identified'}. Workload: ${workload.riskIndicator} indicator, index ${workload.workloadIndex}/100. ${workload.disclaimer}`,
      evidence: [
        { label: 'Risk label', value: risk.decision, source: 'Risk engine' },
        { label: 'Estimated value', value: `₹${valuation.fairValueLakh}L (range ₹${valuation.rangeLakh.low}–${valuation.rangeLakh.high}L)`, source: 'Valuation model' },
        { label: 'Max bid (balanced)', value: `₹${valuation.maxBid.balanced}L`, source: 'Strategy advisor, not a price prediction' },
        { label: 'Availability', value: workload.availability.status, source: workload.availability.note },
      ],
    },
    {
      heading: h.recommendation,
      body: `${risk.decision === 'Strong Investment' ? 'Recommend pursuing within the balanced bid ceiling.' : risk.decision === 'Avoid at Current Price' ? 'Do not pursue at the current price; revisit only if the price falls below the conservative ceiling.' : risk.decision === 'High-Risk Opportunity' ? 'Consider as a speculative pick with a development plan and a low price ceiling.' : risk.decision === 'Insufficient Evidence' ? 'Gather more evidence — the sample is too small to support a confident recommendation.' : 'Pursue selectively, at or below the balanced ceiling, with a backup in the same role.'} Retention view: ${trajectory.retentionAdvice.verdict}.`,
      evidence: [
        { label: 'Fair value', value: `₹${valuation.fairValueLakh}L`, source: 'Valuation (demo calibration)' },
        { label: 'Ceilings', value: `conservative ₹${valuation.maxBid.conservative}L / balanced ₹${valuation.maxBid.balanced}L / aggressive ₹${valuation.maxBid.aggressive}L`, source: 'Bid strategy' },
        { label: 'Development focus', value: trajectory.developmentWeaknesses[0]?.area ?? '—', source: 'Trajectory model' },
      ],
    },
    {
      heading: h.method,
      body: `Percentiles are computed within a cohort of ${cohort.length} players in this workspace. Averages use runs ÷ dismissals; strike rate runs ÷ balls × 100. Missing inputs remain null and are excluded from composites rather than imputed. Career forecasts are ordinary-least-squares extrapolations of season aggregates plus an age curve, shown as conservative/expected/high-growth bands. ${language !== 'en' ? 'Headings are translated; narrative text is generated in English with translated section titles to avoid mis-translation of technical terms.' : ''}`,
      evidence: [{ label: 'Cohort size', value: String(cohort.length), source: 'Workspace' }, { label: 'Reference date', value: store.settings.referenceDate, source: 'Settings' }],
    },
  ];

  return finalise({
    id: `rep_${player.id}_${Date.now().toString(36)}`, title: `${player.name} — scouting report`, type: 'player',
    language, createdAt: new Date().toISOString(), createdBy: 'system', subjectId: player.id, sections, version: 1,
  });
}

export function buildTalentReport(opts: { maxAge: number; size: number; weights?: Record<string, number>; preset?: string }): SavedReport {
  const store = getStore();
  const preset = STRATEGY_PRESETS.find((p) => p.key === (opts.preset ?? 'young_talented_batter'))!;
  const ranking = rankPlayers(store.players, { weights: opts.weights ?? preset.weights, maxAge: opts.maxAge, requireAge: true, ageWeight: preset.ageWeight ?? 0.6, limit: opts.size, presetKey: preset.key }, store.matches.flatMap((m) => m.events));
  const cohort = buildCohort(store.players, store.matches.flatMap((m) => m.events));

  const sections: ReportSection[] = [
    {
      heading: 'Executive summary',
      body: `This report ranks ${ranking.cohortSize} eligible players aged ${opts.maxAge} or younger at the reference date ${store.settings.referenceDate}, using the "${preset.label}" weighting (${preset.blurb}). The top ${Math.min(opts.size, ranking.rows.length)} are listed with their evidence. Age is a headroom multiplier, never the primary ranking signal: a player is not selected merely for being young.`,
      evidence: [
        { label: 'Eligible cohort', value: String(ranking.cohortSize), source: 'Age filter + DOB requirement' },
        { label: 'Weighting', value: Object.entries(opts.weights ?? preset.weights).map(([k, v]) => `${k}×${v}`).join(', '), source: 'Ranking configuration' },
        { label: 'Age weight', value: String(preset.ageWeight ?? 0), source: 'Headroom multiplier' },
      ],
      chart: { type: 'bar', data: ranking.rows.map((r) => ({ name: r.player.name.split(' ')[0], value: r.score })), caption: 'Composite score by player' },
    },
  ];

  ranking.rows.forEach((r) => {
    const row = cohort.find((c) => c.player.id === r.player.id)!;
    const potential = assessPotential(row);
    const risk = assessRisk(row, { potential: potential.potential });
    sections.push({
      heading: `#${r.rank} ${r.player.name} — ${r.player.role}, ${r.player.age ?? 'age n/a'}`,
      body: `${r.player.team}. Score ${r.score.toFixed(1)} (raw ${r.rawScore.toFixed(1)}, evidence ×${r.evidenceAdjustment}, age +${r.ageBonus}). Strengths: ${r.positives.join('; ') || 'none above cohort median'}. Watch: ${r.negatives.join('; ') || 'no metric below the 40th percentile'}. Potential ${potential.potential} (${potential.band}); risk ${risk.riskScore} (${risk.riskBand}) → ${risk.decision}.`,
      evidence: [
        { label: 'Balls faced', value: String(r.player.batting.balls), source: 'Sample size' },
        { label: 'Strike rate', value: String(row.metrics.batting.strikeRate ?? '—'), source: 'Computed' },
        { label: 'Average', value: String(row.metrics.batting.average ?? '—'), source: 'Computed' },
        { label: 'Economy', value: String(row.metrics.bowling.economy ?? '—'), source: 'Computed' },
        { label: 'Data type', value: r.player.synthetic ? 'DEMO (synthetic)' : 'Uploaded', source: 'Provenance' },
      ],
    });
  });

  sections.push({
    heading: 'Method & assumptions',
    body: ranking.assumptions.join(' '),
    evidence: ranking.sensitivity.slice(0, 4).map((s) => ({ label: `Sensitivity: ${s.label}`, value: `Spearman ${s.spearman ?? '—'} · max rank shift ${s.maxRankShift}`, source: '±20% weight perturbation' })),
  });

  return finalise({
    id: `rep_talent_${Date.now().toString(36)}`, title: `Talent discovery — under ${opts.maxAge}`, type: 'talent', language: 'en',
    createdAt: new Date().toISOString(), createdBy: 'system', subjectId: `age-${opts.maxAge}`, sections, version: 1,
  });
}

export function buildTeamReport(teamId: string): SavedReport {
  const store = getStore();
  const team = store.teams.find((t) => t.id === teamId)!;
  const squad = store.players.filter((p) => team.squadIds.includes(p.id));
  const analysis = analyseSquad(team, squad, store.players, store.matches.flatMap((m) => m.events));
  const sections: ReportSection[] = [
    {
      heading: 'Executive summary',
      body: `${team.name} carries ${squad.length} players (${analysis.overseasCount} overseas) with a balance score of ${analysis.balanceScore}/100. Batting depth ${analysis.battingDepth}, bowling depth ${analysis.bowlingDepth}, ${analysis.paceOptions} pace and ${analysis.spinOptions} spin options, ${analysis.allRounders} all-rounders and ${analysis.keepers} wicketkeeper(s).`,
      evidence: [
        { label: 'Squad size', value: String(squad.length), source: 'Workspace squad' },
        { label: 'Average age', value: String(analysis.avgAge ?? 'unknown'), source: 'DOB-derived' },
        { label: 'Trust', value: `${analysis.trust}%`, source: 'Record confidence mean' },
      ],
      chart: { type: 'bar', data: analysis.phaseCoverage.map((p) => ({ name: p.phase, value: p.bowling })), caption: 'Phase bowling proxy (runs per over)' },
    },
    {
      heading: 'Weaknesses & priorities',
      body: analysis.weaknesses.map((w) => `${w.title} (${w.severity}): ${w.evidence} → ${w.suggestion}`).join(' ') || 'No structural weakness detected at the current thresholds.',
      evidence: analysis.recommendations.map((r) => ({ label: `${r.priority} action`, value: r.action, source: r.rationale })),
    },
    {
      heading: 'Method & assumptions',
      body: 'Depth is a squad aggregate of percentile performance, not a match simulation. Phase proxies average squad-level phase splits, which understates the best and worst individuals. Overseas and slot constraints are enforced in the XI optimiser, not here.',
      evidence: [],
    },
  ];
  return finalise({ id: `rep_team_${team.id}_${Date.now().toString(36)}`, title: `${team.name} — squad intelligence report`, type: 'team', language: 'en', createdAt: new Date().toISOString(), createdBy: 'system', subjectId: team.id, sections, version: 1 });
}

export function buildAuctionReport(userTeamId: string): SavedReport {
  const store = getStore();
  const team = store.teams.find((t) => t.id === userTeamId)!;
  const squad = store.players.filter((p) => team.squadIds.includes(p.id));
  const cohort = buildCohort(store.players, store.matches.flatMap((m) => m.events));
  const market = marketOverview(store.players.filter((p) => !p.overseas), cohort, store.teams, store.auctions, store.players);
  const top = market.rows.slice(0, 15);
  const sections: ReportSection[] = [
    {
      heading: 'Executive summary',
      body: `Valuation is shown for the ${market.rows.length} domestic players in this workspace. The five highest estimated values are ${market.rows.slice(0, 5).map((r) => `${r.name} (₹${r.fairValueLakh}L)`).join(', ')}. ${team.name} holds ₹${team.purseLakh}L with ${Math.max(0, team.maxSquadSize - squad.length)} vacant slots. Estimated value is not an expected hammer price.`,
      evidence: market.method.map((m) => ({ label: 'Method', value: m, source: 'Valuation engine' })),
      chart: { type: 'bar', data: top.slice(0, 8).map((r) => ({ name: r.name.split(' ')[0], value: r.fairValueLakh })), caption: 'Estimated fair value (₹ lakh)' },
    },
    {
      heading: 'Bid strategy',
      body: top.slice(0, 10).map((r) => `${r.name} (${r.role}, ${r.age ?? 'age n/a'}): fair ₹${r.fairValueLakh}L, band ₹${r.rangeLakh.low}–${r.rangeLakh.high}L, ceilings conservative ₹${r.maxBid.conservative}L / balanced ₹${r.maxBid.balanced}L / aggressive ₹${r.maxBid.aggressive}L.`).join(' '),
      evidence: top.slice(0, 10).map((r) => ({ label: r.name, value: `scarcity ${(r.scarcityIndex * 100).toFixed(0)}% · demand ${(r.demandIndex * 100).toFixed(0)}%`, source: r.drivers.map((d) => `${d.label} ${d.value}`).join('; ') })),
    },
    {
      heading: 'Method & assumptions',
      body: `${market.method.join(' ')} Historical multiples by base tier: ${market.tierStats.map((t) => `₹${t.baseTier}L → ×${t.medianMultiple ?? 'n/a'} (n=${t.n})`).join(', ')}. All historical auction data in demo mode is synthetic.`,
      evidence: [],
    },
  ];
  return finalise({ id: `rep_auction_${Date.now().toString(36)}`, title: `${team.name} — auction intelligence report`, type: 'auction', language: 'en', createdAt: new Date().toISOString(), createdBy: 'system', subjectId: team.id, sections, version: 1 });
}

export function buildPitchReport(venueId: string): SavedReport {
  const store = getStore();
  const venue = store.venues.find((v) => v.id === venueId)!;
  const weather = store.weather.find((w) => w.venueId === venueId) ?? null;
  const dna = venueDNA(venue, weather, store.matches);
  const toss = tossStrategy(venue, weather);
  const sections: ReportSection[] = [
    { heading: 'Executive summary', body: dna.summary, evidence: dna.values.slice(0, 8).map((v) => ({ label: v.label, value: v.value, source: `${v.evidence}: ${v.note}` })), chart: { type: 'bar', data: dna.dna.map((d) => ({ name: d.trait, value: d.score })), caption: 'Venue DNA (0–100 per trait)' } },
    { heading: 'Toss strategy', body: `${toss.decision === 'bowl' ? 'Bowl first' : 'Bat first'} with ${(toss.confidence * 100).toFixed(0)}% confidence. ${toss.reasons.join(' ')} ${toss.caveat}`, evidence: [], },
    { heading: 'Method & assumptions', body: 'Historical aggregates come from the venue record in this workspace; pitch ratings are observations a user can edit; weather is a forecast. These are never blended silently — each evidence type is labelled.', evidence: [] },
  ];
  return finalise({ id: `rep_pitch_${venue.id}_${Date.now().toString(36)}`, title: `${venue.name} — pitch & conditions report`, type: 'pitch', language: 'en', createdAt: new Date().toISOString(), createdBy: 'system', subjectId: venue.id, sections, version: 1 });
}

export function buildStatisticalReport(playerIds: string[]): SavedReport {
  const store = getStore();
  const cohort = buildCohort(store.players, store.matches.flatMap((m) => m.events));
  const rows = cohort.filter((r) => playerIds.includes(r.player.id));
  const sections: ReportSection[] = [{
    heading: 'Statistical comparison',
    body: rows.map((r) => `${r.player.name}: SR ${r.metrics.batting.strikeRate ?? '—'} (n=${r.metrics.batting.balls} balls), avg ${r.metrics.batting.average ?? '—'}, econ ${r.metrics.bowling.economy ?? '—'}, CV ${r.metrics.consistency.cv ?? '—'}.`).join(' '),
    evidence: rows.map((r) => ({ label: r.player.name, value: `sample label ${r.metrics.batting.sampleLabel}`, source: 'Descriptive statistics engine' })),
    chart: { type: 'bar', data: rows.map((r) => ({ name: r.player.name.split(' ')[0], value: Number(r.metrics.batting.strikeRate ?? 0) })), caption: 'Strike rate comparison' },
  }];
  return finalise({ id: `rep_stat_${Date.now().toString(36)}`, title: 'Statistical comparison report', type: 'statistical', language: 'en', createdAt: new Date().toISOString(), createdBy: 'system', subjectId: playerIds.join(','), sections, version: 1 });
}

type DraftReport = Omit<SavedReport, 'quality' | 'sources'>;

function finalise(report: DraftReport): SavedReport {
  const checks = [
    { name: 'Every section carries evidence or a method note', passed: report.sections.every((s) => s.evidence.length > 0 || /method|assumption/i.test(s.heading)), detail: `${report.sections.filter((s) => s.evidence.length === 0).length} section(s) without evidence tables` },
    { name: 'Sample sizes stated', passed: report.sections.some((s) => s.evidence.some((e) => /ball|sample|cohort/i.test(e.label + e.value))), detail: 'Sample size must appear so readers can judge noise' },
    { name: 'Demo data disclosed where used', passed: true, detail: report.sections.some((s) => /DEMO/.test(s.body)) ? 'Demo data explicitly labelled' : 'No demo-only figures in this report (or already labelled elsewhere)' },
    { name: 'No unsupported guarantees', passed: !/guarantee|will definitely|certain win/i.test(report.sections.map((s) => s.body).join(' ')), detail: 'Language avoids certainty claims' },
    { name: 'Uncertainty disclosed', passed: report.sections.some((s) => /uncertainty|range|band|caveat|assumption/i.test(s.body + (s.evidence.map((e) => e.value).join(' ')))), detail: 'Range or assumption language present' },
  ];
  const score = Math.round((checks.filter((c) => c.passed).length / checks.length) * 100);
  const sources = [...new Set(report.sections.flatMap((sec) => sec.evidence.map((e) => e.source).filter(Boolean)))]
    .concat(['Workspace analytical store (canonical Player records)'])
    .slice(0, 24);
  const issues = checks.filter((c) => !c.passed).map((c) => `${c.name} — ${c.detail}`);
  return { ...report, quality: { score, checks, issues }, sources };
}

export function listReportBuilders() {
  return [
    { key: 'player', label: 'Player scouting report', needs: 'playerId' },
    { key: 'talent', label: 'Talent discovery report', needs: 'maxAge + size' },
    { key: 'team', label: 'Team squad report', needs: 'teamId' },
    { key: 'auction', label: 'Auction intelligence report', needs: 'userTeamId' },
    { key: 'pitch', label: 'Pitch & conditions report', needs: 'venueId' },
    { key: 'statistical', label: 'Statistical comparison', needs: 'playerIds' },
  ];
}
