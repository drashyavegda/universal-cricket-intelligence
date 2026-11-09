import { getStore, audit } from '@/lib/core/db/store';
import { guard, context, fail } from '@/lib/api/helpers';
import { rowsToCsv } from '@/lib/core/reporting/export';
import { buildCohort } from '@/lib/core/players/metrics';
import { rankPlayers } from '@/lib/core/ranking/engine';
import { STRATEGY_PRESETS } from '@/lib/core/ranking/presets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'players';
  const format = url.searchParams.get('format') ?? 'csv';
  const events = store.matches.flatMap((m) => m.events);
  const cohort = buildCohort(store.players, events);

  let rows: Record<string, unknown>[] = [];
  let filename = type;
  if (type === 'players') {
    rows = cohort.map((r) => ({
      id: r.player.id, name: r.player.name, age: r.player.age ?? '', dob: r.player.dob ?? '', role: r.player.role,
      team: r.player.team, state: r.player.state, overseas: r.player.overseas, capped: r.player.capped,
      matches: r.player.batting.matches, innings: r.player.batting.innings, runs: r.player.batting.runs,
      balls_faced: r.player.batting.balls, strike_rate: r.metrics.batting.strikeRate ?? '', average: r.metrics.batting.average ?? '',
      fours: r.player.batting.fours, sixes: r.player.batting.sixes,
      bowling_balls: r.player.bowling.balls, wickets: r.player.bowling.wickets,
      economy: r.metrics.bowling.economy ?? '', bowling_sr: r.metrics.bowling.strikeRate ?? '',
      catches: r.player.fielding.catches, sample_label: r.metrics.batting.sampleLabel,
      confidence: r.player.confidence, data_type: r.player.synthetic ? 'DEMO' : 'UPLOADED',
    }));
    filename = 'players';
  } else if (type === 'rankings') {
    const preset = STRATEGY_PRESETS.find((p) => p.key === (url.searchParams.get('preset') ?? 'young_talented_batter'))!;
    const maxAge = Number(url.searchParams.get('maxAge') ?? 23);
    const ranking = rankPlayers(store.players, { weights: preset.weights, maxAge, requireAge: true, ageWeight: preset.ageWeight ?? 0.5, limit: 60, presetKey: preset.key }, events);
    rows = ranking.rows.map((r) => ({
      rank: r.rank, player: r.player.name, age: r.player.age ?? '', role: r.player.role, team: r.player.team,
      score: r.score.toFixed(2), raw_score: r.rawScore.toFixed(2), evidence_adjustment: r.evidenceAdjustment,
      age_bonus: r.ageBonus, coverage: (r.coverage * 100).toFixed(0), positives: r.positives.join(' | '),
      data_type: r.player.synthetic ? 'DEMO' : 'UPLOADED', explanation: r.explanation,
    }));
    filename = `rankings-${preset.key}`;
  } else if (type === 'valuation') {
    rows = store.auctions.map((a) => {
      const p = store.players.find((x) => x.id === a.playerId);
      return { player: p?.name ?? a.playerId, role: p?.role ?? '', base_price_lakh: a.basePriceLakh, sold_price_lakh: a.soldPriceLakh ?? '', status: a.status, season: a.season, data_type: 'DEMO' };
    });
    filename = 'auction-history';
  } else if (type === 'audit') {
    rows = store.audit.map((a) => ({ at: a.at, actor: a.actor, action: a.action, entity: a.entity, entityId: a.entityId, detail: a.detail }));
    filename = 'audit-log';
  } else {
    return fail('Unknown export type. Use players, rankings, valuation or audit.');
  }

  audit({ actor: context().user?.email ?? 'guest', action: 'export', entity: 'table', entityId: type, detail: `format ${format}` });

  if (format === 'xlsx') {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'data');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}.xlsx"` } });
  }
  return new Response(rowsToCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}.csv"` } });
}
