import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Statistical Analysis Lab",
  description: "Describe, regress, correlate, detect outliers, normalise and compute confidence intervals on your data.",
  alternates: { canonical: '/stats' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
