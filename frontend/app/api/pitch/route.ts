import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, fail, serverError } from '@/lib/api/helpers';
import { venueDNA, tossStrategy, pitchRankings, whatIfPitch, compareVenues } from '@/lib/core/pitch/venue';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{
      venueId?: string; operation?: 'dna' | 'whatif' | 'compare';
      adjustment?: { battingFriendliness: number; paceRating: number; spinRating: number; dewRisk: number };
    }>(req);
    const store = getStore();
    const venue = store.venues.find((v) => v.id === body.venueId) ?? store.venues[0];
    if (!venue) return fail('Venue not found', 404);
    const weather = store.weather.find((w) => w.venueId === venue.id) ?? null;
    if (body.operation === 'compare') {
      return json({ comparison: compareVenues(store.venues), venues: store.venues.map((v) => ({ id: v.id, name: v.name })) });
    }
    const dna = venueDNA(venue, weather, store.matches);
    const toss = tossStrategy(venue, weather);
    const rankings = pitchRankings(store.players, venue, 8);
    const whatIf = body.adjustment
      ? whatIfPitch(venue, { ...body.adjustment, weather })
      : whatIfPitch(venue, { battingFriendliness: venue.pitch.battingFriendliness, paceRating: venue.pitch.paceRating, spinRating: venue.pitch.spinRating, dewRisk: venue.dewRisk, weather });
    return json({
      venue, weather, dna, toss, whatIf,
      rankings: {
        batters: rankings.batters.map((r) => ({ id: r.player.id, name: r.player.name, role: r.player.role, score: r.score, reason: r.reason, synthetic: r.player.synthetic })),
        spinners: rankings.spinners.map((r) => ({ id: r.player.id, name: r.player.name, score: r.score, reason: r.reason, synthetic: r.player.synthetic })),
        pacers: rankings.pacers.map((r) => ({ id: r.player.id, name: r.player.name, score: r.score, reason: r.reason, synthetic: r.player.synthetic })),
      },
      auctionImplication: dna.dna.find((d) => d.trait === 'Spin-friendly')!.score > dna.dna.find((d) => d.trait === 'Pace-friendly')!.score
        ? 'This surface profile raises the value of spin-bowling options and spin all-rounders relative to pace.'
        : 'This surface profile raises the value of pace options, especially death-overs specialists, relative to spin.',
      evidenceTypes: ['historical', 'observation', 'forecast', 'inference'],
      venues: store.venues.map((v) => ({ id: v.id, name: v.name, city: v.city })),
    });
  } catch (error) { return serverError(error); }
}
