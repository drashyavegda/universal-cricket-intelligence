import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Auction Command Centre",
  description: "Valuation, bid ceilings, role scarcity, market intelligence and a seeded virtual auction room.",
  alternates: { canonical: '/auction' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
