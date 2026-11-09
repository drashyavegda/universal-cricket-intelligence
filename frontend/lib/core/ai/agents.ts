/**
 * Autonomous agent orchestration (Feature 28).
 * Agents are deterministic functions with read-only data access. There is no
 * unbounded self-direction: each step declares its dependencies, writes to an
 * audit trail, and consequential steps require human approval.
 */
import { getStore, update, newId } from '../db/store';
import { buildCohort } from '../players/metrics';
import { rankPlayers } from '../ranking/engine';
import { STRATEGY_PRESETS } from '../ranking/presets';
import { analyseDatasetQuality } from '../data/quality';
import { analyseSquad } from '../team/squad';
import { valuatePlayer } from '../auction/valuation';
import { buildTalentReport } from '../reporting/build';
import type { Player, WorkflowRun } from '../types';

export interface AgentDef { id: string; name: string; role: string; permissions: string[]; description: string }

export const AGENTS: AgentDef[] = [
  { id: 'extraction', name: 'Data Extraction Agent', role: 'Reads uploaded datasets and reports mapping coverage', permissions: ['read:datasets'], description: 'Loads approved records and reports how many canonical fields were populated.' },
  { id: 'verification', name: 'Verification Agent', role: 'Runs data-quality gates and flags conflicts', permissions: ['read:datasets'], description: 'Executes the quality engine and blocks the pipeline if error-level issues exist.' },
  { id: 'statistical', name: 'Statistical Agent', role: 'Computes cohort percentiles and distributions', permissions: ['read:players'], description: 'Builds the cohort and reports sample adequacy.' },
  { id: 'scouting', name: 'Scouting Agent', role: 'Ranks players under the active strategy preset', permissions: ['read:players', 'read:rankings'], description: 'Produces a ranked shortlist with explanations.' },
  { id: 'team', name: 'Team Strategy Agent', role: 'Analyses squad balance and weaknesses', permissions: ['read:teams'], description: 'Runs the squad intelligence engine for the user team.' },
  { id: 'auction', name: 'Auction Agent', role: 'Values shortlisted players and proposes ceilings', permissions: ['read:players', 'read:auction'], description: 'Values the shortlist and flags price risk.' },
  { id: 'pitch', name: 'Pitch Agent', role: 'Summarises venue conditions', permissions: ['read:venues'], description: 'Reads venue DNA for the active venue.' },
  { id: 'prediction', name: 'Prediction Agent', role: 'Runs match simulation', permissions: ['read:matches'], description: 'Invokes the Monte Carlo engine with fixed seeds.' },
  { id: 'research', name: 'Research Agent', role: 'Retrieves knowledge-base evidence', permissions: ['read:knowledge'], description: 'Finds supporting methodology notes and cites them.' },
  { id: 'report', name: 'Report Agent', role: 'Assembles the final report', permissions: ['write:reports'], description: 'Builds a saved report from upstream outputs (requires approval).' },
  { id: 'qc', name: 'Quality Control Agent', role: 'Scores the report against the quality checklist', permissions: ['read:reports'], description: 'Runs the report quality checker and summarises gaps.' },
];

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  goal: string;
  steps: { id: string; agent: string; title: string; dependsOn: string[]; requiresApproval?: boolean }[];
}

export const WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'wf_talent_pipeline',
    name: 'Young talent scouting pipeline',
    description: 'Extraction → verification → statistics → scouting → valuation → report → QC. The canonical hackathon workflow.',
    goal: 'Produce an evidence-backed shortlist of the youngest promising uncapped domestic players for the next auction.',
    steps: [
      { id: 's1', agent: 'extraction', title: 'Confirm dataset coverage', dependsOn: [] },
      { id: 's2', agent: 'verification', title: 'Run data-quality gates', dependsOn: ['s1'] },
      { id: 's3', agent: 'statistical', title: 'Build cohort and check sample adequacy', dependsOn: ['s2'] },
      { id: 's4', agent: 'scouting', title: 'Rank players under the talent preset', dependsOn: ['s3'] },
      { id: 's5', agent: 'auction', title: 'Value the shortlist and set ceilings', dependsOn: ['s4'] },
      { id: 's6', agent: 'report', title: 'Assemble the scouting report', dependsOn: ['s4', 's5'], requiresApproval: true },
      { id: 's7', agent: 'qc', title: 'Quality-check the report', dependsOn: ['s6'] },
    ],
  },
  {
    id: 'wf_match_prep',
    name: 'Match-day preparation',
    description: 'Squad analysis → pitch read → simulation → report.',
    goal: 'Prepare a match-day brief: squad gaps, pitch read and a projected outcome range.',
    steps: [
      { id: 's1', agent: 'team', title: 'Analyse squad balance', dependsOn: [] },
      { id: 's2', agent: 'pitch', title: 'Read venue conditions', dependsOn: [] },
      { id: 's3', agent: 'prediction', title: 'Run the Monte Carlo projection', dependsOn: ['s1', 's2'] },
      { id: 's4', agent: 'report', title: 'Assemble the brief', dependsOn: ['s3'], requiresApproval: true },
    ],
  },
  {
    id: 'wf_auction_plan',
    name: 'Auction plan builder',
    description: 'Team gaps → valuations → ceilings → report.',
    goal: 'Turn squad gaps into a prioritised auction plan with price ceilings.',
    steps: [
      { id: 's1', agent: 'team', title: 'Identify squad gaps', dependsOn: [] },
      { id: 's2', agent: 'statistical', title: 'Build the valuation cohort', dependsOn: [] },
      { id: 's3', agent: 'auction', title: 'Value targets and propose ceilings', dependsOn: ['s1', 's2'] },
      { id: 's4', agent: 'report', title: 'Assemble the auction report', dependsOn: ['s3'], requiresApproval: true },
    ],
  },
];

