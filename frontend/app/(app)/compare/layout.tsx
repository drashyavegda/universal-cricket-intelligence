import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Player Comparison Lab",
  description: "Compare two to eight players with radar overlays, percentile tables and a replacement simulator.",
  alternates: { canonical: '/compare' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
