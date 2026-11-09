import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, fail, serverError } from '@/lib/api/helpers';
import { simulateMatch, evaluatePredictionQuality, matchups, phaseProfile } from '@/lib/core/sim/match';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const store = getStore();
    const url = new URL(req.url);
    if (url.searchParams.get('evaluate') === 'true') {
      return json({ evaluation: evaluatePredictionQuality(store.matches, store.players, store.venues, 400) });
    }
    return json({
      teams: store.teams.map((t) => ({ id: t.id, name: t.name, squad: t.squadIds.slice(0, 11) })),
      venues: store.venues.map((v) => ({ id: v.id, name: v.name, city: v.city })),
      matches: store.matches.map((m) => ({ id: m.id, date: m.date, home: m.homeId, away: m.awayId, venueId: m.venueId })),
      defaults: { simulations: 5000, overs: 20, seed: 2027 },
      matchups: matchups(store.matches.flatMap((m) => m.events), store.players).slice(0, 20),
      methodology: [
        'Per-ball scoring sampled from a fixed T20 outcome distribution, scaled by each XI’s observed strike rate and phase aggression.',
        'Wicket hazard scales with the bowling attack’s observed economy; death overs are 16% more dangerous.',
        'Toss, dew and venue batting-friendliness shift the scoring environment; chasing receives a small boost.',
        'Outputs are distributions. Win probability carries a simulation error of ≈√(p(1−p)/N).',
      ],
    });
  } catch (error) { return serverError(error); }
}

export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{
      teamAId: string; teamBId: string; venueId?: string; simulations?: number; overs?: number; seed?: number;
      tossWinnerId?: string; tossDecision?: 'bat' | 'bowl'; xiA?: string[]; xiB?: string[]; scoreBias?: number;
      pitchAdjustment?: { battingFriendliness?: number; spinRating?: number; paceRating?: number };
    }>(req);
    const store = getStore();
    const teamA = store.teams.find((t) => t.id === body.teamAId);
    const teamB = store.teams.find((t) => t.id === body.teamBId);
    if (!teamA || !teamB) return fail('Select two teams.');
    const xiOf = (teamId: string, explicit?: string[]) => {
      const team = store.teams.find((t) => t.id === teamId)!;
      const ids = explicit?.length ? explicit : team.squadIds.slice(0, 11);
      return store.players.filter((p) => ids.includes(p.id));
    };
    const venue = store.venues.find((v) => v.id === body.venueId) ?? store.venues[0];
    const weather = store.weather.find((w) => w.venueId === venue.id) ?? null;
    const xiA = xiOf(teamA.id, body.xiA);
    const xiB = xiOf(teamB.id, body.xiB);
    const sims = Math.max(200, Math.min(20000, body.simulations ?? 5000));
    const started = Date.now();
    const result = simulateMatch(
      { teamId: teamA.id, name: teamA.name, players: xiA },
      { teamId: teamB.id, name: teamB.name, players: xiB },
      { venue, weather, simulations: sims, overs: body.overs ?? 20, seed: body.seed ?? 2027, tossWinnerId: body.tossWinnerId, tossDecision: body.tossDecision, pitchAdjustment: body.pitchAdjustment, scoreBias: body.scoreBias },
    );
    const myTeam = store.teams.find((t) => t.isUserTeam)!;
    return json({
      ...result,
      elapsedMs: Date.now() - started,
      venue: { id: venue.id, name: venue.name, city: venue.city },
      weather,
      xi: {
        [teamA.id]: xiA.map((p) => ({ id: p.id, name: p.name, role: p.role, synthetic: p.synthetic })),
        [teamB.id]: xiB.map((p) => ({ id: p.id, name: p.name, role: p.role, synthetic: p.synthetic })),
      },
      phaseProfiles: [
        { teamId: teamA.id, profile: phaseProfile(store.matches.flatMap((m) => m.events), xiA.map((p) => p.id)) },
        { teamId: teamB.id, profile: phaseProfile(store.matches.flatMap((m) => m.events), xiB.map((p) => p.id)) },
      ],
      userTeamId: myTeam.id,
    });
  } catch (error) { return serverError(error); }
}