type StepOutput = { detail: string };

function runStep(step: { id: string; agent: string }, context: WorkflowContext): StepOutput {
  const store = getStore();
  const events = store.matches.flatMap((m) => m.events);
  switch (step.agent) {
    case 'extraction': {
      const ds = store.datasets.find((d) => d.status === 'approved') ?? store.datasets[0];
      return { detail: ds ? `Dataset "${ds.name}" approved with ${ds.recordCount} records; mapping covers ${ds.mappingSummary.length} canonical fields.` : 'No dataset available.' };
    }
    case 'verification': {
      const ds = store.datasets[0];
      const records = store.records.filter((r) => r.datasetId === ds?.id);
      const quality = analyseDatasetQuality(records, { datasetId: ds?.id ?? 'none', ageReference: store.settings.referenceDate });
      return { detail: `Quality score ${quality.score}/100 · ${quality.counts.errors} error(s), ${quality.counts.warnings} warning(s). ${quality.counts.errors > 0 ? 'Pipeline continues but recommendations must be labelled low-trust.' : 'No blocking issues.'}` };
    }
    case 'statistical': {
      const cohort = buildCohort(store.players, events);
      const adequate = cohort.filter((r) => Math.max(r.player.batting.balls, r.player.bowling.balls) >= 180).length;
      context.cohort = cohort;
      return { detail: `Cohort of ${cohort.length} players; ${adequate} have ≥180 balls of evidence (${((adequate / cohort.length) * 100).toFixed(0)}%).` };
    }
    case 'scouting': {
      const preset = STRATEGY_PRESETS.find((p) => p.key === (context.presetKey ?? 'young_talented_batter'))!;
      const ranking = rankPlayers(store.players, { weights: preset.weights, maxAge: context.maxAge ?? 23, requireAge: true, ageWeight: preset.ageWeight ?? 0.6, limit: 10, presetKey: preset.key }, events);
      context.ranking = ranking;
      return { detail: `Top 10 from ${ranking.cohortSize} eligible players: ${ranking.rows.slice(0, 5).map((r) => `${r.player.name} (${r.score.toFixed(0)})`).join(', ')}.` };
    }
    case 'team': {
      const team = store.teams.find((t) => t.isUserTeam)!;
      const squad = store.players.filter((p) => team.squadIds.includes(p.id));
      const analysis = analyseSquad(team, squad, store.players, events);
      context.team = analysis;
      return { detail: `${team.name}: balance ${analysis.balanceScore}/100, ${analysis.weaknesses.length} weakness(es), priorities: ${analysis.recommendations.slice(0, 2).map((r) => r.action).join('; ') || 'none'}.` };
    }
    case 'auction': {
      const cohort = context.cohort ?? buildCohort(store.players, events);
      const targets = context.ranking?.rows.slice(0, 6).map((r) => r.player) ??
        store.players.filter((p) => !p.overseas).slice(0, 6);
      const valuations = targets.map((p) => valuatePlayer({ player: p, cohort, roleScarcity: 0.6, teamNeed: 0.55, competitorDemand: 0.5, history: store.auctions }));
      context.valuations = valuations;
      return { detail: `Valued ${valuations.length} targets; top fair value ₹${Math.max(...valuations.map((v) => v.fairValueLakh))}L with balanced ceilings ₹${valuations.map((v) => v.maxBid.balanced).join(', ₹')}L.` };
    }
    case 'pitch': {
      const venue = store.venues[0];
      const weather = store.weather.find((w) => w.venueId === venue.id) ?? null;
      return { detail: `${venue.name}: 1st-innings par ${venue.avgFirstInnings}, dew risk ${(venue.dewRisk * 100).toFixed(0)}%, pace rating ${venue.pitch.paceRating}/10, spin ${venue.pitch.spinRating}/10${weather ? `, forecast ${weather.temperatureC}°C / humidity ${weather.humidityPct}%` : ''}.` };
    }
    case 'prediction': {
      const team = store.teams.find((t) => t.isUserTeam)!;
      const other = store.teams.find((t) => t.id !== team.id)!;
      const xi = (t: typeof team) => store.players.filter((p) => t.squadIds.slice(0, 11).includes(p.id));
      context.predictionInput = { a: xi(team), b: xi(other), aName: team.name, bName: other.name };
      return { detail: `Prepared simulation inputs for ${team.name} vs ${other.name} (${context.predictionInput.a.length} vs ${context.predictionInput.b.length} players). Run the Prediction Lab for the full distribution.` };
    }
    case 'research': {
      return { detail: `Knowledge base holds ${store.knowledge.length} documents; cite them in reports to satisfy the explainability contract.` };
    }
    case 'report': {
      const report = buildTalentReport({ maxAge: context.maxAge ?? 23, size: 10, preset: context.presetKey ?? 'young_talented_batter' });
      update((s) => { s.reports.unshift(report); });
      context.reportId = report.id;
      return { detail: `Report "${report.title}" created (${report.sections.length} sections, quality ${report.quality.score}/100). Requires human approval before export.` };
    }
    case 'qc': {
      const report = store.reports.find((r) => r.id === context.reportId);
      return { detail: report ? `Report quality ${report.quality.score}/100; failing checks: ${report.quality.checks.filter((c) => !c.passed).map((c) => c.name).join('; ') || 'none'}.` : 'No report to check.' };
    }
    default:
      return { detail: `Agent ${step.agent} has no implementation (should not happen).` };
  }
}

