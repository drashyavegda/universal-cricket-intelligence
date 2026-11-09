'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LayoutDashboard, Lock } from 'lucide-react';

/** Human labels for workspace routes; keeps breadcrumb text and <title> in sync. */
const LABELS: Record<string, string> = {
  dashboard: 'Overview',
  data: 'Data Centre',
  players: 'Player Intelligence',
  talent: 'Talent Discovery',
  compare: 'Player Comparison',
  stats: 'Statistical Lab',
  team: 'Team Intelligence',
  xi: 'Playing XI',
  auction: 'Auction Command',
  match: 'Match Centre',
  pitch: 'Pitch & Venue',
  opposition: 'Opposition Intel',
  prediction: 'Prediction Lab',
  scouting: 'Global Scouting',
  workload: 'Workload',
  research: 'Research Library',
  assistant: 'AI Assistant',
  automation: 'Automation',
  reports: 'Reports & Decks',
  settings: 'Security & Settings',
};

/**
 * Workspace breadcrumbs. Renders `Overview › Section [› Record]` with a private badge,
 * so every deep page has a crawlable (and keyboard-reachable) path back up the tree.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) return null;

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const isId = /^[a-z]{3}_[a-z0-9]+$/i.test(segment);
    const label = isId ? 'Record' : (LABELS[segment] ?? segment.replace(/-/g, ' '));
    return { href, label, last: index === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 overflow-x-auto text-[11px] text-slateink-500">
      <Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-white" aria-label="Workspace overview">
        <LayoutDashboard size={11} /> Overview
      </Link>
      {crumbs.filter((c) => c.href !== '/dashboard').map((crumb) => (
        <span key={crumb.href} className="inline-flex items-center gap-1 whitespace-nowrap">
          <ChevronRight size={10} className="text-slateink-600" />
          {crumb.last
            ? <span className="text-slateink-300" aria-current="page">{crumb.label}</span>
            : <Link href={crumb.href} className="hover:text-white">{crumb.label}</Link>}
        </span>
      ))}
      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slateink-600"><Lock size={9} /> private · noindex</span>
    </nav>
  );
}
