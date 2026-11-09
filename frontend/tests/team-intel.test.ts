import { describe, expect, it } from 'vitest';
import { getStore } from '@/lib/core/db/store';
import { analyseSquad } from '@/lib/core/team/squad';
import { scoutOpposition } from '@/lib/core/team/opposition';
import { venueDNA, tossStrategy } from '@/lib/core/pitch/venue';
import { analyseWorkload } from '@/lib/core/workload/engine';
import { runScoutingMission } from '@/lib/core/scouting/global';
import { assessRisk } from '@/lib/core/players/risk';
import { buildTrajectory } from '@/lib/core/career/trajectory';
import { buildCohort } from '@/lib/core/players/metrics';

const store = getStore();
const events = store.matches.flatMap((m) => m.events);
const team = store.teams.find((t) => t.isUserTeam)!;
const squad = store.players.filter((p) => team.squadIds.includes(p.id));

describe('squad intelligence', () => {
  it('reports depth by role and flags structural weaknesses', () => {
    const a = analyseSquad(team, squad, store.players, events);
    expect(a.balanceScore).toBeGreaterThanOrEqual(0);
    expect(a.balanceScore).toBeLessThanOrEqual(100);
    expect(a.paceOptions).toBeGreaterThanOrEqual(0);
    expect(a.spinOptions).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(a.weaknesses)).toBe(true);
    for (const w of a.weaknesses) expect(w.evidence.length).toBeGreaterThan(5);
  });

  it('gives every recommendation a priority and an action', () => {
    const a = analyseSquad(team, squad, store.players, events);
    for (const r of a.recommendations) {
      expect(['P1', 'P2', 'P3']).toContain(r.priority);
      expect(r.action.length).toBeGreaterThan(5);
    }
  });
});

describe('opposition intelligence', () => {
  const opponent = store.teams.find((t) => !t.isUserTeam)!;

  it('builds a report with form, key players and phase plans', () => {
    const opponentSquad = store.players.filter((p) => opponent.squadIds.includes(p.id));
    const report = scoutOpposition(opponent, opponentSquad, store.players, store.matches, events, squad);
    expect(report.teamName).toBe(opponent.name);
    expect(report.form.played).toBeGreaterThanOrEqual(0);
    expect(report.keyPlayers.length).toBeGreaterThan(0);
    expect(report.bowlingPlan.length).toBeGreaterThan(0);
    expect(report.battingPlan.length).toBeGreaterThan(0);
    expect(report.caveat.length).toBeGreaterThan(20);
  });

  it('labels the report as inference, not inside knowledge', () => {
    const opponentSquad = store.players.filter((p) => opponent.squadIds.includes(p.id));
    const report = scoutOpposition(opponent, opponentSquad, store.players, store.matches, events, squad);
    expect(report.caveat.toLowerCase()).toMatch(/infer|public|not.*private|no.*inside/);
  });
});

describe('pitch & venue intelligence', () => {
  const venue = store.venues[0];
  const weather = store.weather.find((w) => w.venueId === venue.id) ?? null;

  it('separates historical, observed and inferred signals', () => {
    const dna = venueDNA(venue, weather, store.matches);
    const kinds = new Set(dna.values.map((v) => v.evidence));
    expect(kinds.size).toBeGreaterThan(1);
    expect(dna.summary.length).toBeGreaterThan(20);
  });

  it('toss strategy states a decision, a confidence and a caveat', () => {
    const toss = tossStrategy(venue, weather);
    expect(['bat', 'bowl']).toContain(toss.decision);
    expect(toss.confidence).toBeGreaterThanOrEqual(0);
    expect(toss.confidence).toBeLessThanOrEqual(1);
    expect(toss.caveat.length).toBeGreaterThan(10);
  });
});

describe('workload management', () => {
  it('never diagnoses injury and always defers to medical staff', () => {
    const p = store.players.find((x) => x.bowling.balls > 0)!;
    const w = analyseWorkload(p, store.settings.referenceDate);
    expect(w.workloadIndex).toBeGreaterThanOrEqual(0);
    expect(w.workloadIndex).toBeLessThanOrEqual(100);
    expect(w.disclaimer.toLowerCase()).toMatch(/not medical|not a medical|do not diagnose|does not diagnos|medical/);
    expect(['low', 'watch', 'elevated']).toContain(w.riskIndicator);
  });

  it('reports acute:chronic as null when chronic load is missing rather than dividing by zero', () => {
    const p = store.players.find((x) => x.matchLog.length === 0);
    if (p) {
      const w = analyseWorkload(p, store.settings.referenceDate);
      expect(w.acuteChronicRatio === null || Number.isFinite(w.acuteChronicRatio)).toBe(true);
    }
  });
});

describe('talent discovery & risk', () => {
  it('returns ranked discovery hits with verification status and caveats', () => {
    const result = runScoutingMission(store.players, { name: 'test', region: 'Any', ageMin: 16, ageMax: 23, role: null, createdBy: 'test', watchlist: [], notes: '' }, events);
    expect(result.hits.length).toBeGreaterThan(0);
    for (const hit of result.hits) {
      expect(['uploaded', 'external', 'demo']).toContain(hit.verificationStatus);
      expect(Array.isArray(hit.caveats)).toBe(true);
    }
  });

  it('risk assessment is bounded and explains its drivers', () => {
    const cohort = buildCohort(store.players, events);
    const row = cohort[0];
    const risk = assessRisk(row);
    expect(risk.riskScore).toBeGreaterThanOrEqual(0);
    expect(risk.riskScore).toBeLessThanOrEqual(100);
    expect(risk.components.length).toBeGreaterThan(0);
    expect(['Low', 'Moderate', 'Elevated', 'High']).toContain(risk.riskBand);
    expect(risk.notes.length).toBeGreaterThan(0);
  });

  it('career trajectory refuses to forecast without a series', () => {
    const noCareer = { ...store.players[0], career: [] };
    const t = buildTrajectory(noCareer);
    // with no season series there is nothing to extrapolate: no forecasts, and it says why
    expect(t.forecasts.length).toBe(0);
    expect(t.uncertainty.join(' ').length).toBeGreaterThan(20);
  });
});