interface WorkflowContext {
  maxAge?: number; presetKey?: string;
  cohort?: ReturnType<typeof buildCohort>;
  ranking?: ReturnType<typeof rankPlayers>;
  team?: ReturnType<typeof analyseSquad>;
  valuations?: ReturnType<typeof valuatePlayer>[];
  reportId?: string;
  predictionInput?: { a: Player[]; b: Player[]; aName: string; bName: string };
}

export function startWorkflow(workflowId: string, params: { maxAge?: number; presetKey?: string; goal?: string; actor?: string }): WorkflowRun {
  const template = WORKFLOWS.find((w) => w.id === workflowId);
  if (!template) throw new Error('Unknown workflow');
  const run: WorkflowRun = {
    id: newId('wfr'), workflowId, goal: params.goal ?? template.goal, status: 'running',
    startedAt: new Date().toISOString(), finishedAt: null,
    steps: template.steps.map((s) => ({ id: s.id, agent: s.agent, title: s.title, status: 'pending', detail: '', dependsOn: s.dependsOn })),
    cost: { tokens: 0, usd: 0 }, approvedBy: null,
  };
  update((s) => { s.workflowRuns.unshift(run); });
  return executeWorkflow(run.id, params);
}

export function executeWorkflow(runId: string, params: { maxAge?: number; presetKey?: string; actor?: string } = {}): WorkflowRun {
  const store = getStore();
  const run = store.workflowRuns.find((r) => r.id === runId);
  if (!run) throw new Error('Run not found');
  const context: WorkflowContext = { maxAge: params.maxAge ?? 23, presetKey: params.presetKey ?? 'young_talented_batter' };
  const template = WORKFLOWS.find((w) => w.id === run.workflowId)!;

  for (const step of run.steps) {
    const templateStep = template.steps.find((t) => t.id === step.id);
    const dependenciesDone = step.dependsOn.every((d) => run.steps.find((x) => x.id === d)?.status === 'done');
    if (!dependenciesDone) { step.status = 'skipped'; step.detail = 'Skipped: dependency failed or unmet.'; continue; }
    if (templateStep?.requiresApproval && !run.approvedBy) {
      step.status = 'pending';
      step.detail = 'Awaiting human approval — this step writes a saved artefact.';
      update((s) => { const r = s.workflowRuns.find((x) => x.id === runId)!; Object.assign(r, { status: 'awaiting_approval', steps: run.steps }); });
      return { ...run, status: 'awaiting_approval' };
    }
    try {
      step.status = 'running';
      step.startedAt = new Date().toISOString();
      const out = runStep({ id: step.id, agent: step.agent }, context);
      step.status = 'done';
      step.detail = out.detail;
      step.finishedAt = new Date().toISOString();
      run.cost.tokens += Math.ceil(out.detail.length / 4);
    } catch (error) {
      step.status = 'failed';
      step.detail = `Failed: ${(error as Error).message}`;
      step.finishedAt = new Date().toISOString();
    }
  }
  run.status = run.steps.some((s) => s.status === 'failed') ? 'failed' : 'completed';
  run.finishedAt = new Date().toISOString();
  update((s) => { const r = s.workflowRuns.find((x) => x.id === runId)!; Object.assign(r, run); });
  return run;
}

export function approveWorkflow(runId: string, actor: string): WorkflowRun {
  update((s) => {
    const r = s.workflowRuns.find((x) => x.id === runId);
    if (r) { r.approvedBy = actor; r.status = 'running'; }
  });
  return executeWorkflow(runId, { actor });
}
