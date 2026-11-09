import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Global Scouting Network",
  description: "Run region, role and age missions with verification status on every discovery hit.",
  alternates: { canonical: '/scouting' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
