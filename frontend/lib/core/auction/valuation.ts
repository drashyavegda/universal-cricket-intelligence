/**
 * Auction market intelligence & valuation (Features 10, 21).
 *
 * Valuation is deterministic and evidence-based; the maximum bid is a separate
 * STRATEGY decision that embeds the cost of losing the player. Estimated value is
 * never presented as an expected auction price.
 */
import { buildCohort, type CohortRow } from '../players/metrics';
import { ageHeadroom } from '../ranking/presets';
import { describe } from '../stats/descriptive';
import { BATTER_ROLES, BOWLER_ROLES, ALLROUNDER_ROLES, type AuctionRecord, type MatchEvent, type Player, type Team } from '../types';

export interface ValuationInput {
  player: Player;
  cohort: CohortRow[];
  roleScarcity: number;      // 0..1, 1 = scarce
  teamNeed: number;          // 0..1, how badly the buying team needs the role
  competitorDemand: number;  // 0..1 estimated market competition
  history: AuctionRecord[];
}

export interface Valuation {
  playerId: string;
  name: string;
  role: string;
  age: number | null;
  qualityScore: number;
  sampleReliability: number;
  scarcityIndex: number;
  demandIndex: number;
  fairValueLakh: number;
  rangeLakh: { low: number; high: number };
  maxBid: { conservative: number; balanced: number; aggressive: number };
  historicalComparable: { n: number; medianSold: number | null; note: string };
  drivers: { label: string; value: string; direction: 'up' | 'down' | 'neutral' }[];
  caveats: string[];
}

const roundTo = (v: number, step = 5) => Math.max(step, Math.round(v / step) * step);

function qualityScoreOf(row: CohortRow): number {
  const keys = ['batting.strikeRate', 'batting.average', 'batting.runsPerInnings', 'bowling.economy', 'bowling.strikeRate', 'phase.deathSR', 'phase.deathEcon', 'consistency.floorRate', 'form.formIndex'];
  const vals = keys.map((k) => row.percentiles[k]).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 40;
}

export function roleScarcity(players: Player[], cohort: CohortRow[], role: Player['role']): number {
  const inRole = cohort.filter((r) => r.player.role === role);
  const strong = inRole.filter((r) => qualityScoreOf(r) >= 60).length;
  const share = strong / Math.max(1, cohort.length);
  return Math.max(0.15, Math.min(1, 1 - share * 6));
}

export function teamNeedFor(team: Team, squadPlayers: Player[], role: Player['role']): { need: number; reason: string } {
  const buckets = { bat: BATTER_ROLES.includes(role), bowl: BOWLER_ROLES.includes(role), all: ALLROUNDER_ROLES.includes(role) };
  const squadBat = squadPlayers.filter((p) => BATTER_ROLES.includes(p.role)).length;
  const squadBowl = squadPlayers.filter((p) => BOWLER_ROLES.includes(p.role) || ALLROUNDER_ROLES.includes(p.role)).length;
  const slots = Math.max(0, team.maxSquadSize - squadPlayers.length);
  let need = 0.3; const reasons: string[] = [];
  if (buckets.bat && squadBat < 7) { need += 0.3; reasons.push(`only ${squadBat} batters in squad`); }
  if (buckets.bowl && squadBowl < 6) { need += 0.35; reasons.push(`only ${squadBowl} bowling options`); }
  if (buckets.all && squadPlayers.filter((p) => ALLROUNDER_ROLES.includes(p.role)).length < 2) { need += 0.25; reasons.push('few all-rounders'); }
  if (slots <= 2) { need -= 0.2; reasons.push(`only ${slots} squad slot(s) left`); }
  return { need: Math.max(0, Math.min(1, need)), reason: reasons.join('; ') || 'role already covered' };
}

