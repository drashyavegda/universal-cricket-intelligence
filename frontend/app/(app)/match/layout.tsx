import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Match Centre",
  description: "Fixture log, phase profiles and batter-versus-bowler match-ups from ball-by-ball events.",
  alternates: { canonical: '/match' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
