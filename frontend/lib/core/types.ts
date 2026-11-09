/**
 * Universal Cricket Intelligence Platform — canonical domain model.
 * Every module (ranking, auction, simulation, reporting) reads the same shapes,
 * so an uploaded dataset and the demo dataset are interchangeable.
 */

export type Format = 'T20' | 'T10' | 'ODI' | 'Test' | 'ListA' | 'FirstClass' | 'Unknown';

export type PlayerRole =
  | 'Opener'
  | 'Top-order Batter'
  | 'Middle-order Batter'
  | 'Finisher'
  | 'Wicketkeeper-Batter'
  | 'Pace Bowler'
  | 'Spin Bowler'
  | 'Pace All-rounder'
  | 'Spin All-rounder'
  | 'All-rounder';

export const BATTER_ROLES: PlayerRole[] = ['Opener', 'Top-order Batter', 'Middle-order Batter', 'Finisher', 'Wicketkeeper-Batter'];
export const BOWLER_ROLES: PlayerRole[] = ['Pace Bowler', 'Spin Bowler'];
export const ALLROUNDER_ROLES: PlayerRole[] = ['Pace All-rounder', 'Spin All-rounder', 'All-rounder'];

export interface BattingStats {
  matches: number;
  innings: number;
  notOuts: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  highScore: number;
  dismissals: number;
}

export interface BowlingStats {
  matches: number;
  innings: number;
  balls: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  bestWickets: number;
  bestRuns: number;
}

export interface FieldingStats {
  catches: number;
  runOuts: number;
  stumpings: number;
}

export interface PhaseLine {
  balls: number;
  runs: number;
  wickets: number;
  dismissals: number;
}

export interface PhaseSplit {
  powerplay: PhaseLine;
  middle: PhaseLine;
  death: PhaseLine;
}

export interface MatchPerf {
  matchId: string;
  date: string;
  opponent: string;
  venue: string;
  format: Format;
  runs: number;
  ballsFaced: number;
  notOut: boolean;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  catches: number;
}

export interface SeasonStat {
  season: string;
  competition: string;
  age: number;
  matches: number;
  runs: number;
  balls: number;
  innings: number;
  notOuts: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  economy: number;
  strikeRate: number;
}

export interface Provenance {
  sourceId: string;
  sourceName: string;
  field: string;
  value: string;
  kind?: 'uploaded' | 'external' | 'demo' | 'manual';
  fetchedAt: string;
  reliability: number;
}

export interface Player {
  id: string;
  name: string;
  /** ISO date string, null when genuinely unknown — never fabricated. */
  dob: string | null;
  /** Age computed at the workspace reference date; null when dob missing. */
  age: number | null;
  team: string;
  state: string;
  competition: string;
  season: string;
  format: Format;
  role: PlayerRole;
  battingStyle: 'Right-hand bat' | 'Left-hand bat' | 'Unknown';
  bowlingType: 'Pace' | 'Spin' | 'None';
  capped: boolean;
  overseas: boolean;
  wicketkeeper: boolean;
  batting: BattingStats;
  bowling: BowlingStats;
  fielding: FieldingStats;
  phaseBatting: PhaseSplit;
  phaseBowling: PhaseSplit;
  matchLog: MatchPerf[];
  career: SeasonStat[];
  /** 0..1 estimate of how trustworthy this record is */
  confidence: number;
  /** true when the record is synthetic demo data */
  synthetic: boolean;
  sources: Provenance[];
  unknownFields?: Record<string, string>;
  notes?: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  /** historical first innings average score in T20 */
  avgFirstInnings: number;
  avgSecondInnings: number;
  paceWicketShare: number;
  spinWicketShare: number;
  boundaryRate: number;
  /** -1 (spin friendly) .. +1 (pace friendly) */
  paceBias: number;
  dewRisk: number;
  chaseWinRate: number;
  sampleMatches: number;
  pitch: {
    paceRating: number;
    bounceRating: number;
    seamRating: number;
    spinRating: number;
    battingFriendliness: number;
    surfaceSpeed: number;
    twoPaced: number;
    deterioration: number;
  };
}

