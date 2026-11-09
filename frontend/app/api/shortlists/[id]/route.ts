import { getStore, update, audit } from '@/lib/core/db/store';
import { guard, json, fail, readBody, serverError } from '@/lib/api/helpers';
import { approveShortlist, reviseShortlist, shortlistToCsv } from '@/lib/core/shortlists/service';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const store = getStore();
  const list = store.shortlists.find((s) => s.id === params.id);
  if (!list) return fail('Shortlist not found', 404);
  return json({
    shortlist: list,
    players: list.entries.map((e) => {
      const p = store.players.find((x) => x.id === e.playerId);
      return { ...e, name: p?.name ?? e.playerId, role: p?.role, age: p?.age, synthetic: p?.synthetic };
    }),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = guard('shortlist:write'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ action: 'approve' | 'revise' | 'export'; entries?: { playerId: string; rank: number; priority: 'P1' | 'P2' | 'P3' | 'backup'; note: string; score: number; rationale: string }[]; note?: string }>(req);
    const store = getStore();
    const list = store.shortlists.find((s) => s.id === params.id);
    if (!list) return fail('Shortlist not found', 404);
    if (body.action === 'approve') {
      if (g.ctx.role !== 'owner' && g.ctx.role !== 'analyst') return fail('Approval requires the analyst or owner role.', 403);
      const approved = approveShortlist(list, g.ctx.user!.email);
      update((s) => { s.shortlists = s.shortlists.map((x) => (x.id === list.id ? approved : x)); });
      audit({ actor: g.ctx.user!.email, action: 'shortlist.approve', entity: 'shortlist', entityId: list.id, detail: `${approved.entries.length} entries approved` });
      return json({ shortlist: approved });
    }
    if (body.action === 'revise' && body.entries) {
      const revised = reviseShortlist(list, body.entries, body.note ?? 'manual edit', g.ctx.user!.email);
      update((s) => { s.shortlists = s.shortlists.map((x) => (x.id === list.id ? revised : x)); });
      audit({ actor: g.ctx.user!.email, action: 'shortlist.revise', entity: 'shortlist', entityId: list.id, detail: body.note ?? 'manual edit' });
      return json({ shortlist: revised });
    }
    const csv = shortlistToCsv(list, store.players);
    return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${list.name.replace(/[^a-z0-9]+/gi, '-')}.csv"` } });
  } catch (error) { return serverError(error); }
}
