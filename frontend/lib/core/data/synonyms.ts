/**
 * Column synonym dictionary (Feature 2). Real cricket datasets use wildly
 * different headers; this maps them onto canonical fields without discarding
 * anything it does not recognise.
 */

export type CanonicalField =
  | 'name' | 'dob' | 'age' | 'team' | 'state' | 'role' | 'battingStyle' | 'bowlingType'
  | 'matches' | 'innings' | 'notOuts' | 'runs' | 'balls' | 'fours' | 'sixes' | 'fifties' | 'hundreds'
  | 'highScore' | 'dismissals' | 'bowlingBalls' | 'overs' | 'runsConceded' | 'wickets' | 'maidens'
  | 'catches' | 'stumpings' | 'runOuts' | 'competition' | 'season' | 'format' | 'capped' | 'overseas'
  | 'basePrice' | 'soldPrice' | 'bowlingAverage' | 'economy' | 'strikeRate' | 'battingAverage';

export interface FieldSpec {
  field: CanonicalField;
  label: string;
  synonyms: string[];
  type: 'string' | 'number' | 'date' | 'boolean';
  /** domain validation bounds; outside ⇒ flagged, not silently dropped */
  min?: number;
  max?: number;
  required?: boolean;
}

export const FIELD_SPECS: FieldSpec[] = [
  { field: 'name', label: 'Player name', synonyms: ['player', 'player name', 'name', 'cricketer', 'full name', 'athlete', 'players'], type: 'string', required: true },
  { field: 'dob', label: 'Date of birth', synonyms: ['dob', 'date of birth', 'birth date', 'born', 'd o b', 'birthdate', 'birthday'], type: 'date' },
  { field: 'age', label: 'Age', synonyms: ['age', 'yrs', 'years', 'current age', 'age years', 'age (yrs)'], type: 'number', min: 12, max: 60 },
  { field: 'team', label: 'Team', synonyms: ['team', 'team name', 'club', 'franchise', 'side', 'squad', 'team represented'], type: 'string' },
  { field: 'state', label: 'State / association', synonyms: ['state', 'association', 'domestic team', 'region', 'state team', 'province', 'country'], type: 'string' },
  { field: 'role', label: 'Role', synonyms: ['role', 'player role', 'playing role', 'speciality', 'specialty', 'style', 'category', 'player type'], type: 'string' },
  { field: 'battingStyle', label: 'Batting style', synonyms: ['batting style', 'bat style', 'hand', 'batsman style', 'batting hand'], type: 'string' },
  { field: 'bowlingType', label: 'Bowling type', synonyms: ['bowling style', 'bowling type', 'bowler type', 'bowl style', 'bowling'], type: 'string' },
  { field: 'matches', label: 'Matches', synonyms: ['matches', 'mat', 'm', 'games', 'apps', 'appearances', 'match count'], type: 'number', min: 0, max: 500 },
  { field: 'innings', label: 'Innings', synonyms: ['innings', 'inns', 'inn', 'i'], type: 'number', min: 0, max: 500 },
  { field: 'notOuts', label: 'Not outs', synonyms: ['not outs', 'no', 'notout', 'nots out', 'n o'], type: 'number', min: 0, max: 400 },
  { field: 'runs', label: 'Runs', synonyms: ['runs', 'r', 'run', 'total runs', 'runs scored'], type: 'number', min: 0, max: 30000 },
  { field: 'balls', label: 'Balls faced', synonyms: ['balls', 'b', 'balls faced', 'bf', 'balls consumed', 'deliveries'], type: 'number', min: 0, max: 30000 },
  { field: 'fours', label: 'Fours', synonyms: ['fours', '4s', 'fours hit', 'boundaries four'], type: 'number', min: 0, max: 3000 },
  { field: 'sixes', label: 'Sixes', synonyms: ['sixes', '6s', 'sixes hit'], type: 'number', min: 0, max: 3000 },
  { field: 'fifties', label: 'Fifties', synonyms: ['fifties', '50s', 'fifty', 'half centuries', 'half centuries'], type: 'number', min: 0, max: 500 },
  { field: 'hundreds', label: 'Hundreds', synonyms: ['hundreds', '100s', 'hundred', 'centuries', 'tons'], type: 'number', min: 0, max: 200 },
  { field: 'highScore', label: 'High score', synonyms: ['hs', 'high score', 'best', 'highest score', 'best score'], type: 'number', min: 0, max: 500 },
  { field: 'dismissals', label: 'Dismissals (batting)', synonyms: ['dismissals', 'outs', 'times out', 'dismissed'], type: 'number', min: 0, max: 500 },
  { field: 'overs', label: 'Overs bowled', synonyms: ['overs', 'ov', 'overs bowled', 'o'], type: 'number', min: 0, max: 5000 },
  { field: 'bowlingBalls', label: 'Balls bowled', synonyms: ['balls bowled', 'bb', 'deliveries bowled', 'bowling balls'], type: 'number', min: 0, max: 30000 },
  { field: 'runsConceded', label: 'Runs conceded', synonyms: ['runs conceded', 'rc', 'runs given', 'runs against', 'runs leaked'], type: 'number', min: 0, max: 30000 },
  { field: 'wickets', label: 'Wickets', synonyms: ['wickets', 'wkts', 'w', 'wkt', 'wicket'], type: 'number', min: 0, max: 2000 },
  { field: 'maidens', label: 'Maidens', synonyms: ['maidens', 'mdns', 'maiden overs'], type: 'number', min: 0, max: 500 },
  { field: 'catches', label: 'Catches', synonyms: ['catches', 'ct', 'catch', 'catches taken'], type: 'number', min: 0, max: 800 },
  { field: 'stumpings', label: 'Stumpings', synonyms: ['stumpings', 'st', 'stumped'], type: 'number', min: 0, max: 400 },
  { field: 'runOuts', label: 'Run outs', synonyms: ['run outs', 'ro', 'runout', 'runouts'], type: 'number', min: 0, max: 400 },
  { field: 'competition', label: 'Competition', synonyms: ['competition', 'tournament', 'league', 'series', 'event'], type: 'string' },
  { field: 'season', label: 'Season', synonyms: ['season', 'year', 'tournament year', 'sy'], type: 'string' },
  { field: 'format', label: 'Format', synonyms: ['format', 'match format', 'type', 'game type'], type: 'string' },
  { field: 'capped', label: 'Capped status', synonyms: ['capped', 'is capped', 'international', 'caps', 'capped uncapped'], type: 'boolean' },
  { field: 'overseas', label: 'Overseas status', synonyms: ['overseas', 'foreign', 'import', 'overseas player'], type: 'boolean' },
  { field: 'basePrice', label: 'Base price', synonyms: ['base price', 'reserve price', 'starting price', 'base'], type: 'number', min: 0, max: 2000 },
  { field: 'soldPrice', label: 'Sold price', synonyms: ['sold price', 'price', 'auction price', 'bid', 'final price'], type: 'number', min: 0, max: 3000 },
  { field: 'battingAverage', label: 'Batting average (source)', synonyms: ['batting average', 'avg', 'average', 'ave'], type: 'number', min: 0, max: 200 },
  { field: 'economy', label: 'Economy (source)', synonyms: ['economy', 'econ', 'econ rate', 'rpo'], type: 'number', min: 0, max: 30 },
  { field: 'strikeRate', label: 'Strike rate (source)', synonyms: ['strike rate', 'sr', 'strike rate batting', 's r'], type: 'number', min: 0, max: 400 },
];

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const ta = new Set(a.split(' ').filter(Boolean));
  const tb = new Set(b.split(' ').filter(Boolean));
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  const jaccard = inter / Math.max(1, union);
  // Containment only counts for meaningful substrings: without the length test a
  // one-letter synonym such as "r" (runs) would match any header containing r.
  const shorter = Math.min(a.length, b.length);
  const contains = shorter >= 3 && (a.includes(b) || b.includes(a)) ? 0.8 : 0;
  // Levenshtein-based closeness for typos like "wckts" → "wickets"
  const lev = 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);
  return Math.max(jaccard, contains, lev * 0.85);
}

