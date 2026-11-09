import { getStore } from '@/lib/core/db/store';
import { guard, json, fail, readBody, serverError } from '@/lib/api/helpers';
import { analyseSquad, simulateReplacement, teamForm, pitchSuitability } from '@/lib/core/team/squad';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const store = getStore();
    const team = store.teams.find((t) => t.id === params.id);
    if (!team) return fail('Team not found', 404);
    const events = store.matches.flatMap((m) => m.events);
    const squad = store.players.filter((p) => team.squadIds.includes(p.id));
    const analysis = analyseSquad(team, squad, store.players, events);
    const venueId = new URL(req.url).searchParams.get('venue');
    const venue = store.venues.find((v) => v.id === venueId) ?? store.venues[0];
    return json({
      team, analysis,
      form: teamForm(store.matches, team.id),
      squad: squad.map((p) => ({
        id: p.id, name: p.name, age: p.age, role: p.role, bowlingType: p.bowlingType, overseas: p.overseas, capped: p.capped,
        runs: p.batting.runs, wicketkeeper: p.wicketkeeper,
        strikeRate: p.batting.balls ? Number((p.batting.runs / p.batting.balls * 100).toFixed(1)) : null,
        economy: p.bowling.balls ? Number((p.bowling.runsConceded / p.bowling.balls * 6).toFixed(2)) : null,
        wickets: p.bowling.wickets, confidence: p.confidence, synthetic: p.synthetic,
        pitchFit: pitchSuitability(p, venue).score,
      })),
      purse: { totalLakh: team.purseLakh, spentLakh: 0, slots: team.maxSquadSize - squad.length, overseasLimit: team.overseasLimit },
      venues: store.venues.map((v) => ({ id: v.id, name: v.name })),
      activeVenue: { id: venue.id, name: venue.name },
      alternatives: store.teams.filter((t) => t.id !== team.id).map((t) => ({ id: t.id, name: t.name })),
    });
  } catch (error) { return serverError(error); }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ outId: string; inId: string }>(req);
    const store = getStore();
    const team = store.teams.find((t) => t.id === params.id);
    if (!team) return fail('Team not found', 404);
    const squad = store.players.filter((p) => team.squadIds.includes(p.id));
    return json({ impact: simulateReplacement(team, squad, body.outId, body.inId, store.players) });
  } catch (error) { return serverError(error); }
}
