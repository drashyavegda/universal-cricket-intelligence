/**
 * Natural-language → structured analytics (Feature 27).
 * A deterministic rule-based parser runs first so the assistant works with zero
 * configuration; an LLM may later rephrase the answer, never compute it.
 */
import type { Player, PlayerRole } from '../types';
import { STRATEGY_PRESETS } from '../ranking/presets';

export type Intent =
  | 'rank_players' | 'compare_players' | 'explain_player' | 'find_role' | 'squad_analysis'
  | 'auction_value' | 'pitch' | 'workload' | 'prediction' | 'report' | 'write_action' | 'help' | 'unknown';

export interface ParsedQuery {
  intent: Intent;
  players: string[];
  role: PlayerRole | null;
  maxAge: number | null;
  minAge: number | null;
  preset: string | null;
  filters: Record<string, number>;
  language: 'en' | 'hi' | 'gu';
  confidence: number;
  interpretation: string;
  suggestions: string[];
}

const ROLE_HINTS: { re: RegExp; role: PlayerRole }[] = [
  { re: /(opener|opening bat)/i, role: 'Opener' },
  { re: /(finisher|power hitter|death hitter)/i, role: 'Finisher' },
  { re: /(wicket ?keeper|keeper)/i, role: 'Wicketkeeper-Batter' },
  { re: /(spinner|spin bowler|slow bowler)/i, role: 'Spin Bowler' },
  { re: /(fast bowler|pacer|pace bowler|seamer)/i, role: 'Pace Bowler' },
  { re: /(all[- ]?rounder)/i, role: 'All-rounder' },
  { re: /(middle[- ]order)/i, role: 'Middle-order Batter' },
  { re: /(top[- ]order)/i, role: 'Top-order Batter' },
];

const HI_GU = {
  hi: [/बल्लेबाज|गेंदबाज|युवा|सर्वश्रेष्ठ|तुलना|स्पिनर/i],
  gu: [/બેટ્સમેન|બોલર|યુવા|શ્રેષ્ઠ|સરખામણી|સ્પિનર/i],
};

