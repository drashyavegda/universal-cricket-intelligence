/** Global talent scouting network (Feature 25) with explicit source separation. */
import type { MatchEvent, Player } from '../types';
import { buildCohort } from '../players/metrics';
import { assessPotential } from '../players/potential';

export interface ScoutMission {
  id: string; name: string; region: string; ageMax: number; ageMin: number; role: string | null;
  createdAt: string; createdBy: string; watchlist: string[]; notes: string;
}

export interface DiscoveryHit {
  playerId: string; name: string; age: number | null; role: string; region: string; level: 'domestic' | 'overseas' | 'age-group' | 'unknown';
  discoveryScore: number; why: string[]; verificationStatus: 'uploaded' | 'external' | 'demo' | 'unverified';
  sampleBalls: number; potential: number; caveats: string[];
}

export function runScoutingMission(
  players: Player[], mission: Omit<ScoutMission, 'id' | 'createdAt'>, events?: MatchEvent[],
): { hits: DiscoveryHit[]; coverage: { total: number; eligible: number; byRegion: { region: string; count: number }[] }; notes: string[] } {
  const cohort = buildCohort(players, events);
  const eligible = players.filter((p) =>
    p.age !== null && p.age >= mission.ageMin && p.age <= mission.ageMax &&
    (mission.role ? p.role === mission.role : true) &&
    (mission.region === 'Any' ? true : p.team === mission.region || p.state === mission.region),
  );
  const hits = eligible.map((p) => {
    const row = cohort.find((r) => r.player.id === p.id)!;
    const potential = assessPotential(row);
    const perfKeys = ['batting.strikeRate', 'batting.average', 'bowling.economy', 'bowling.strikeRate', 'consistency.floorRate'];
    const perf = perfKeys.map((k) => row.percentiles[k]).filter((v): v is number => v !== null);
    const perfAvg = perf.length ? perf.reduce((a, b) => a + b, 0) / perf.length : 40;
    const sample = Math.max(p.batting.balls, p.bowling.balls);
    const underTheRadar = sample < 300 ? 12 : 0;
    const discoveryScore = Number((perfAvg * 0.5 + potential.potential * 0.38 + underTheRadar).toFixed(1));
    return {
      playerId: p.id, name: p.name, age: p.age, role: p.role, region: p.team,
      level: (p.overseas ? 'overseas' : p.capped ? 'domestic' : p.age !== null && p.age < 20 ? 'age-group' : 'domestic') as DiscoveryHit['level'],
      discoveryScore,
      why: [
        `Performance percentile blend ${perfAvg.toFixed(0)}/100 in cohort`,
        `Potential ${potential.potential} (${potential.band})`,
        sample < 300 ? `Only ${sample} balls of evidence — genuine hidden-gem profile, but verify` : `Established sample of ${sample} balls`,
        p.age !== null && p.age <= 20 ? 'Age-group window still open' : 'Senior exposure already secured',
      ],
      verificationStatus: p.synthetic ? 'demo' as const : p.sources.some((s) => s.kind === 'uploaded') ? 'uploaded' as const : 'external' as const,
      sampleBalls: sample, potential: potential.potential,
      caveats: [
        p.synthetic ? 'DEMO record — synthetic, not a real cricketer.' : 'Verify identity against an official source before shortlisting.',
        'Discovery score weights performance more than potential; adjust weights for a pure projection search.',
      ],
    };
  }).sort((a, b) => b.discoveryScore - a.discoveryScore);

  return {
    hits,
    coverage: {
      total: players.length,
      eligible: eligible.length,
      byRegion: [...new Set(players.map((p) => p.team))].map((region) => ({ region, count: players.filter((p) => p.team === region).length })).sort((a, b) => b.count - a.count),
    },
    notes: [
      'Global coverage in demo mode is synthetic. Connect a licensed feed or upload regional datasets to extend it.',
      'Players flagged demo/unverified are excluded from recommendation exports unless a human approves them.',
    ],
  };
}