export function levenshtein(a: string, b: string): number {
  const m = a.length; const n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export interface ColumnMatch { sourceColumn: string; field: CanonicalField | null; confidence: number; spec?: FieldSpec }

export function matchColumn(sourceColumn: string): ColumnMatch {
  const target = norm(sourceColumn);
  let best: { spec: FieldSpec; score: number } | null = null;
  let nearMiss: { spec: FieldSpec; distance: number; length: number } | null = null;
  for (const spec of FIELD_SPECS) {
    for (const syn of [spec.field as string, spec.label, ...spec.synonyms]) {
      const candidate = norm(syn);
      // Abbreviations ("sr", "hs", "rc", "bf", "ct", "no", "ov") only match exactly.
      const exact = target === candidate;
      if (!exact && (candidate.length <= 2 || target.length <= 2)) continue;
      const score = similarity(target, candidate);
      if (!best || score > best.score) best = { spec, score };
      const distance = levenshtein(target, candidate);
      if (distance <= 2 && Math.min(target.length, candidate.length) >= 5) {
        if (!nearMiss || distance < nearMiss.distance) nearMiss = { spec, distance, length: Math.min(target.length, candidate.length) };
      }
    }
  }
  if (best && best.score >= 0.72) return { sourceColumn, field: best.spec.field, confidence: Number(best.score.toFixed(3)), spec: best.spec };
  // A single transposition/typo in a longer header ("Wckts") is mapped, but flagged as low confidence.
  if (nearMiss) return { sourceColumn, field: nearMiss.spec.field, confidence: 0.7, spec: nearMiss.spec };
  return { sourceColumn, field: null, confidence: best ? Number(best.score.toFixed(3)) : 0 };
}

export type DocCategory = 'batting' | 'bowling' | 'combined' | 'ages' | 'matches' | 'venue' | 'auction' | 'other';

/** Classify a cricket document from its filename plus matched headers. */
export function classifyDocument(filename: string, columns: string[]): { category: DocCategory; reason: string; confidence: number } {
  const f = filename.toLowerCase();
  const fields = new Set(columns.map((c) => matchColumn(c).field).filter(Boolean) as CanonicalField[]);
  const hasBat = ['runs', 'balls', 'fours', 'sixes', 'battingAverage', 'strikeRate'].some((x) => fields.has(x as CanonicalField));
  const hasBowl = ['wickets', 'economy', 'runsConceded', 'overs', 'bowlingBalls', 'bowlingAverage'].some((x) => fields.has(x as CanonicalField));
  const hasAge = fields.has('dob') || fields.has('age');
  const hasAuction = fields.has('basePrice') || fields.has('soldPrice') || /auction|bid|purse/.test(f);
  if (hasAuction) return { category: 'auction', reason: 'Auction price columns detected', confidence: 0.9 };
  if (/auction|bid/.test(f)) return { category: 'auction', reason: 'Filename indicates auction data', confidence: 0.6 };
  if (hasBat && hasBowl) return { category: 'combined', reason: 'Both batting and bowling columns detected', confidence: 0.92 };
  if (hasBat && hasAge) return { category: 'combined', reason: 'Batting columns with age/DOB detected', confidence: 0.8 };
  if (hasBat) return { category: 'batting', reason: 'Batting columns detected', confidence: 0.85 };
  if (hasBowl) return { category: 'bowling', reason: 'Bowling columns detected', confidence: 0.85 };
  if (hasAge) return { category: 'ages', reason: 'Age/DOB columns detected', confidence: 0.8 };
  if (/venue|pitch|ground/.test(f)) return { category: 'venue', reason: 'Filename indicates venue data', confidence: 0.6 };
  if (/scorecard|match|fixture/.test(f)) return { category: 'matches', reason: 'Filename indicates match data', confidence: 0.55 };
  return { category: 'other', reason: 'No recognised cricket statistics columns', confidence: 0.35 };
}

export function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const s = String(raw).trim();
  if (!s || /^(nan|null|n\/a|-|–|—|na)$/i.test(s)) return null;
  const cleaned = s.replace(/[,%*†]/g, '').replace(/\s+/g, '');
  const v = Number(cleaned);
  return Number.isFinite(v) ? v : null;
}