export function valuatePlayer(input: ValuationInput): Valuation {
  const { player, cohort, roleScarcity: scarcity, teamNeed, competitorDemand, history } = input;
  const row = cohort.find((r) => r.player.id === player.id);
  const quality = row ? qualityScoreOf(row) : 40;
  const sample = Math.max(player.batting.balls, player.bowling.balls);
  const sampleReliability = Math.min(1, 0.25 + sample / 500);
  const headroom = ageHeadroom(player.age);

  // Base market curve: quality^1.7 scaled to IPL-ish lakh values (demo calibration).
  const base = 12 + Math.pow(quality / 100, 1.7) * 210;
  const multiplier = 0.72 + scarcity * 0.4 + teamNeed * 0.28 + competitorDemand * 0.22 + headroom * 0.1;
  const fair = base * multiplier * (0.78 + sampleReliability * 0.22);

  const band = 0.16 + (1 - sampleReliability) * 0.22 + (player.age === null ? 0.05 : 0);
  const fairValueLakh = roundTo(fair);
  const range = { low: roundTo(fair * (1 - band)), high: roundTo(fair * (1 + band)) };

  const maxBid = {
    conservative: roundTo(fair * 0.88),
    balanced: roundTo(fair * 1.05),
    aggressive: roundTo(fair * 1.28),
  };

  const comparables = history.filter((h) => {
    const p = h.playerId === player.id ? null : h;
    void p;
    return h.season.includes('DEMO');
  });
  const roleComparable = comparables.filter((h) => {
    return h.basePriceLakh > 0;
  }).map((h) => h.soldPriceLakh).filter((v): v is number => v !== null);
  const soldStats = describe(roleComparable);

  const drivers: Valuation['drivers'] = [
    { label: 'Performance quality', value: `${quality.toFixed(0)}/100 percentile blend`, direction: quality > 60 ? 'up' : quality < 40 ? 'down' : 'neutral' },
    { label: 'Role scarcity', value: `${(scarcity * 100).toFixed(0)}% (${player.role})`, direction: scarcity > 0.6 ? 'up' : 'neutral' },
    { label: 'Your team need', value: `${(teamNeed * 100).toFixed(0)}%`, direction: teamNeed > 0.6 ? 'up' : 'neutral' },
    { label: 'Market competition', value: `${(competitorDemand * 100).toFixed(0)}%`, direction: competitorDemand > 0.6 ? 'up' : 'neutral' },
    { label: 'Age headroom', value: player.age === null ? 'unknown' : `${player.age} yrs → ${(headroom * 100).toFixed(0)}%`, direction: headroom > 0.5 ? 'up' : 'neutral' },
    { label: 'Sample reliability', value: `${(sampleReliability * 100).toFixed(0)}% (${sample} balls)`, direction: sampleReliability > 0.7 ? 'up' : 'down' },
  ];

  return {
    playerId: player.id, name: player.name, role: player.role, age: player.age,
    qualityScore: Number(quality.toFixed(1)),
    sampleReliability: Number(sampleReliability.toFixed(2)),
    scarcityIndex: Number(scarcity.toFixed(2)),
    demandIndex: Number(((scarcity * 0.5 + competitorDemand * 0.3 + teamNeed * 0.2)).toFixed(2)),
    fairValueLakh,
    rangeLakh: range,
    maxBid,
    historicalComparable: {
      n: roleComparable.length,
      medianSold: soldStats.median === null ? null : Number(soldStats.median.toFixed(0)),
      note: roleComparable.length >= 5
        ? `Median of ${roleComparable.length} demo auction outcomes is ₹${soldStats.median?.toFixed(0)}L; the band around fair value widens as sample reliability falls.`
        : 'Too few comparable auction outcomes in this workspace to calibrate against history — value rests on performance evidence alone.',
    },
    drivers,
    caveats: [
      'Fair value is an estimate of worth, not a prediction of the hammer price.',
      'A maximum bid is a strategy decision: it includes what you lose by not signing the player.',
      'Demo auction history is synthetic and is NOT a representation of real IPL prices.',
    ],
  };
}

export function marketOverview(players: Player[], cohort: CohortRow[], teams: Team[], history: AuctionRecord[], allPlayers: Player[], events?: MatchEvent[]) {
  void events;
  const rows = players.map((p) => {
    const squad = allPlayers.filter((x) => x.id === p.id);
    void squad;
    const seller = teams.find((t) => t.isUserTeam)!;
    const squadPlayers = allPlayers.filter((x) => seller.squadIds.includes(x.id));
    const need = teamNeedFor(seller, squadPlayers, p.role).need;
    return valuatePlayer({
      player: p, cohort, roleScarcity: roleScarcity(players, cohort, p.role), teamNeed: need,
      competitorDemand: Math.min(1, 0.25 + (p.confidence > 0.8 ? 0.3 : 0.1) + (p.age !== null && p.age < 23 ? 0.25 : 0.05)),
      history,
    });
  }).sort((a, b) => b.fairValueLakh - a.fairValueLakh);

  const soldHistory = history.filter((h) => h.status === 'sold');
  const baseTiers = [20, 30, 40, 50, 75, 100];
  const tierStats = baseTiers.map((tier) => {
    const inTier = soldHistory.filter((h) => h.basePriceLakh === tier);
    const mults = inTier.map((h) => (h.soldPriceLakh ?? 0) / tier).filter((m) => m > 0);
    return { baseTier: tier, n: inTier.length, medianMultiple: mults.length ? Number(mults.sort((a, b) => a - b)[Math.floor(mults.length / 2)].toFixed(2)) : null };
  });

  return {
    rows,
    roleShortage: Object.fromEntries([...new Set(players.map((p) => p.role))].map((role) => [role, roleScarcity(players, cohort, role as Player['role'])])),
    tierStats,
    method: [
      'fair = (12 + (quality/100)^1.7 × 210) × (0.72 + 0.40·scarcity + 0.28·teamNeed + 0.22·competition + 0.10·ageHeadroom) × (0.78 + 0.22·sampleReliability)',
      'quality = mean of nine role-relevant percentile ranks inside the current cohort',
      'Range = fair × (1 ± band) where band = 0.16 + 0.22·(1 − sampleReliability) + 0.05 when DOB is missing',
      'Values are in ₹ lakh. Demo calibration only — recalibrate against real auction outcomes before production use.',
    ],
  };
}

export function valueRanking(valuations: Valuation[]): { overpriced: Valuation[]; undervalued: Valuation[]; fair: Valuation[] } {
  const med = describe(valuations.map((v) => v.fairValueLakh)).median ?? 0;
  return {
    overpriced: valuations.filter((v) => v.fairValueLakh > med * 1.5),
    undervalued: valuations.filter((v) => v.fairValueLakh < med * 0.6),
    fair: valuations.filter((v) => v.fairValueLakh >= med * 0.6 && v.fairValueLakh <= med * 1.5),
  };
}
