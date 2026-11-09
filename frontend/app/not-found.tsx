import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Compass, FileText, LayoutDashboard, LifeBuoy, Search, Sparkles, Users } from 'lucide-react';
import { PublicFooter, PublicHeader } from '@/components/public-chrome';
import { BackButton } from '@/components/back-button';

export const metadata: Metadata = {
  title: 'Page Not Found (404)',
  description: 'That page does not exist. Jump back into the cricket analytics workspace, the FAQ or the platform tour.',
  robots: { index: false, follow: true },
};

const LINKS = [
  { href: '/dashboard', label: 'Command overview', detail: 'Workspace KPIs and alerts', icon: LayoutDashboard, private: true },
  { href: '/players', label: 'Player intelligence', detail: 'Directory and profiles', icon: Users, private: true },
  { href: '/talent', label: 'Talent discovery', detail: 'Age-banded shortlists', icon: Sparkles, private: true },
  { href: '/reports', label: 'Reports & decks', detail: 'Build and export', icon: FileText, private: true },
  { href: '/tour', label: 'Platform tour', detail: 'All 30 modules', icon: Compass, private: false },
  { href: '/faq', label: 'FAQ', detail: 'Answers and limits', icon: LifeBuoy, private: false },
];

/**
 * Branded 404. Public routes are listed first-class; workspace links require a
 * session, so they are labelled as private rather than silently failing.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-turf-400">
            <Search size={13} /> Error 404
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">This delivery went for six</h1>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-slateink-300">
            The page you asked for does not exist — it may have moved, or the link may have a typo. Nothing was lost, and no
            data was affected. Here are the routes people usually want.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="card card-pad group flex items-start gap-2.5 transition hover:border-turf-500/40">
                <link.icon size={15} className="mt-0.5 shrink-0 text-turf-400" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-white">{link.label}</span>
                  <span className="block text-[11px] text-slateink-500">{link.detail}{link.private ? ' · sign-in required' : ''}</span>
                </span>
                <ArrowRight size={13} className="ml-auto shrink-0 text-slateink-600 group-hover:text-turf-400" />
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <BackButton label="Back to the previous page" />
            <Link href="/" className="btn-ghost btn-xs">Home</Link>
            <Link href="/contact" className="btn-primary btn-xs">Report a broken link</Link>
          </div>

          <div className="disclaimer mt-8">
            If you followed a link from inside the workspace and landed here, the record may have been deleted or renamed. Try
            the search palette (<kbd className="rounded bg-ink-800 px-1">Ctrl</kbd> + <kbd className="rounded bg-ink-800 px-1">K</kbd>) once signed in.
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