export function parseQuery(query: string, knownNames: string[]): ParsedQuery {
  const q = query.trim();
  const language: ParsedQuery['language'] = HI_GU.gu.some((re) => re.test(q)) ? 'gu' : HI_GU.hi.some((re) => re.test(q)) ? 'hi' : 'en';
  const players = knownNames.filter((n) => q.toLowerCase().includes(n.toLowerCase())).slice(0, 6);

  const ageMatch = q.match(/under[- ]?(\d{2})|u[- ]?(\d{2})|below (\d{2})|younger than (\d{2})/i);
  const maxAge = ageMatch ? Number(ageMatch[1] ?? ageMatch[2] ?? ageMatch[3] ?? ageMatch[4]) : null;
  const betweenMatch = q.match(/between (\d{2}) and (\d{2})/i);
  const minAge = betweenMatch ? Number(betweenMatch[1]) : null;

  const role = ROLE_HINTS.find((r) => r.re.test(q))?.role ?? null;
  const preset = STRATEGY_PRESETS.find((p) => q.toLowerCase().includes(p.label.toLowerCase().split(' ')[0]))?.key ?? null;

  const econMatch = q.match(/economy (?:under|below) ([\d.]+)/i);
  const srMatch = q.match(/strike rate (?:above|over|of) ([\d.]+)/i);
  const filters: Record<string, number> = {};
  if (econMatch) filters.maxEconomy = Number(econMatch[1]);
  if (srMatch) filters.minStrikeRate = Number(srMatch[1]);

  let intent: Intent = 'unknown';
  if (/compare|versus|vs\.?\b/i.test(q) && players.length >= 2) intent = 'compare_players';
  else if (/explain|why is|why does|reason for/i.test(q) && players.length >= 1) intent = 'explain_player';
  // Write-style verbs are detected early so the assistant can ask for confirmation
  // instead of silently answering a read-only question and looking like it saved something.
  else if (/\b(save|approve|reject|delete|remove|create|update|submit|persist|write|commit)\b/i.test(q)) intent = 'write_action';
  else if (/auction|bid|value|price|purse/i.test(q)) intent = 'auction_value';
  else if (/pitch|venue|toss|dew|surface/i.test(q)) intent = 'pitch';
  else if (/workload|fatigue|rest|rotation|injur/i.test(q)) intent = 'workload';
  else if (/predict|simulate|who will win|win probability/i.test(q)) intent = 'prediction';
  else if (/report|pdf|presentation|export|summary/i.test(q)) intent = 'report';
  else if (/squad|team balance|weakness|playing xi|line-?up/i.test(q)) intent = 'squad_analysis';
  else if (/best|top|find|show|list|young|cheap|hidden/i.test(q)) intent = 'rank_players';
  if (/help|what can you do|how do i/i.test(q)) intent = 'help';

  const confidence = Math.min(0.95, 0.4 + (intent !== 'unknown' ? 0.3 : 0) + (role ? 0.1 : 0) + (players.length ? 0.1 : 0) + (maxAge ? 0.05 : 0));

  const interpretation = [
    intent === 'rank_players' ? 'Rank players' : intent === 'compare_players' ? `Compare ${players.join(' vs ')}` : intent === 'explain_player' ? `Explain ${players[0]}'s ranking` : intent === 'auction_value' ? 'Estimate auction value and ceiling bid' : intent === 'pitch' ? 'Analyse pitch/venue conditions' : intent === 'workload' ? 'Assess workload and rotation risk' : intent === 'prediction' ? 'Run a match simulation' : intent === 'squad_analysis' ? 'Analyse squad balance' : intent === 'report' ? 'Prepare a report' : intent === 'write_action' ? 'A consequential write action is being requested' : intent === 'help' ? 'Explain capabilities' : 'Not recognised',
    role ? `role = ${role}` : null,
    maxAge ? `age ≤ ${maxAge}` : null,
    minAge ? `age ≥ ${minAge}` : null,
    filters.maxEconomy ? `economy ≤ ${filters.maxEconomy}` : null,
    filters.minStrikeRate ? `strike rate ≥ ${filters.minStrikeRate}` : null,
  ].filter(Boolean).join(' · ');

  return {
    intent, players, role, maxAge, minAge, preset, filters, language,
    confidence: Number(confidence.toFixed(2)),
    interpretation,
    suggestions: [
      'Find the best young batters under 21',
      'Compare three fast bowlers',
      'Show economical spinners',
      'What is the auction value of my top target?',
      'Which pitch suits spin at Chepauk?',
    ],
  };
}

export interface AssistantAnswer {
  query: string;
  parsed: ParsedQuery;
  answer: string;
  evidence: { label: string; value: string; source?: string }[];
  actions: { label: string; href: string }[];
  followUps: string[];
  confirmRequired: boolean;
  confirmationPrompt?: string;
  aiMode?: string;
  aiNote?: string;
}

export function buildHelp(): AssistantAnswer {
  return {
    query: 'help',
    parsed: { intent: 'help', players: [], role: null, maxAge: null, minAge: null, preset: null, filters: {}, language: 'en', confidence: 1, interpretation: 'capabilities', suggestions: [] },
    answer: 'I can rank and filter players, compare squads, explain rankings, value players for an auction, analyse pitches and workloads, simulate matches, and prepare reports. I only ever quote statistics computed by this platform — I will not invent a number, a player or a source.',
    evidence: [
      { label: 'Ranking', value: 'Weighted percentile engine with sensitivity analysis' },
      { label: 'Auction', value: 'Deterministic valuation + strategy ceiling bids' },
      { label: 'Simulation', value: '5,000-run Monte Carlo, seeded and reproducible' },
    ],
    actions: [{ label: 'Open Talent Discovery', href: '/talent' }, { label: 'Open Auction Command Centre', href: '/auction' }],
    followUps: ['Find the best young batters under 21', 'Show economical spinners'],
    confirmRequired: false,
  };
}

export const nlqRoleLabels: Record<string, string> = { Opener: 'openers', Finisher: 'finishers', 'Spin Bowler': 'spinners', 'Pace Bowler': 'pacers' };

export function summarisePlayers(players: Player[]): string {
  return players.slice(0, 5).map((p) => `${p.name} (${p.age ?? 'age n/a'}, ${p.role})`).join('; ');
}
