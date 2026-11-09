import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/shell';
import { sessionUser } from '@/lib/core/auth/service';
import { SESSION_COOKIE } from '@/lib/api/helpers';

/**
 * Every workspace route is private. Two independent gates protect it:
 *  1. middleware.ts redirects when the session cookie is absent;
 *  2. this server layout validates the token against the session store before
 *     rendering any data-bearing page.
 * `robots: noindex` plus the `X-Robots-Tag` header set in middleware keep the
 * whole app out of search indexes even if a crawler follows a leaked link.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const user = sessionUser(token);
  if (!user) redirect('/login?next=%2Fdashboard');
  return <Shell>{children}</Shell>;
}
