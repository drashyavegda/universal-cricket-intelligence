import { getStore } from '@/lib/core/db/store';
import { buildCohort } from '@/lib/core/players/metrics';
import { analyseSquad } from '@/lib/core/team/squad';
import { rankPlayers } from '@/lib/core/ranking/engine';
import { STRATEGY_PRESETS } from '@/lib/core/ranking/presets';
import { analysisTrust, analyseDatasetQuality, sourceReliabilityFor } from '@/lib/core/data/quality';
import { securityScore } from '@/lib/core/security/posture';
import { guard, json } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  const events = store.matches.flatMap((m) => m.events);
  const cohort = buildCohort(store.players, events);
  const team = store.teams.find((t) => t.isUserTeam)!;
  const squad = store.players.filter((p) => team.squadIds.includes(p.id));
  const squadAnalysis = analyseSquad(team, squad, store.players, events);
  const preset = STRATEGY_PRESETS.find((p) => p.key === 'young_talented_batter')!;
  const talent = rankPlayers(store.players, { weights: preset.weights, maxAge: 23, requireAge: true, ageWeight: preset.ageWeight ?? 0.6, limit: 5, presetKey: preset.key }, events);
  const dataset = store.datasets[0];
  const records = store.records.filter((r) => r.datasetId === dataset?.id);
  const quality = analyseDatasetQuality(records, { datasetId: dataset?.id ?? 'none', ageReference: store.settings.referenceDate });
  const trust = analysisTrust({
    datasetQuality: quality.score,
    playerCoverage: Math.min(100, (store.players.filter((p) => p.age !== null).length / store.players.length) * 100),
    sampleAdequacy: Math.min(100, (cohort.filter((r) => Math.max(r.player.batting.balls, r.player.bowling.balls) >= 180).length / cohort.length) * 100),
    sourceReliability: sourceReliabilityFor(store.players),
  });
  const security = securityScore();

  return json({
    mode: store.settings.demoMode ? 'DEMO' : 'LIVE',
    referenceDate: store.settings.referenceDate,
    counts: { players: store.players.length, uncapped: store.players.filter((p) => !p.capped).length, teams: store.teams.length, matches: store.matches.length, venues: store.venues.length, datasets: store.datasets.length, reports: store.reports.length },
    team: { id: team.id, name: team.name, purseLakh: team.purseLakh, squadSize: squad.length, slotsLeft: team.maxSquadSize - squad.length, balanceScore: squadAnalysis.balanceScore, weaknesses: squadAnalysis.weaknesses.slice(0, 3) },
    talent: talent.rows.map((r) => ({ id: r.player.id, name: r.player.name, age: r.player.age, role: r.player.role, score: r.score, confidence: r.player.confidence })),
    quality: { datasetScore: quality.score, trustScore: quality.trustScore, errors: quality.counts.errors, warnings: quality.counts.warnings },
    trust,
    security: { score: security.score, grade: security.grade, gaps: security.gaps.length },
    recentMatches: store.matches.slice(-3).map((m) => ({
      id: m.id, date: m.date, venue: store.venues.find((v) => v.id === m.venueId)?.name ?? m.venueId,
      home: store.teams.find((t) => t.id === m.homeId)?.shortName ?? m.homeId,
      away: store.teams.find((t) => t.id === m.awayId)?.shortName ?? m.awayId,
      score: `${m.homeScore}/${m.homeWickets} vs ${m.awayScore}/${m.awayWickets}`,
      winner: m.winnerId ? store.teams.find((t) => t.id === m.winnerId)?.shortName ?? m.winnerId : 'tie',
    })),
    notifications: store.notifications.slice(0, 5),
    sparkline: cohort.slice(0, 40).map((r) => ({ name: r.player.name, sr: r.metrics.batting.strikeRate ?? 0, age: r.player.age ?? 0 })),
    ai: { configured: Boolean(process.env.AI_API_KEY), provider: store.settings.ai.provider, model: store.settings.ai.model },
    disclaimer: 'All records in this workspace are synthetic DEMO data unless you upload your own dataset.',
  });
}
