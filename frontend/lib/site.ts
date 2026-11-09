/**
 * Site-wide constants and the page metadata registry.
 *
 * Everything SEO-facing (titles, descriptions, canonical paths, sitemap order) is
 * declared here exactly once, so a page can never ship a duplicate or missing
 * title and the tests can assert uniqueness in a single place.
 */

export const SITE = {
  name: 'UCIP',
  legalName: 'Universal Cricket Intelligence Platform',
  tagline: 'Cricket analytics, scouting & auction strategy',
  description:
    'Universal Cricket Intelligence Platform: deterministic cricket analytics, scouting shortlists, opponent intelligence and auction strategy with explainable AI narration.',
  locale: 'en_IN',
  language: 'en',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@cricket-intelligence.example',
  twitter: process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@ucip_analytics',
  themeColour: '#0A1020',
  /** Canonical origin. Set NEXT_PUBLIC_SITE_URL on the hosting provider. */
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  keywords: [
    'cricket analytics platform',
    'cricket scouting software',
    'T20 player analytics',
    'IPL auction strategy',
    'cricket data analysis',
    'player comparison analytics',
    'pitch and venue intelligence',
    'cricket team selection XI optimiser',
  ],
} as const;

export interface PageMetaEntry {
  /** Route path, always leading-slash, no trailing slash. */
  path: string;
  /** <title>. Kept under 60 characters so it is not truncated in search results. */
  title: string;
  /** Meta description. Unique per page, 70–158 characters. */
  description: string;
  /** Included in the XML sitemap. */
  indexable: boolean;
  sitemapPriority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Grouping used by the public footer and the 404 page. */
  group: 'Public' | 'App' | 'Legal' | 'Auth';
}

/**
 * Public, indexable pages. Private workspace routes are listed separately below and
 * are never added to the sitemap.
 */
export const PUBLIC_PAGES: PageMetaEntry[] = [
  {
    path: '/',
    title: 'Cricket Analytics, Scouting & Auction Intelligence Platform',
    description:
      'Analyse players, build XI combinations, model auctions and forecast matches with deterministic cricket analytics and explainable AI. Upload your own datasets.',
    indexable: true,
    sitemapPriority: 1,
    changeFrequency: 'weekly',
    group: 'Public',
  },
  {
    path: '/tour',
    title: 'Platform Tour — 30 Analytics Modules Explained',
    description:
      'Explore every module: data ingestion, talent discovery, player comparison, auction valuation, pitch intelligence, workload monitoring and automated reporting.',
    indexable: true,
    sitemapPriority: 0.9,
    changeFrequency: 'monthly',
    group: 'Public',
  },
  {
    path: '/faq',
    title: 'Frequently Asked Questions — Data, Analytics & Security',
    description:
      'Answers on supported files, PDF uploads, data processing, ranking methodology, auction simulations, AI recommendations, account security and platform limits.',
    indexable: true,
    sitemapPriority: 0.8,
    changeFrequency: 'monthly',
    group: 'Public',
  },
  {
    path: '/testimonials',
    title: 'What Users Say About the Platform',
    description:
      'Feedback from analysts, scouts and coaches who evaluated the platform. Sample content is clearly labelled until verified testimonials are published.',
    indexable: true,
    sitemapPriority: 0.6,
    changeFrequency: 'monthly',
    group: 'Public',
  },
  {
    path: '/contact',
    title: 'Contact & Feedback',
    description:
      'Ask a question, report a data issue or request account and dataset deletion. Protected form with server-side validation and a response timeline.',
    indexable: true,
    sitemapPriority: 0.6,
    changeFrequency: 'yearly',
    group: 'Public',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy — Data, Cookies & Analytics',
    description:
      'What the platform collects, why, where it is stored and how it is protected. Includes cookies, analytics consent, uploaded datasets, third parties and deletion.',
    indexable: true,
    sitemapPriority: 0.5,
    changeFrequency: 'yearly',
    group: 'Legal',
  },
  {
    path: '/login',
    title: 'Sign In',
    description: 'Sign in to the cricket intelligence workspace with a seeded demo account or your own credentials. Sessions are HttpOnly and expire after twelve hours.',
    indexable: false,
    sitemapPriority: 0,
    changeFrequency: 'yearly',
    group: 'Auth',
  },
  {
    path: '/thank-you',
    title: 'Thank You',
    description: 'Confirmation that your message reached the platform team, with the reference code to quote in any follow-up.',
    indexable: false,
    sitemapPriority: 0,
    changeFrequency: 'yearly',
    group: 'Auth',
  },
];

