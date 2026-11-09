/**
 * Typed route constants.
 *
 * Why: string literals scattered across the app drift (`/player/` vs `/players/`) and break
 * breadcrumbs. These constants mirror the real App Router tree; if a route changes, this file and
 * `lib/site.ts` change together.
 */

export const PUBLIC_ROUTES = {
  home: '/',
  tour: '/tour',
  faq: '/faq',
  privacy: '/privacy',
  testimonials: '/testimonials',
  contact: '/contact',
  thankYou: '/thank-you',
  login: '/login',
} as const;

export const WORKSPACE_ROUTES = {
  dashboard: '/dashboard',
  data: '/data',
  players: '/players',
  talent: '/talent',
  compare: '/compare',
  stats: '/stats',
  team: '/team',
  xi: '/xi',
  auction: '/auction',
  match: '/match',
  pitch: '/pitch',
  opposition: '/opposition',
  prediction: '/prediction',
  scouting: '/scouting',
  workload: '/workload',
  research: '/research',
  assistant: '/assistant',
  automation: '/automation',
  reports: '/reports',
  settings: '/settings',
} as const;

export const playerPath = (id: string): string => `/players/${encodeURIComponent(id)}`;

/** Comparison link with pre-selected players (the compare page reads `?ids=a,b,c`). */
export const comparePath = (ids: string[] = []): string =>
  ids.length ? `/compare?ids=${ids.map(encodeURIComponent).join(',')}` : '/compare';

export const loginPath = (next?: string): string =>
  next && next.startsWith('/') ? `/login?next=${encodeURIComponent(next)}` : '/login';

export const contactPath = (kind?: string): string => (kind ? `/contact?kind=${encodeURIComponent(kind)}` : '/contact');

export const ALL_ROUTES: string[] = [...Object.values(PUBLIC_ROUTES), ...Object.values(WORKSPACE_ROUTES)];
