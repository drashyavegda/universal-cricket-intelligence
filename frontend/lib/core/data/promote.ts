/**
 * Dataset record → canonical Player promotion.
 *
 * Approved extracted records are the ONLY route by which uploaded data enters the
 * analytical store. Nothing is promoted silently: a record must be `approved`
 * (by a human) for it to appear in rankings, valuations or simulations.
 */
import { getStore, update } from '../db/store';
import type { Player, PlayerRole, Provenance } from '../types';
import { BATTER_ROLES, BOWLER_ROLES } from '../types';

const ROLE_LOOKUPS: PlayerRole[] = ['Opener','Top-order Batter','Middle-order Batter','Finisher','Wicketkeeper-Batter','Pace Bowler','Spin Bowler','Pace All-rounder','Spin All-rounder','All-rounder'];

const ROLE_LOOKUP: { match: RegExp; role: PlayerRole }[] = [
  { match: /keeper|wicket/i, role: 'Wicketkeeper-Batter' },
  { match: /^opener/i, role: 'Opener' },
  { match: /top[- ]?order/i, role: 'Top-order Batter' },
  { match: /middle/i, role: 'Middle-order Batter' },
  { match: /finisher/i, role: 'Finisher' },
  { match: /all[- ]?round/i, role: 'Pace All-rounder' },
  { match: /spin/i, role: 'Spin Bowler' },
  { match: /pace|fast|medium|seam/i, role: 'Pace Bowler' },
  { match: /bowl/i, role: 'Pace Bowler' },
  { match: /bat/i, role: 'Middle-order Batter' },
];

/** Map free-text roles onto the canonical enum, keeping the strongest signal. */
export function normaliseRole(raw: string | null | undefined): PlayerRole {
  const value = (raw ?? '').trim();
  if (!value) return 'Middle-order Batter';
  const exact = ROLE_LOOKUPS.find((r) => r.toLowerCase() === value.toLowerCase());
  if (exact) return exact as PlayerRole;
  if (/all[- ]?round/i.test(value)) return /spin|orthodox|off[- ]?break|leg[- ]?break/i.test(value) ? 'Spin All-rounder' : 'Pace All-rounder';
  const hit = ROLE_LOOKUP.find((r) => r.match.test(value));
  return hit ? hit.role : 'Middle-order Batter';
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function emptyBatting(): Player['batting'] {
  return { matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, highScore: 0, dismissals: 0 };
}
function emptyBowling(): Player['bowling'] {
  return { matches: 0, innings: 0, balls: 0, runsConceded: 0, wickets: 0, maidens: 0, bestWickets: 0, bestRuns: 0 };
}
function emptyPhase(): Player['phaseBatting'] {
  return { powerplay: { balls: 0, runs: 0, wickets: 0, dismissals: 0 }, middle: { balls: 0, runs: 0, wickets: 0, dismissals: 0 }, death: { balls: 0, runs: 0, wickets: 0, dismissals: 0 } };
}

function ageFrom(dob: string | null | undefined, reference: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const r = new Date(reference);
  if (Number.isNaN(d.getTime())) return null;
  let age = r.getUTCFullYear() - d.getUTCFullYear();
  const m = r.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && r.getUTCDate() < d.getUTCDate())) age -= 1;
  return age >= 10 && age <= 60 ? age : null;
}

function asNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export interface PromotionResult {
  datasetId: string;
  considered: number;
  added: number;
  updated: number;
  skipped: number;
  reasons: string[];
  playerIds: string[];
}

