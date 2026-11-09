import { getStore, update, audit, notify } from '@/lib/core/db/store';
import { context, guard, json, readBody, serverError } from '@/lib/api/helpers';
import { rankPlayers } from '@/lib/core/ranking/engine';
import { STRATEGY_PRESETS, presetByKey } from '@/lib/core/ranking/presets';
import { buildShortlist, newShortlist } from '@/lib/core/shortlists/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = getStore();
  return json({ shortlists: store.shortlists, presets: STRATEGY_PRESETS.map((p) => ({ key: p.key, label: p.label })) });
}

export async function POST(req: Request) {
  const g = guard('shortlist:write'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ name?: string; kind?: string; size?: number; presetKey?: string; maxAge?: number | null; roles?: string[]; requireRoleDiversity?: boolean }>(req);
    const store = getStore();
    const preset = presetByKey(body.presetKey ?? 'young_talented_batter') ?? STRATEGY_PRESETS[0];
    const size = Math.max(3, Math.min(30, body.size ?? 10));
    const ranking = rankPlayers(store.players, {
      weights: preset.weights,
      roles: (body.roles?.length ? body.roles : undefined) as never,
      maxAge: body.maxAge ?? null, requireAge: body.maxAge != null,
      ageWeight: preset.ageWeight ?? 0.5, limit: size, presetKey: preset.key,
    }, store.matches.flatMap((m) => m.events));
    const draft = buildShortlist(ranking.rows, { size, requireRoleDiversity: body.requireRoleDiversity ?? true });
    const list = newShortlist({
      name: body.name ?? `${preset.label} shortlist (${size})`, kind: body.kind ?? preset.key,
      createdBy: g.ctx.user!.email, draft, filters: { presetKey: preset.key, maxAge: body.maxAge ?? null, roles: body.roles ?? [], size },
    });
    update((s) => { s.shortlists.unshift(list); });
    audit({ actor: g.ctx.user!.email, action: 'shortlist.create', entity: 'shortlist', entityId: list.id, detail: `${size} entries from cohort ${ranking.cohortSize}` });
    notify({ level: 'success', title: 'Shortlist generated', body: `${list.name} — ${list.entries.length} players, status draft pending approval.`, href: '/talent?tab=shortlists' });
    return json({ shortlist: list, draft, cohortSize: ranking.cohortSize, sensitivity: ranking.sensitivity });
  } catch (error) { return serverError(error); }
}
