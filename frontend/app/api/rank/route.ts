import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, serverError } from '@/lib/api/helpers';
import { rankPlayers } from '@/lib/core/ranking/engine';
import { METRIC_DEFS, STRATEGY_PRESETS, presetByKey } from '@/lib/core/ranking/presets';
import type { PlayerRole } from '@/lib/core/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = guard('view'); if (!g.ok) return g.response;
  return json({ presets: STRATEGY_PRESETS, metrics: METRIC_DEFS });
}

export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{
      presetKey?: string; weights?: Record<string, number>; roles?: PlayerRole[]; maxAge?: number | null; minAge?: number | null;
      ageWeight?: number; limit?: number; minBalls?: number; excludeUncappedOverseas?: boolean;
    }>(req);
    const store = getStore();
    const preset = presetByKey(body.presetKey ?? 'balanced_t20') ?? STRATEGY_PRESETS[0];
    const weights = body.weights ?? preset.weights;
    const result = rankPlayers(store.players, {
      weights,
      roles: body.roles?.length ? body.roles : preset.roles.length ? (preset.roles as PlayerRole[]) : undefined,
      maxAge: body.maxAge ?? null, minAge: body.minAge ?? null,
      ageWeight: body.ageWeight ?? preset.ageWeight ?? 0,
      limit: body.limit ?? 25,
      minBalls: body.minBalls,
      requireAge: body.maxAge !== null && body.maxAge !== undefined,
      presetKey: preset.key,
    }, store.matches.flatMap((m) => m.events));
    return json({
      ...result,
      rows: result.rows.map((r) => ({
        rank: r.rank, score: r.score, rawScore: r.rawScore, evidenceAdjustment: r.evidenceAdjustment, ageBonus: r.ageBonus,
        coverage: r.coverage, positives: r.positives, negatives: r.negatives, explanation: r.explanation,
        components: r.components,
        player: {
          id: r.player.id, name: r.player.name, age: r.player.age, role: r.player.role, team: r.player.team,
          capped: r.player.capped, overseas: r.player.overseas, synthetic: r.player.synthetic, confidence: r.player.confidence,
          strikeRate: r.player.batting.balls ? Number((r.player.batting.runs / r.player.batting.balls * 100).toFixed(1)) : null,
          average: r.player.batting.dismissals ? Number((r.player.batting.runs / r.player.batting.dismissals).toFixed(1)) : null,
          economy: r.player.bowling.balls ? Number((r.player.bowling.runsConceded / r.player.bowling.balls * 6).toFixed(2)) : null,
          runs: r.player.batting.runs, wickets: r.player.bowling.wickets, balls: r.player.batting.balls,
        },
      })),
      presets: STRATEGY_PRESETS.map((p) => ({ key: p.key, label: p.label, blurb: p.blurb })),
    });
  } catch (error) { return serverError(error); }
}