/** Promote all approved records of one dataset into the store. Idempotent by player name. */
export function promoteDataset(datasetId: string, actor = 'system'): PromotionResult {
  const store = getStore();
  const dataset = store.datasets.find((d) => d.id === datasetId);
  const reference = store.settings.referenceDate;
  const records = store.records.filter((r) => r.datasetId === datasetId && r.status === 'approved');
  const result: PromotionResult = { datasetId, considered: records.length, added: 0, updated: 0, skipped: 0, reasons: [], playerIds: [] };

  if (!records.length) {
    result.reasons.push('No approved records in this dataset. Approve records in the Data Room first.');
    return result;
  }

  const now = new Date().toISOString();
  const built: Player[] = [];

  const usedIds = new Set(store.players.map((p) => p.id));
  const uniqueId = (base: string): string => {
    let id = base;
    let n = 2;
    while (usedIds.has(id)) { id = `${base}_${n}`; n += 1; }
    usedIds.add(id);
    return id;
  };

  for (const rec of records) {
    const m = (rec.mapped ?? {}) as Record<string, unknown>;
    const num = (key: string): number => asNumber(m[key]);
    const str = (key: string): string | null => {
      const v = m[key];
      return typeof v === 'string' && v.trim() ? v.trim() : null;
    };
    const name = (str('name') ?? rec.playerName ?? '').trim();
    if (!name || name.startsWith('Row ')) {
      result.skipped += 1;
      result.reasons.push(`Row ${rec.sourceRow}: no usable player name — left out (nothing was invented).`);
      continue;
    }
    const dob = str('dob');
    const role = normaliseRole(str('role'));
    const isBowler = BOWLER_ROLES.includes(role);
    const batting = {
      matches: num('matches'), innings: num('innings'), notOuts: num('notOuts'), runs: num('runs'), balls: num('balls'),
      fours: num('fours'), sixes: num('sixes'), fifties: num('fifties'), hundreds: num('hundreds'),
      highScore: num('highScore'), dismissals: num('dismissals') || Math.max(0, num('innings') - num('notOuts')),
    };
    const bowlingBalls = num('bowlingBalls') || Math.round(num('overs') * 6);
    const bowling = {
      matches: num('matches'), innings: num('bowlingInnings') || (bowlingBalls > 0 ? num('matches') : 0),
      balls: bowlingBalls, runsConceded: num('runsConceded'), wickets: num('wickets'), maidens: num('maidens'),
      bestWickets: 0, bestRuns: 0,
    };
    const fielding = { catches: num('catches'), runOuts: num('runOuts'), stumpings: num('stumpings') };
    const hasBatting = batting.balls > 0 || batting.runs > 0 || batting.innings > 0;
    const hasBowling = bowlingBalls > 0 || bowling.wickets > 0;
    if (!hasBatting && !hasBowling) {
      result.skipped += 1;
      result.reasons.push(`${name}: no batting or bowling figures in the approved row — not promoted, because an empty player would pollute every ranking.`);
      continue;
    }
    const provenance: Provenance = {
      sourceId: dataset?.id ?? 'uploaded',
      sourceName: dataset?.name ?? 'Uploaded dataset',
      field: 'record',
      value: `row ${rec.sourceRow}`,
      kind: 'uploaded',
      fetchedAt: now,
      reliability: rec.confidence,
    };
    const baseId = `pl_upl_${String(rec.sourceRow).padStart(3, '0')}_${rec.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6)}`;
    const player: Player = {
      id: uniqueId(baseId),
      name,
      dob,
      age: ageFrom(dob, reference),
      team: str('team') ?? 'Unattached',
      state: str('state') ?? 'Unknown',
      competition: str('competition') ?? dataset?.competition ?? 'Uploaded',
      season: str('season') ?? dataset?.season ?? 'Unscheduled',
      format: (str('format') as Player['format'] | null) ?? dataset?.format ?? 'Unknown',
      role,
      battingStyle: (str('battingStyle') as Player['battingStyle'] | null) ?? 'Unknown',
      bowlingType: (str('bowlingType') as Player['bowlingType'] | null) ?? (isBowler ? (role === 'Spin Bowler' ? 'Spin' : 'Pace') : hasBowling ? 'Pace' : 'None'),
      capped: Boolean(m.capped) || /capped/i.test(String(m.capped ?? '')),
      overseas: Boolean(m.overseas),
      wicketkeeper: Boolean(m.wicketkeeper) || role === 'Wicketkeeper-Batter',
      batting,
      bowling,
      fielding,
      phaseBatting: emptyPhase(),
      phaseBowling: emptyPhase(),
      matchLog: (m.matchLog as Player['matchLog'] | undefined) ?? [],
      career: (m.career as Player['career'] | undefined) ?? [],
      confidence: Math.max(0.05, Math.min(1, rec.confidence)),
      synthetic: false,
      sources: [provenance],
      unknownFields: rec.unknownFields,
      notes: `Promoted from “${dataset?.name ?? 'uploaded dataset'}” row ${rec.sourceRow} on ${now.slice(0, 10)}. Age derived at reference date ${reference}.`,
    };
    built.push(player);
  }

  const nameIndex = new Map<string, Player>();
  for (const p of store.players) {
    const key = norm(p.name);
    if (!nameIndex.has(key)) nameIndex.set(key, p);
  }

  const added: Player[] = [];
  const updates: { id: string; patch: Partial<Player> }[] = [];

  for (const incoming of built) {
    const existing = nameIndex.get(norm(incoming.name));
    if (existing) {
      if (existing.synthetic) {
        // A real uploaded record replaces a demo placeholder with the same name.
        updates.push({
          id: existing.id,
          patch: {
            dob: incoming.dob ?? existing.dob,
            age: incoming.age ?? existing.age,
            team: incoming.team !== 'Unattached' ? incoming.team : existing.team,
            state: incoming.state !== 'Unknown' ? incoming.state : existing.state,
            batting: incoming.batting.matches || incoming.batting.runs ? incoming.batting : existing.batting,
            bowling: incoming.bowling.balls ? incoming.bowling : existing.bowling,
            fielding: incoming.fielding,
            role: incoming.role,
            capped: incoming.capped, overseas: incoming.overseas, wicketkeeper: incoming.wicketkeeper,
            confidence: Math.max(existing.confidence, incoming.confidence),
            synthetic: false,
            sources: [...existing.sources.filter((s) => s.kind !== 'demo'), incoming.sources[0]],
            notes: `Replaced a DEMO placeholder with an uploaded record on ${now.slice(0, 10)}.`,
          },
        });
        result.updated += 1;
      } else {
        updates.push({ id: existing.id, patch: { batting: incoming.batting, bowling: incoming.bowling, fielding: incoming.fielding, confidence: Math.max(existing.confidence, incoming.confidence), sources: [...existing.sources, incoming.sources[0]] } });
        result.updated += 1;
      }
      result.playerIds.push(existing.id);
    } else {
      added.push(incoming);
      nameIndex.set(norm(incoming.name), incoming);
      result.added += 1;
      result.playerIds.push(incoming.id);
    }
  }

  if (added.length || updates.length) {
    update((s) => {
      for (const u of updates) {
        const idx = s.players.findIndex((p) => p.id === u.id);
        if (idx >= 0) s.players[idx] = { ...s.players[idx], ...u.patch };
      }
      s.players = [...s.players, ...added];
      s.audit.unshift({
        id: `aud_${now.replace(/[^0-9]/g, '').slice(0, 14)}_pr`,
        at: now, actor, action: 'dataset.promote', entity: 'dataset', entityId: datasetId,
        detail: `Promoted ${added.length} new and updated ${updates.length} player records from approved dataset rows.`,
      });
    });
  }

  if (!result.reasons.length) result.reasons.push('Approved rows promoted into the analytical store. Rejected and pending rows were left out.');
  return result;
}

/** Roles that have at least one stat line in this player — used by the UI to explain promotion. */
export function promotionReadiness(p: Player): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (p.age === null) missing.push('date of birth');
  if (!p.batting.matches && !p.bowling.matches) missing.push('match counts');
  const isBatter = BATTER_ROLES.includes(p.role);
  if (isBatter && !p.batting.balls) missing.push('balls faced');
  if (!isBatter && !p.bowling.balls) missing.push('balls bowled');
  return { ready: missing.length === 0, missing };
}

export { ageFrom as computeAgeAt };
