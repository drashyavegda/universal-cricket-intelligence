import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Talent Discovery Engine",
  description: "Age-banded discovery with strategy presets, headroom weighting and sensitivity analysis.",
  alternates: { canonical: '/talent' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
