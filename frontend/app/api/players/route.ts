import { getStore } from '@/lib/core/db/store';
import { guard, json, serverError } from '@/lib/api/helpers';
import { buildCohort } from '@/lib/core/players/metrics';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const store = getStore();
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const role = url.searchParams.get('role') ?? 'all';
    const maxAge = Number(url.searchParams.get('maxAge') ?? 0);
    const minAge = Number(url.searchParams.get('minAge') ?? 0);
    const overseas = url.searchParams.get('overseas') ?? 'all';
    const capped = url.searchParams.get('capped') ?? 'all';
    const sort = url.searchParams.get('sort') ?? 'name';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const pageSize = Math.min(100, Number(url.searchParams.get('pageSize') ?? 25));

    const cohort = buildCohort(store.players, store.matches.flatMap((m) => m.events));
    let rows = cohort;
    if (q) rows = rows.filter((r) => r.player.name.toLowerCase().includes(q) || r.player.team.toLowerCase().includes(q) || r.player.state.toLowerCase().includes(q));
    if (role !== 'all') rows = rows.filter((r) => r.player.role === role);
    if (maxAge) rows = rows.filter((r) => r.player.age !== null && r.player.age <= Number(maxAge));
    if (minAge) rows = rows.filter((r) => r.player.age !== null && r.player.age >= Number(minAge));
    if (overseas !== 'all') rows = rows.filter((r) => r.player.overseas === (overseas === 'true'));
    if (capped !== 'all') rows = rows.filter((r) => r.player.capped === (capped === 'true'));

    const sorted = [...rows].sort((a, b) => {
      if (sort === 'runs') return b.player.batting.runs - a.player.batting.runs;
      if (sort === 'wickets') return b.player.bowling.wickets - a.player.bowling.wickets;
      if (sort === 'age') return (a.player.age ?? 99) - (b.player.age ?? 99);
      if (sort === 'strikeRate') return (b.metrics.batting.strikeRate ?? 0) - (a.metrics.batting.strikeRate ?? 0);
      if (sort === 'economy') return (a.metrics.bowling.economy ?? 99) - (b.metrics.bowling.economy ?? 99);
      return a.player.name.localeCompare(b.player.name);
    });

    const total = sorted.length;
    const paged = sorted.slice((page - 1) * pageSize, page * pageSize).map((r) => ({
      id: r.player.id, name: r.player.name, age: r.player.age, role: r.player.role, team: r.player.team,
      state: r.player.state, overseas: r.player.overseas, capped: r.player.capped, wicketkeeper: r.player.wicketkeeper,
      synthetic: r.player.synthetic, confidence: r.player.confidence,
      runs: r.player.batting.runs, balls: r.player.batting.balls, wickets: r.player.bowling.wickets,
      strikeRate: r.metrics.batting.strikeRate, average: r.metrics.batting.average, economy: r.metrics.bowling.economy,
      sampleLabel: r.metrics.batting.sampleLabel, formIndex: r.metrics.form.formIndex, dotBallPct: r.metrics.bowling.dotBallPct,
    }));

    return json({
      players: paged,
      pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
      facets: {
        roles: [...new Set(store.players.map((p) => p.role))].sort(),
        teams: [...new Set(store.players.map((p) => p.team))].sort(),
        minAge: Math.min(...store.players.map((p) => p.age ?? 99)),
        maxAge: Math.max(...store.players.map((p) => p.age ?? 0)),
      },
    });
  } catch (error) { return serverError(error); }
}
