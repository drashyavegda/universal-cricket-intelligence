import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Prediction Lab",
  description: "Seeded Monte Carlo match simulation with win probabilities, score bands and forecast quality scoring.",
  alternates: { canonical: '/prediction' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