export interface WeatherObservation {
  venueId: string;
  date: string;
  temperatureC: number;
  humidityPct: number;
  windKph: number;
  cloudCoverPct: number;
  rainProbability: number;
  dewExpected: boolean;
  source: 'demo' | 'manual' | 'uploaded' | 'forecast-api';
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  competition: string;
  isUserTeam: boolean;
  purseLakh: number;
  squadIds: string[];
  overseasLimit: number;
  maxSquadSize: number;
  colours: string;
}

export interface MatchEvent {
  matchId: string;
  innings: 1 | 2;
  over: number;
  ball: number;
  batterId: string;
  bowlerId: string;
  runs: number;
  isWicket: boolean;
  isBoundary: boolean;
}

export interface Match {
  id: string;
  date: string;
  format: Format;
  competition: string;
  venueId: string;
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  homeWickets: number;
  awayWickets: number;
  winnerId: string | null;
  tossWinnerId: string;
  tossDecision: 'bat' | 'bowl';
  scorecard: { playerId: string; runs: number; balls: number; wickets: number; ballsBowled: number; runsConceded: number }[];
  events: MatchEvent[];
}

export interface AuctionRecord {
  id: string;
  playerId: string;
  season: string;
  basePriceLakh: number;
  soldPriceLakh: number | null;
  status: 'sold' | 'unsold' | 'demo';
  buyerTeamId: string | null;
  synthetic: boolean;
}

export interface DatasetRecord {
  id: string;
  datasetId: string;
  playerName: string;
  fields: Record<string, string | number | null>;
  mapped: Partial<Player> & { name?: string };
  confidence: number;
  issues: { field: string; severity: 'info' | 'warn' | 'error'; message: string }[];
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  sourceRow: number;
  unknownFields: Record<string, string>;
  updatedAt: string;
  version: number;
}

export interface DatasetFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  duplicateOf?: string;
  extraction: 'csv' | 'xlsx' | 'json' | 'pdf-text' | 'pdf-ocr' | 'text' | 'failed';
  extractedText?: string;
  warnings: string[];
  pages?: number;
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  category: 'batting' | 'bowling' | 'combined' | 'ages' | 'matches' | 'venue' | 'auction' | 'other';
  format: Format;
  competition: string;
  season: string;
  kind: 'uploaded' | 'demo' | 'external';
  status: 'processing' | 'needs_review' | 'approved' | 'failed';
  rowCount: number;
  recordCount: number;
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
  files: DatasetFile[];
  mappingSummary: { canonical: string; sourceColumn: string; matched: number; confidence: number }[];
  notes: string;
}

export interface SourceRecord {
  id: string;
  name: string;
  kind: 'official-board' | 'tournament-site' | 'licensed-api' | 'scorecard' | 'database' | 'upload' | 'demo';
  reliability: number;
  licence: string;
  lastSyncedAt: string | null;
  notes: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  ip?: string;
}

export interface Notification {
  id: string;
  at: string;
  level: 'info' | 'success' | 'warn' | 'error';
  title: string;
  body: string;
  read: boolean;
  href?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  role: 'owner' | 'analyst' | 'scout' | 'viewer';
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  organisationId: string;
  createdAt: string;
  lastLoginAt: string | null;
  failedLogins: number;
  lockedUntil: string | null;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ip: string;
  userAgent: string;
}

export interface Shortlist {
  id: string;
  name: string;
  kind: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'draft' | 'approved' | 'archived';
  entries: { playerId: string; rank: number; priority: 'P1' | 'P2' | 'P3' | 'backup'; note: string; score: number; rationale: string }[];
  versions: { at: string; label: string; snapshot: string }[];
  filters: Record<string, unknown>;
}

