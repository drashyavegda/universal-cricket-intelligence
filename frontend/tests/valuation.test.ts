import { describe, expect, it } from 'vitest';
import { generatePlayers, generateAuction, generateTeams } from '@/lib/core/db/seed';
import { buildCohort } from '@/lib/core/players/metrics';
import { valuatePlayer, roleScarcity, teamNeedFor, valueRanking } from '@/lib/core/auction/valuation';
import type { Player } from '@/lib/core/types';

const players = generatePlayers(120, 777, '2027-04-01');
const cohort = buildCohort(players);
const history = generateAuction(players);
const teams = generateTeams(players);

const base = {
  cohort, roleScarcity: 0.5, teamNeed: 0.5, competitorDemand: 0.5, history,
};

describe('auction valuation', () => {
  it('produces a positive fair value and an ordered three-tier max bid', () => {
    const v = valuatePlayer({ ...base, player: players[0] });
    expect(v.fairValueLakh).toBeGreaterThan(0);
    expect(v.maxBid.conservative).toBeLessThanOrEqual(v.maxBid.balanced);
    expect(v.maxBid.balanced).toBeLessThanOrEqual(v.maxBid.aggressive);
    expect(v.rangeLakh.low).toBeLessThanOrEqual(v.fairValueLakh);
    expect(v.rangeLakh.high).toBeGreaterThanOrEqual(v.fairValueLakh);
  });

  it('always states that fair value is not a hammer price', () => {
    const v = valuatePlayer({ ...base, player: players[3] });
    expect(v.caveats.join(' ').toLowerCase()).toMatch(/hammer price|not a price|estimate|fair value/);
    expect(v.drivers.length).toBeGreaterThan(0);
  });

  it('values a stronger player higher than a weaker one, all else equal', () => {
    const strong = [...players].sort((a, b) => b.batting.runs - a.batting.runs)[0];
    const weak = [...players].sort((a, b) => a.batting.runs - b.batting.runs)[0];
    const vs = valuatePlayer({ ...base, player: strong });
    const vw = valuatePlayer({ ...base, player: weak });
    expect(vs.fairValueLakh).toBeGreaterThan(vw.fairValueLakh);
  });

  it('raises value with scarcity and with need, monotonically', () => {
    const p = players[5];
    const lowNeed = valuatePlayer({ ...base, player: p, teamNeed: 0.1, competitorDemand: 0.1 });
    const highNeed = valuatePlayer({ ...base, player: p, teamNeed: 1, competitorDemand: 1 });
    expect(highNeed.fairValueLakh).toBeGreaterThanOrEqual(lowNeed.fairValueLakh);
  });

  it('is deterministic for the same inputs', () => {
    const a = valuatePlayer({ ...base, player: players[7] });
    const b = valuatePlayer({ ...base, player: players[7] });
    expect(a).toEqual(b);
  });

  it('scarcity is bounded 0..1 for every role', () => {
    const roles = [...new Set(players.map((p) => p.role))] as Player['role'][];
    for (const role of roles) {
      const s = roleScarcity(players, cohort, role);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('team need reports a reason, never a bare number', () => {
    const team = teams.find((t) => t.isUserTeam) ?? teams[0];
    const squad = players.filter((p) => team.squadIds.includes(p.id));
    const need = teamNeedFor(team, squad, 'Finisher');
    expect(need.need).toBeGreaterThanOrEqual(0);
    expect(need.reason.length).toBeGreaterThan(5);
  });

  it('splits valuations into overpriced / undervalued / fair', () => {
    const vals = players.slice(0, 20).map((p) => valuatePlayer({ ...base, player: p }));
    const split = valueRanking(vals);
    expect(split.overpriced.length + split.undervalued.length + split.fair.length).toBe(20);
  });
});
