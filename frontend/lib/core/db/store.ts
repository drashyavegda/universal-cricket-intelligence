/**
 * Persistence.
 *
 * Demo mode (default): a single JSON document store on disk at DATA_DIR.
 * Production: the same repository interface is backed by PostgreSQL — see
 * db/migrations/0001_init.sql. The application never requires a database to run,
 * so a fresh clone works with zero configuration and no paid services.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AuctionRecord, AuditEntry, Dataset, DatasetRecord, KnowledgeDoc, Match, Notification, PlatformSettings,
  Player, SavedReport, Session, Shortlist, SourceRecord, Team, User, Venue, WeatherObservation, WorkflowRun, AiUsageEntry,
  Testimonial, FeedbackSubmission,
} from '../types';
import {
  generateAuction, generateDemoDatasets, generateKnowledge, generateMatches, generatePlayers, generateSources,
  generateTeams, generateVenues, generateWeather, seedTestimonials,
} from './seed';
import { hashPassword } from '../auth/crypto';

export const DEFAULT_REFERENCE_DATE = '2027-04-01';

export interface StoreShape {
  version: number;
  createdAt: string;
  players: Player[];
  venues: Venue[];
  weather: WeatherObservation[];
  teams: Team[];
  matches: Match[];
  auctions: AuctionRecord[];
  datasets: Dataset[];
  records: DatasetRecord[];
  sources: SourceRecord[];
  knowledge: KnowledgeDoc[];
  shortlists: Shortlist[];
  reports: SavedReport[];
  workflowRuns: WorkflowRun[];
  notifications: Notification[];
  users: User[];
  sessions: Session[];
  audit: AuditEntry[];
  aiUsage: AiUsageEntry[];
  settings: PlatformSettings;
  testimonials: Testimonial[];
  feedback: FeedbackSubmission[];
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

declare global {
  // eslint-disable-next-line no-var
  var __ucipStore: StoreShape | undefined;
}

export function defaultSettings(): PlatformSettings {
  return {
    referenceDate: process.env.REFERENCE_DATE || DEFAULT_REFERENCE_DATE,
    demoMode: (process.env.DEMO_MODE ?? 'true') !== 'false',
    ai: {
      provider: (process.env.AI_PROVIDER as PlatformSettings['ai']['provider']) || 'demo',
      baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 900,
      monthlyBudgetUsd: Number(process.env.AI_MONTHLY_BUDGET_USD || 15),
      rateLimitPerMinute: Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 20),
      hasApiKey: Boolean(process.env.AI_API_KEY),
    },
    limits: { maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 25), maxRowsPerDataset: Number(process.env.MAX_ROWS_PER_DATASET || 25000), pageSize: 25 },
    security: { require2faForAdmins: false, sessionMinutes: 720, passwordMinLength: 10, promptInjectionGuard: true },
    language: 'en',
  };
}

function bootstrap(): StoreShape {
  const settings = defaultSettings();
  const players = generatePlayers(190, 20270401, settings.referenceDate);
  const venues = generateVenues();
  const teams = generateTeams(players);
  const matches = generateMatches(players, venues, teams);
  const demoDataset = generateDemoDatasets(players);
  const users: User[] = [
    { email: 'owner@demo.local', name: 'Demo Owner', role: 'owner', password: 'Demo#12345' },
    { email: 'analyst@demo.local', name: 'Demo Analyst', role: 'analyst', password: 'Analyst#12345' },
    { email: 'scout@demo.local', name: 'Demo Scout', role: 'scout', password: 'Scout#12345' },
    { email: 'viewer@demo.local', name: 'Demo Viewer', role: 'viewer', password: 'Viewer#12345' },
  ].map((u, i) => {
    const { hash, salt } = hashPassword(u.password);
    return {
      id: `usr_${i + 1}`, email: u.email, name: u.name, passwordHash: hash, salt,
      role: u.role as User['role'], twoFactorEnabled: false, twoFactorSecret: null,
      organisationId: 'org_demo', createdAt: new Date('2026-01-01').toISOString(),
      lastLoginAt: null, failedLogins: 0, lockedUntil: null,
    };
  });

  const payload: StoreShape = {
    version: 1,
    createdAt: new Date().toISOString(),
    players, venues,
    weather: generateWeather(venues),
    teams, matches,
    auctions: generateAuction(players),
    datasets: [demoDataset.dataset],
    records: demoDataset.records,
    sources: generateSources(),
    knowledge: generateKnowledge(),
    shortlists: [],
    reports: [],
    workflowRuns: [],
    notifications: [
      { id: 'ntf_1', at: new Date('2027-04-01T06:00:00Z').toISOString(), level: 'info', title: 'Demo workspace ready', body: 'You are in DEMO MODE with synthetic data. Upload your official competition dataset in the Data Centre to analyse real records.', read: false, href: '/data' },
      { id: 'ntf_2', at: new Date('2027-04-01T06:05:00Z').toISOString(), level: 'warn', title: 'No AI key configured', body: 'AI features run in deterministic demo mode. Add an OpenAI-compatible key in Settings → AI Provider to enable live narration.', read: false, href: '/settings' },
      { id: 'ntf_3', at: new Date('2027-04-01T06:10:00Z').toISOString(), level: 'success', title: 'RR Scouting workspace enabled', body: 'Age filters and uncapped-eligibility checks are pre-configured for the IPL 2027 uncapped domestic brief.', read: false, href: '/talent' },
    ],
    users,
    sessions: [],
    audit: [{ id: 'aud_0', at: new Date().toISOString(), actor: 'system', action: 'bootstrap', entity: 'platform', entityId: 'demo', detail: 'Seed dataset generated with synthetic records' }],
    aiUsage: [],
    settings,
    testimonials: seedTestimonials(),
    feedback: [],
  };
  return payload;
}

export function getStore(): StoreShape {
  if (globalThis.__ucipStore) return globalThis.__ucipStore;
  let store: StoreShape;
  try {
    if (fs.existsSync(STORE_FILE)) {
      store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) as StoreShape;
      const settings = defaultSettings();
      store.settings = { ...settings, ...store.settings, limits: { ...settings.limits, ...store.settings.limits }, security: { ...settings.security, ...store.settings.security }, ai: { ...store.settings.ai, hasApiKey: Boolean(process.env.AI_API_KEY) } };
      // Forward-compatible migration for stores written before the growth module.
      if (!Array.isArray(store.testimonials)) store.testimonials = seedTestimonials();
      if (!Array.isArray(store.feedback)) store.feedback = [];
    } else {
      store = bootstrap();
      persist(store);
    }
  } catch {
    store = bootstrap();
  }
  globalThis.__ucipStore = store;
  return store;
}

export function persist(store: StoreShape = getStore()): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${STORE_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store));
    fs.renameSync(tmp, STORE_FILE);
  } catch (e) {
    console.error('[store] persist failed', e);
  }
}

/** Mutate the store and flush to disk. */
export function update<T>(fn: (s: StoreShape) => T): T {
  const s = getStore();
  const result = fn(s);
  persist(s);
  return result;
}

export function resetStore(): void {
  const s = bootstrap();
  globalThis.__ucipStore = s;
  persist(s);
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export function audit(entry: Omit<AuditEntry, 'id' | 'at'>): void {
  update((s) => {
    s.audit.unshift({ id: newId('aud'), at: new Date().toISOString(), ...entry });
    if (s.audit.length > 2000) s.audit.length = 2000;
  });
}

export function notify(n: Omit<Notification, 'id' | 'at' | 'read'>): void {
  update((s) => {
    s.notifications.unshift({ id: newId('ntf'), at: new Date().toISOString(), read: false, ...n });
    if (s.notifications.length > 200) s.notifications.length = 200;
  });
}

export const storeFile = STORE_FILE;
export const dataDir = DATA_DIR;
