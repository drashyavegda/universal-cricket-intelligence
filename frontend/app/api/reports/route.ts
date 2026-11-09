import { getStore, update, audit, notify } from '@/lib/core/db/store';
import { guard, json, readBody, fail, serverError } from '@/lib/api/helpers';
import { buildPlayerReport, buildTalentReport, buildTeamReport, buildAuctionReport, buildPitchReport, buildStatisticalReport, listReportBuilders } from '@/lib/core/reporting/build';
import { aiCall } from '@/lib/core/ai/gateway';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = getStore();
  return json({
    reports: store.reports.map((r) => ({ id: r.id, title: r.title, type: r.type, language: r.language, createdAt: r.createdAt, quality: r.quality.score, sections: r.sections.length, createdBy: r.createdBy })),
    builders: listReportBuilders(),
    players: store.players.slice(0, 80).map((p) => ({ id: p.id, name: p.name, role: p.role, age: p.age })),
    teams: store.teams.map((t) => ({ id: t.id, name: t.name, isUserTeam: t.isUserTeam })),
    venues: store.venues.map((v) => ({ id: v.id, name: v.name })),
  });
}

export async function POST(req: Request) {
  const g = guard('report:write'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ type: string; playerId?: string; teamId?: string; venueId?: string; maxAge?: number; size?: number; preset?: string; language?: 'en' | 'hi' | 'gu'; playerIds?: string[]; narrate?: boolean }>(req);
    const store = getStore();
    let report;
    switch (body.type) {
      case 'player': report = buildPlayerReport(body.playerId ?? store.players[0].id, body.language ?? 'en'); break;
      case 'talent': report = buildTalentReport({ maxAge: body.maxAge ?? 23, size: body.size ?? 10, preset: body.preset }); break;
      case 'team': report = buildTeamReport(body.teamId ?? store.teams.find((t) => t.isUserTeam)!.id); break;
      case 'auction': report = buildAuctionReport(body.teamId ?? store.teams.find((t) => t.isUserTeam)!.id); break;
      case 'pitch': report = buildPitchReport(body.venueId ?? store.venues[0].id); break;
      case 'statistical': report = buildStatisticalReport(body.playerIds ?? store.players.slice(0, 3).map((p) => p.id)); break;
      default: return fail('Unknown report type');
    }
    let narration: { mode: string; text: string; note?: string } | null = null;
    if (body.narrate) {
      const res = await aiCall({
        purpose: 'report.executive_summary',
        prompt: `Write a 90-word executive summary for this cricket report. Use ONLY these facts:\n${report.sections.slice(0, 2).map((s) => `${s.heading}: ${s.body}`).join('\n')}`,
        fallback: report.sections[0].body.slice(0, 700),
      });
      narration = { mode: res.mode, text: res.text, note: res.note };
    }
    update((s) => { s.reports.unshift(report); });
    audit({ actor: g.ctx.user!.email, action: 'report.create', entity: 'report', entityId: report.id, detail: `${report.type} · quality ${report.quality.score}` });
    notify({ level: 'success', title: 'Report generated', body: `${report.title} (quality ${report.quality.score}/100)`, href: `/reports?report=${report.id}` });
    return json({ report, narration });
  } catch (error) { return serverError(error); }
}
