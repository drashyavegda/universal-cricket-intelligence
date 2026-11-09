import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Pitch & Venue Intelligence",
  description: "Evidence-tagged venue DNA, toss strategy, surface what-ifs and pitch-suitability rankings.",
  alternates: { canonical: '/pitch' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
