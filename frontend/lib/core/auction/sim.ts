/**
 * Virtual auction room (Feature 11).
 *
 * Simulated franchises are explicit stochastic agents driven by squad needs,
 * remaining purse, role scarcity and alternatives. Their behaviour is a
 * MODEL — it does not represent any real franchise's intentions or information.
 */
import { mulberry32, normal, hashSeed } from '../rng';
import { ALLROUNDER_ROLES, BATTER_ROLES, BOWLER_ROLES, type Player, type Team } from '../types';
import type { Valuation } from './valuation';

export interface SimTeamState {
  teamId: string; name: string; shortName: string; isUserTeam: boolean;
  purseLakh: number; spentLakh: number; slots: number; overseasLeft: number;
  squad: string[]; needs: { role: string; need: number }[];
}

export interface BidEvent { at: string; playerId: string; playerName: string; bidderTeamId: string; amountLakh: number }

export interface AuctionLotResult {
  playerId: string; playerName: string; role: string; basePriceLakh: number;
  status: 'sold' | 'unsold';
  soldToTeamId: string | null; soldToName: string | null; priceLakh: number | null;
  biddingWar: BidEvent[];
  userRecommendation: { action: 'bid' | 'hold' | 'skip'; reason: string; maxBidLakh: number };
}

export interface AuctionSimResult {
  seed: number;
  lots: AuctionLotResult[];
  teams: SimTeamState[];
  userSummary: { signed: number; spent: number; purseLeft: number; slotsLeft: number; roleGaps: string[]; notes: string[] };
  assumptions: string[];
}

const ROLES = ['Opener', 'Top-order Batter', 'Middle-order Batter', 'Finisher', 'Wicketkeeper-Batter', 'Pace Bowler', 'Spin Bowler', 'Pace All-rounder', 'Spin All-rounder', 'All-rounder'];

function needsFor(team: Team, squadPlayers: Player[]): { role: string; need: number }[] {
  return ROLES.map((role) => {
    const bat = BATTER_ROLES.includes(role as Player['role']);
    const bowl = BOWLER_ROLES.includes(role as Player['role']) || ALLROUNDER_ROLES.includes(role as Player['role']);
    const have = squadPlayers.filter((p) => p.role === role).length;
    let need = 0.25;
    if (bat && have === 0) need = 0.9;
    else if (bowl && have < 2) need = 0.85;
    else if (have >= 4) need = 0.05;
    else if (have >= 2) need = 0.4;
    return { role, need };
  });
}