export interface SavedReport {
  id: string;
  title: string;
  type: 'player' | 'team' | 'auction' | 'match' | 'opposition' | 'pitch' | 'statistical' | 'talent';
  language: 'en' | 'hi' | 'gu';
  createdAt: string;
  createdBy: string;
  subjectId: string;
  sections: ReportSection[];
  quality: { score: number; checks: { name: string; passed: boolean; detail: string }[]; issues: string[] };
  /** Every evidence source cited by this report, de-duplicated. */
  sources: string[];
  version: number;
}

export interface ReportSection {
  heading: string;
  body: string;
  evidence: { label: string; value: string; source: string }[];
  chart?: { type: 'bar' | 'line' | 'radar'; data: { name: string; value: number }[]; caption: string };
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  kind: 'player' | 'team' | 'competition' | 'venue' | 'strategy' | 'research' | 'auction' | 'talent' | 'statistical' | 'prediction' | 'workload' | 'data';
  tags: string[];
  body: string;
  sourceId: string;
  createdAt: string;
  updatedAt: string;
  entities: string[];
  chunks: { id: string; text: string; tokens: number }[];
  duplicates: string[];
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  goal: string;
  status: 'queued' | 'running' | 'awaiting_approval' | 'completed' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  steps: {
    id: string;
    agent: string;
    title: string;
    status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
    detail: string;
    dependsOn: string[];
    startedAt?: string;
    finishedAt?: string;
    output?: string;
  }[];
  cost: { tokens: number; usd: number };
  approvedBy: string | null;
}

export interface AiUsageEntry {
  id: string;
  at: string;
  provider: string;
  model: string;
  purpose: string;
  promptTokens: number;
  completionTokens: number;
  usd: number;
  status: 'ok' | 'error' | 'demo' | 'blocked';
  detail?: string;
}

export interface PlatformSettings {
  referenceDate: string;
  demoMode: boolean;
  ai: {
    provider: 'openai-compatible' | 'anthropic' | 'local' | 'demo';
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
    monthlyBudgetUsd: number;
    rateLimitPerMinute: number;
    /** key is stored only in the server env / encrypted store, never returned to the client */
    hasApiKey: boolean;
  };
  limits: { maxUploadMb: number; maxRowsPerDataset: number; pageSize: number };
  security: { require2faForAdmins: boolean; sessionMinutes: number; passwordMinLength: number; promptInjectionGuard: boolean };
  language: 'en' | 'hi' | 'gu';
}

export interface Counted<T> { value: T; count: number }

/* ------------------------------------------------------------------ */
/* Growth & trust module (SEO, public forms, testimonials, feedback)   */
/* ------------------------------------------------------------------ */

export type TestimonialStatus = 'draft' | 'published' | 'hidden';

export interface Testimonial {
  id: string;
  /** Display name of the person quoted. Never invented by the platform. */
  name: string;
  role: string;
  organisation: string;
  quote: string;
  /** Optional profile image URL. Validated as https or a same-origin path. */
  imageUrl: string | null;
  /** 1–5, optional. Omitted rather than faked when not provided. */
  rating: number | null;
  status: TestimonialStatus;
  /**
   * True when the record is illustrative demo content. Sample rows are shown with a
   * visible "Sample content" badge and are excluded from FAQ/Review structured data.
   */
  sample: boolean;
  /** Where the testimonial came from: 'demo-seed' | 'manual' | 'feedback-form'. */
  source: 'demo-seed' | 'manual' | 'feedback-form';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type FeedbackKind = 'question' | 'feedback' | 'bug' | 'data-issue' | 'deletion-request';

export interface FeedbackSubmission {
  id: string;
  /** Human reference shown on the thank-you page, e.g. FB-8H3K2Q. */
  reference: string;
  kind: FeedbackKind;
  name: string;
  email: string;
  organisation: string | null;
  message: string;
  /** Optional path of the page the report was filed from. */
  pageUrl: string | null;
  consent: boolean;
  status: 'new' | 'acknowledged' | 'closed';
  createdAt: string;
  /** Truncated, hashed-away client context; never the full address. */
  ipHint: string;
  userAgentHint: string;
  /** Spam-scoring decisions recorded for auditability. */
  spamChecks: string[];
}