/** Private workspace routes: authenticated, always noindex, never in the sitemap. */
export const PRIVATE_ROUTES: { path: string; title: string; description: string }[] = [
  { path: '/dashboard', title: 'Command Overview', description: 'Workspace KPIs, recent fixtures, data-quality alerts and AI budget in one private command view.' },
  { path: '/data', title: 'Data Centre & Upload Pipeline', description: 'Upload CSV, XLSX, JSON, PDF or text cricket datasets, review column mapping and approve records.' },
  { path: '/players', title: 'Player Intelligence Directory', description: 'Searchable player directory with rate metrics, sample-size labels and DEMO/UPLOADED provenance.' },
  { path: '/players/[id]', title: 'Player Intelligence Card', description: 'Full evidence-backed player card: metrics, risk, valuation ceilings, forecasts and workload flags.' },
  { path: '/talent', title: 'Talent Discovery Engine', description: 'Age-banded discovery with strategy presets, headroom weighting and sensitivity analysis.' },
  { path: '/compare', title: 'Player Comparison Lab', description: 'Compare two to eight players with radar overlays, percentile tables and a replacement simulator.' },
  { path: '/stats', title: 'Statistical Analysis Lab', description: 'Describe, regress, correlate, detect outliers, normalise and compute confidence intervals on your data.' },
  { path: '/team', title: 'Squad Intelligence', description: 'Squad balance, phase coverage, structural weaknesses, purse position and role gaps.' },
  { path: '/xi', title: 'Playing XI Builder', description: 'Build a constraint-satisfying XI with overseas limits, keeper requirements and a 20-over bowling plan.' },
  { path: '/auction', title: 'Auction Command Centre', description: 'Valuation, bid ceilings, role scarcity, market intelligence and a seeded virtual auction room.' },
  { path: '/match', title: 'Match Centre', description: 'Fixture log, phase profiles and batter-versus-bowler match-ups from ball-by-ball events.' },
  { path: '/pitch', title: 'Pitch & Venue Intelligence', description: 'Evidence-tagged venue DNA, toss strategy, surface what-ifs and pitch-suitability rankings.' },
  { path: '/opposition', title: 'Opposition Intelligence', description: 'Form, key-player threats, dependency indicators, phase plans and head-to-head match-ups.' },
  { path: '/prediction', title: 'Prediction Lab', description: 'Seeded Monte Carlo match simulation with win probabilities, score bands and forecast quality scoring.' },
  { path: '/scouting', title: 'Global Scouting Network', description: 'Run region, role and age missions with verification status on every discovery hit.' },
  { path: '/workload', title: 'Workload Management', description: 'Rolling load windows, acute-to-chronic ratios and rotation guidance without medical diagnosis.' },
  { path: '/research', title: 'Research Library', description: 'Chunked knowledge base with BM25 retrieval, citations and knowledge-gap detection.' },
  { path: '/assistant', title: 'AI Assistant', description: 'Ask questions in natural language; the parser runs the deterministic engine and cites the evidence.' },
  { path: '/automation', title: 'Automation Centre', description: 'Multi-agent workflows with least-privilege scopes and human approval gates.' },
  { path: '/reports', title: 'Reports & Presentation Decks', description: 'Generate board-ready reports with a quality gate and export to PDF, DOCX, XLSX, PPTX, MD or HTML.' },
  { path: '/settings', title: 'Security & Settings', description: 'AI provider, platform limits, security posture, testimonials, feedback and the audit trail.' },
  { path: '/system', title: 'Service Connection', description: 'Live status of the FastAPI compute service: endpoint, latency, readiness, version and which engine answered.' },
];

/** Prefixes that must never be crawled or indexed. */
export const PRIVATE_PREFIXES = [
  '/dashboard', '/data', '/players', '/talent', '/compare', '/stats', '/team', '/xi', '/auction',
  '/match', '/pitch', '/opposition', '/prediction', '/scouting', '/workload', '/research',
  '/assistant', '/automation', '/reports', '/settings', '/system', '/share',
];

export const publicEntry = (path: string): PageMetaEntry | undefined => PUBLIC_PAGES.find((p) => p.path === path);

/**
 * Branded share image, generated by app/opengraph-image.tsx (1200×630 PNG).
 * Declared explicitly in every page that overrides openGraph, because next merges
 * metadata per field: a page-level `openGraph` object replaces the parent one and
 * would otherwise drop the image entirely.
 */
export const SHARE_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: `${SITE.legalName} — ${SITE.tagline}`,
};

export function ogFor(entry: PageMetaEntry, type: 'website' | 'article' | 'profile' = 'article') {
  return {
    type,
    siteName: SITE.legalName,
    locale: SITE.locale,
    url: entry.path,
    title: entry.title,
    description: entry.description,
    images: [{ ...SHARE_IMAGE }],
  };
}

export function twitterFor(entry: PageMetaEntry) {
  return {
    card: 'summary_large_image' as const,
    site: SITE.twitter,
    creator: SITE.twitter,
    title: entry.title,
    description: entry.description,
    images: [SHARE_IMAGE.url],
  };
}

export function absoluteUrl(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE.url}${clean === '/' ? '' : clean}`;
}

/** Titles/descriptions for the private route layouts, keyed by path. */
export function privateMeta(path: string): { title: string; description: string } {
  const found = PRIVATE_ROUTES.find((r) => r.path === path);
  return found ?? { title: 'Workspace', description: 'Private cricket analytics workspace.' };
}