export function simulateAuction(params: {
  players: Player[];
  valuations: Record<string, Valuation>;
  teams: Team[];
  allPlayers: Player[];
  userTeamId: string;
  purseLakh?: number;
  seed?: number;
  aggression?: number;         // 0.7 cautious … 1.3 aggressive (user + market)
  maxLots?: number;
  basePrices?: Record<string, number>;
}): AuctionSimResult {
  const seed = params.seed ?? 2027;
  const rand = mulberry32(seed ^ hashSeed(String(params.userTeamId)));
  const aggression = params.aggression ?? 1;
  const state: SimTeamState[] = params.teams.map((t) => {
    const squadPlayers = params.allPlayers.filter((p) => t.squadIds.includes(p.id));
    return {
      teamId: t.id, name: t.name, shortName: t.shortName, isUserTeam: t.id === params.userTeamId,
      purseLakh: t.id === params.userTeamId && params.purseLakh ? params.purseLakh : t.purseLakh,
      spentLakh: 0,
      slots: Math.max(1, t.maxSquadSize - t.squadIds.length),
      overseasLeft: Math.max(0, t.overseasLimit - squadPlayers.filter((p) => p.overseas).length),
      squad: [...t.squadIds],
      needs: needsFor(t, squadPlayers),
    };
  });

  const queue = [...params.players]
    .sort((a, b) => (params.valuations[b.id]?.fairValueLakh ?? 0) - (params.valuations[a.id]?.fairValueLakh ?? 0))
    .slice(0, params.maxLots ?? 30);

  const lots: AuctionLotResult[] = [];

  for (const player of queue) {
    const valuation = params.valuations[player.id];
    const fair = valuation?.fairValueLakh ?? 40;
    const base = params.basePrices?.[player.id] ?? [20, 20, 30, 40, 50][Math.floor(rand() * 5)];
    let currentBid = 0;
    let leader: SimTeamState | null = null;
    const biddingWar: BidEvent[] = [];
    const increments = (amount: number) => (amount < 50 ? 5 : amount < 100 ? 10 : amount < 200 ? 20 : 25);

    // Each team independently computes its walk-away price for this player.
    const eligible = state.filter((t) => t.slots > 0 && t.purseLakh - t.spentLakh > 0);
    const maxes = new Map<string, number>();
    for (const t of eligible) {
      if (player.overseas && t.overseasLeft <= 0) continue;
      const need = t.needs.find((n) => n.role === player.role)?.need ?? 0.3;
      const alternatives = Math.max(0.2, 1 - need * 0.5);
      const budgetCap = Math.max(0, t.purseLakh - t.spentLakh) * (t.isUserTeam ? 0.55 : 0.4);
      const noise = normal(rand, 1, t.isUserTeam ? 0.03 : 0.14);
      const walkAway = Math.min(budgetCap, fair * (0.55 + need * 0.7) * alternatives * noise * (t.isUserTeam ? aggression : 1));
      if (walkAway > base * 0.9) maxes.set(t.teamId, Math.max(base, walkAway));
    }

    // Ascending bid rounds
    const order = [...maxes.entries()].sort((a, b) => b[1] - a[1]);
    let guard = 0;
    while (order.length && guard++ < 40) {
      const nextAmount = currentBid === 0 ? base : currentBid + increments(currentBid);
      const challenger = order.find(([tid, max]) => max >= nextAmount && tid !== leader?.teamId);
      if (!challenger) break;
      currentBid = nextAmount;
      leader = state.find((t) => t.teamId === challenger[0]) ?? null;
      if (leader) {
        biddingWar.push({ at: new Date(Date.now()).toISOString(), playerId: player.id, playerName: player.name, bidderTeamId: leader.teamId, amountLakh: currentBid });
      }
      order.sort((a, b) => b[1] - a[1]);
    }

    // User guidance computed before the lot is finalised
    const userState = state.find((t) => t.isUserTeam)!;
    const userNeed = userState.needs.find((n) => n.role === player.role)?.need ?? 0.3;
    const purseLeft = userState.purseLakh - userState.spentLakh;
    const maxBidLakh = Math.max(0, Math.min(fair * 1.15, purseLeft * 0.5));
    const recommendation = currentBid === 0
      ? { action: (userNeed > 0.6 ? 'bid' : 'hold') as 'bid' | 'hold', reason: `No bid yet. Role need ${(userNeed * 100).toFixed(0)}%, fair value ₹${fair}L, your ceiling ₹${maxBidLakh.toFixed(0)}L.`, maxBidLakh: Math.round(maxBidLakh) }
      : currentBid <= maxBidLakh * 0.8
        ? { action: 'bid' as const, reason: `Current ₹${currentBid}L is below your ceiling ₹${maxBidLakh.toFixed(0)}L and under fair value ₹${fair}L.`, maxBidLakh: Math.round(maxBidLakh) }
        : currentBid <= maxBidLakh
          ? { action: 'hold' as const, reason: `Current ₹${currentBid}L is at the edge of your ceiling. Bid only if this player is a priority role.`, maxBidLakh: Math.round(maxBidLakh) }
          : { action: 'skip' as const, reason: `Current ₹${currentBid}L exceeds your ceiling ₹${maxBidLakh.toFixed(0)}L. Preserve purse for alternative options.`, maxBidLakh: Math.round(maxBidLakh) };

    if (leader && currentBid > 0) {
      leader.spentLakh += currentBid;
      leader.slots -= 1;
      leader.squad.push(player.id);
      if (player.overseas) leader.overseasLeft -= 1;
    }

    lots.push({
      playerId: player.id, playerName: player.name, role: player.role, basePriceLakh: base,
      status: leader ? 'sold' : 'unsold',
      soldToTeamId: leader?.teamId ?? null,
      soldToName: leader?.name ?? null,
      priceLakh: leader ? currentBid : null,
      biddingWar,
      userRecommendation: recommendation,
    });
  }

  const user = state.find((t) => t.isUserTeam)!;
  const signed = user.squad.length - (params.teams.find((t) => t.id === params.userTeamId)?.squadIds.length ?? 0);
  const roleGaps = ROLES.filter((role) => {
    const need = user.needs.find((n) => n.role === role)?.need ?? 0;
    const bought = lots.filter((l) => l.soldToTeamId === user.teamId && l.role === role).length;
    return need > 0.7 && bought === 0;
  });

  return {
    seed,
    lots,
    teams: state.map((t) => ({ ...t, purseLakh: t.purseLakh - t.spentLakh })),
    userSummary: {
      signed, spent: user.spentLakh, purseLeft: user.purseLakh - user.spentLakh,
      slotsLeft: user.slots, roleGaps,
      notes: [
        'Simulated rivals use visible needs, purse and scarcity only. Real franchises have private information this model cannot know.',
        'Your recommended ceiling is capped at 50% of remaining purse per lot to protect squad completion.',
      ],
    },
    assumptions: [
      `Seeded simulation (seed ${seed}) — rerun with the same seed for identical results.`,
      `Bid increments: ₹5L below ₹50L, ₹10L below ₹100L, ₹20L below ₹200L, else ₹25L.`,
      `Rival walk-away prices are drawn from a noisy function of role need and purse, σ≈14%. Your own valuation uses σ≈3%.`,
      `Aggression multiplier ${aggression.toFixed(2)} applied to your walk-away price.`,
    ],
  };
}