export function parseBool(raw: unknown): boolean | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'capped', 'overseas', 'foreign'].includes(s)) return true;
  if (['false', 'no', 'n', '0', 'uncapped', 'domestic', 'indian'].includes(s)) return false;
  return null;
}

/** Accepts 1998-04-12, 12/04/1998, 04/12/1998 flagged ambiguous, and Excel serials. */
export function parseDate(raw: unknown): { iso: string | null; ambiguous: boolean; note?: string } {
  if (raw === null || raw === undefined) return { iso: null, ambiguous: false };
  if (typeof raw === 'number' && raw > 1000 && raw < 60000) {
    const ms = Math.round((raw - 25569) * 86400 * 1000);
    return { iso: new Date(ms).toISOString().slice(0, 10), ambiguous: false, note: 'Excel serial date converted' };
  }
  const s = String(raw).trim();
  if (!s) return { iso: null, ambiguous: false };
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? { iso: null, ambiguous: false } : { iso: d.toISOString().slice(0, 10), ambiguous: false };
  }
  const parts = s.split(/[\/.\- ]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 3) {
    const nums = parts.map((p) => Number(p));
    if (nums.every((n) => Number.isFinite(n))) {
      const [a, b, c] = nums;
      // The third group is the year in every format we accept (d/m/y, m/d/y, y/m/d handled above).
      const year = c < 100 ? (c > 50 ? 1900 + c : 2000 + c) : c;
      const build = (day: number, month: number): string | null => {
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        const d = new Date(Date.UTC(year, month - 1, day));
        // reject rollovers such as 31/02 → 03/03
        if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
        return d.toISOString().slice(0, 10);
      };
      const dayFirstIso = build(a, b);
      const monthFirstIso = build(b, a);
      const ambiguous = a <= 12 && b <= 12;
      const chosen = a > 12 ? dayFirstIso : monthFirstIso;
      if (chosen) {
        return {
          iso: chosen,
          ambiguous,
          note: ambiguous ? `Day/month order ambiguous: read as ${chosen} (month-first). Confirm the intended date.` : undefined,
        };
      }
    }
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return { iso: parsed.toISOString().slice(0, 10), ambiguous: false };
  return { iso: null, ambiguous: false, note: 'Unparseable date string' };
}

export function computeAge(dobIso: string | null, referenceDate: string): number | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso); const ref = new Date(referenceDate);
  if (Number.isNaN(dob.getTime()) || Number.isNaN(ref.getTime())) return null;
  let age = ref.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday = ref.getUTCMonth() < dob.getUTCMonth() || (ref.getUTCMonth() === dob.getUTCMonth() && ref.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 90 ? age : null;
}

export function normaliseName(name: string): string {
  return name.toLowerCase().replace(/\b(mr|ms|dr|jr|sr)\b/g, '').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Strips single initials so "A. Deshmukh" and "Aarav Deshmukh" can be compared. */
export function nameKey(name: string): string {
  const parts = normaliseName(name).split(' ').filter((p) => p.length > 1);
  return parts.join(' ');
}
