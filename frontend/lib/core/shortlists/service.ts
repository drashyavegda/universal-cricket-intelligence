/** Shortlist generation, priority classification, versioning and approval (Feature 12). */
import type { Player, Shortlist } from '../types';
import type { RankedPlayer } from '../ranking/engine';

export interface ShortlistDraft {
  entries: Shortlist['entries'];
  diversity: { role: string; count: number }[];
  warnings: string[];
  backups: { playerId: string; name: string; reason: string }[];
}

export function buildShortlist(rows: RankedPlayer[], opts: { size: number; requireRoleDiversity: boolean; noteTemplate?: string }): ShortlistDraft {
  const picked = rows.slice(0, opts.size);
  const entries: Shortlist['entries'] = picked.map((r, i) => ({
    playerId: r.player.id,
    rank: i + 1,
    priority: (i < Math.ceil(opts.size * 0.3) ? 'P1' : i < Math.ceil(opts.size * 0.7) ? 'P2' : 'P3') as 'P1' | 'P2' | 'P3',
    note: r.positives[0] ?? 'No standout metric in the selected weighting.',
    score: r.score,
    rationale: r.explanation,
  }));

  const diversity = [...new Set(picked.map((r) => r.player.role))].map((role) => ({ role, count: picked.filter((r) => r.player.role === role).length }));
  const warnings: string[] = [];
  if (opts.requireRoleDiversity) {
    const dominant = diversity.sort((a, b) => b.count - a.count)[0];
    if (dominant && dominant.count > Math.ceil(opts.size * 0.5)) warnings.push(`${dominant.count}/${opts.size} picks are ${dominant.role}; consider a role-diverse alternative from the backup pool.`);
    if (!diversity.some((d) => d.role.includes('Bowler'))) warnings.push('No specialist bowler in the shortlist — squad balance will suffer.');
    if (!diversity.some((d) => d.role.includes('Wicketkeeper'))) warnings.push('No wicketkeeper in the shortlist.');
  }
  const backups = rows.slice(opts.size, opts.size + 5).map((r) => ({
    playerId: r.player.id, name: r.player.name,
    reason: `Next best at score ${r.score.toFixed(1)}; covers ${r.player.role}.`,
  }));
  const thin = picked.filter((r) => Math.max(r.player.batting.balls, r.player.bowling.balls) < 180);
  if (thin.length) warnings.push(`${thin.length} shortlisted player(s) have under 180 balls of evidence — mark them for verification before approval.`);
  return { entries, diversity, warnings, backups };
}

export function newShortlist(params: { name: string; kind: string; createdBy: string; draft: ShortlistDraft; filters: Record<string, unknown> }): Shortlist {
  const now = new Date().toISOString();
  return {
    id: `sl_${Math.random().toString(36).slice(2, 10)}`,
    name: params.name, kind: params.kind, createdAt: now, updatedAt: now, createdBy: params.createdBy,
    status: 'draft', entries: params.draft.entries, versions: [{ at: now, label: 'v1 · generated', snapshot: JSON.stringify(params.draft.entries) }],
    filters: params.filters,
  };
}

export function reviseShortlist(list: Shortlist, entries: Shortlist['entries'], label: string, actor: string): Shortlist {
  const now = new Date().toISOString();
  return {
    ...list, entries, updatedAt: now, status: 'draft',
    versions: [...list.versions, { at: now, label: `${label} by ${actor}`, snapshot: JSON.stringify(entries) }].slice(-20),
  };
}

export function approveShortlist(list: Shortlist, actor: string): Shortlist {
  const now = new Date().toISOString();
  return {
    ...list, status: 'approved', updatedAt: now,
    versions: [...list.versions, { at: now, label: `approved by ${actor}`, snapshot: JSON.stringify(list.entries) }],
  };
}

export function shortlistToCsv(list: Shortlist, players: Player[]): string {
  const header = ['rank', 'player', 'role', 'age', 'priority', 'score', 'note'];
  const lines = list.entries.map((e) => {
    const p = players.find((x) => x.id === e.playerId);
    return [e.rank, `"${p?.name ?? e.playerId}"`, `"${p?.role ?? ''}"`, p?.age ?? '', e.priority, e.score.toFixed(2), `"${e.note.replace(/"/g, "'")}"`].join(',');
  });
  return [header.join(','), ...lines].join('\n');
}
