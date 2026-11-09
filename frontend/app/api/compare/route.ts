import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, fail, serverError } from '@/lib/api/helpers';
import { buildCohort, computePlayerMetrics } from '@/lib/core/players/metrics';
import { assessRisk } from '@/lib/core/players/risk';
import { assessPotential } from '@/lib/core/players/potential';
import { simulateReplacement } from '@/lib/core/team/squad';

export const dynamic = 'force-dynamic';

/** Player comparison + replacement simulator (Feature 8). */
export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ ids: string[]; venueId?: string; teamId?: string; replacement?: { outId: string; inId: string } }>(req);
    const store = getStore();
    const ids = (body.ids ?? []).slice(0, 8);
    if (ids.length < 2) return fail('Select at least two players to compare.');
    const events = store.matches.flatMap((m) => m.events);
    const cohort = buildCohort(store.players, events);
    const players = ids.map((id) => store.players.find((p) => p.id === id)).filter(Boolean);
    if (players.length < 2) return fail('Players not found in this workspace.');

    const rows = players.map((p) => {
      const row = cohort.find((r) => r.player.id === p!.id)!;
      const m = computePlayerMetrics(p!, events);
      const potential = assessPotential(row);
      const risk = assessRisk(row, { potential: potential.potential });
      return {
        player: { id: p!.id, name: p!.name, age: p!.age, role: p!.role, team: p!.team, synthetic: p!.synthetic, capped: p!.capped, overseas: p!.overseas },
        metrics: m, percentiles: row.percentiles, potential, risk,
        fingerprint: [
          { axis: 'Average', value: row.percentiles['batting.average'] ?? 0 },
          { axis: 'Strike rate', value: row.percentiles['batting.strikeRate'] ?? 0 },
          { axis: 'Boundaries', value: row.percentiles['batting.boundaryPct'] ?? 0 },
          { axis: 'Economy', value: row.percentiles['bowling.economy'] ?? 0 },
          { axis: 'Wicket rate', value: row.percentiles['bowling.strikeRate'] ?? 0 },
          { axis: 'Consistency', value: row.percentiles['consistency.floorRate'] ?? 0 },
          { axis: 'Recent form', value: row.percentiles['form.formIndex'] ?? 0 },
          { axis: 'Potential', value: potential.potential },
        ],
      };
    });

    const replacement = body.replacement && body.teamId
      ? (() => {
        const team = store.teams.find((t) => t.id === body.teamId);
        if (!team) return null;
        const squad = store.players.filter((p) => team.squadIds.includes(p.id));
        return simulateReplacement(team, squad, body.replacement!.outId, body.replacement!.inId, store.players);
      })()
      : null;

    return json({
      players: rows,
      replacement,
      verdict: rows.length === 2
        ? `${rows[0].player.name} leads on ${rows[0].fingerprint.filter((f, i) => f.value > rows[1].fingerprint[i].value).map((f) => f.axis).join(', ') || 'no axis'}; ${rows[1].player.name} leads on ${rows[1].fingerprint.filter((f, i) => f.value > rows[0].fingerprint[i].value).map((f) => f.axis).join(', ') || 'no axis'}. Radar values are cohort percentiles, not raw statistics.`
        : `Comparing ${rows.length} players across eight percentile axes. Values are relative to the current cohort of ${cohort.length}.`,
      caveat: 'Differences of a few percentile points are within noise for small samples. Check each player’s sample label before concluding.',
    });
  } catch (error) { return serverError(error); }
}
