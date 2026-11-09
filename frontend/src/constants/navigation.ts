/**
 * Navigation model for the workspace shell.
 *
 * The live array is `NAV` inside `components/shell.tsx`; this typed model is the extracted form used
 * when the shell moves under `frontend/src/`. Keep group ordering meaningful: it is the reading order
 * of a working day (command → scouting → team/auction → match → operations).
 */

export type NavGroup = 'Command' | 'Scouting' | 'Team & Auction' | 'Match & Conditions' | 'Operations';

export interface NavItem {
  /** Route path — must exist in the App Router tree. */
  href: string;
  /** Sidebar label. */
  label: string;
  /** lucide-react icon name (resolved where the shell renders). */
  icon: string;
  group: NavGroup;
  /** One-line description used by the command palette and tooltips. */
  description: string;
  /** Minimum role that sees this item. `viewer` = everyone signed in. */
  minRole: 'viewer' | 'scout' | 'analyst' | 'owner';
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: 'LayoutDashboard', group: 'Command', description: 'Workspace KPIs, alerts and recent fixtures', minRole: 'viewer' },
  { href: '/data', label: 'Data Centre', icon: 'Database', group: 'Command', description: 'Upload, map, validate and approve datasets', minRole: 'analyst' },
  { href: '/players', label: 'Player Intelligence', icon: 'Users', group: 'Scouting', description: 'Player directory and profiles', minRole: 'viewer' },
  { href: '/talent', label: 'Talent Discovery', icon: 'Sparkles', group: 'Scouting', description: 'Age-banded shortlists with sensitivity checks', minRole: 'viewer' },
  { href: '/compare', label: 'Player Comparison', icon: 'GitCompare', group: 'Scouting', description: 'Two to eight players side by side', minRole: 'viewer' },
  { href: '/stats', label: 'Statistical Lab', icon: 'Sigma', group: 'Scouting', description: 'Descriptive stats, regression, confidence intervals', minRole: 'viewer' },
  { href: '/team', label: 'Team Intelligence', icon: 'ShieldCheck', group: 'Team & Auction', description: 'Squad balance, gaps, purse position', minRole: 'viewer' },
  { href: '/xi', label: 'Playing XI Builder', icon: 'ListOrdered', group: 'Team & Auction', description: 'Constraint-satisfying XI and bowling plan', minRole: 'viewer' },
  { href: '/auction', label: 'Auction Command', icon: 'Gavel', group: 'Team & Auction', description: 'Valuation, bid ceilings, seeded auction room', minRole: 'viewer' },
  { href: '/match', label: 'Match Centre', icon: 'Trophy', group: 'Match & Conditions', description: 'Fixtures, phases and match-ups', minRole: 'viewer' },
  { href: '/pitch', label: 'Pitch & Venue', icon: 'MapPin', group: 'Match & Conditions', description: 'Venue DNA and toss strategy', minRole: 'viewer' },
  { href: '/opposition', label: 'Opposition Intel', icon: 'Swords', group: 'Match & Conditions', description: 'Threats and phase plans', minRole: 'viewer' },
  { href: '/prediction', label: 'Prediction Lab', icon: 'Dice5', group: 'Match & Conditions', description: 'Seeded Monte Carlo forecasts', minRole: 'viewer' },
  { href: '/scouting', label: 'Global Scouting', icon: 'Globe2', group: 'Operations', description: 'Regional discovery missions', minRole: 'viewer' },
  { href: '/workload', label: 'Workload Mgmt', icon: 'HeartPulse', group: 'Operations', description: 'Load windows and rotation guidance', minRole: 'viewer' },
  { href: '/research', label: 'Research Library', icon: 'BookOpen', group: 'Operations', description: 'Knowledge base with citations', minRole: 'viewer' },
  { href: '/assistant', label: 'AI Assistant', icon: 'MessageSquare', group: 'Operations', description: 'Ask questions; answers cite evidence', minRole: 'viewer' },
  { href: '/automation', label: 'Automation Centre', icon: 'Workflow', group: 'Operations', description: 'Workflows with approval gates', minRole: 'viewer' },
  { href: '/reports', label: 'Reports & Decks', icon: 'FileText', group: 'Operations', description: 'Generate and export reports', minRole: 'viewer' },
  { href: '/settings', label: 'Security & Settings', icon: 'Lock', group: 'Operations', description: 'Provider, security, testimonials, audit', minRole: 'viewer' },
];

export const NAV_GROUPS: NavGroup[] = ['Command', 'Scouting', 'Team & Auction', 'Match & Conditions', 'Operations'];

/** Filter for a signed-in role. Order is preserved so the sidebar never reshuffles. */
export function navForRole(role: 'viewer' | 'scout' | 'analyst' | 'owner'): NavItem[] {
  const rank = { viewer: 0, scout: 1, analyst: 2, owner: 3 } as const;
  return NAV_ITEMS.filter((item) => rank[role] >= rank[item.minRole]);
}
