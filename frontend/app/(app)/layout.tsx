import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/shell';
import { sessionUser } from '@/lib/core/auth/service';
import { SESSION_COOKIE } from '@/lib/api/helpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Preserve existing demo/custom sessions.
  const token = cookies().get(SESSION_COOKIE)?.value;

  if (token) {
    const demoUser = sessionUser(token);

    if (demoUser) {
      return <Shell>{children}</Shell>;
    }
  }

  // Verify real Supabase authentication.
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login?next=%2Fdashboard');
  }

  return <Shell>{children}</Shell>;
}