import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Player Intelligence Directory",
  description: "Searchable player directory with rate metrics, sample-size labels and DEMO/UPLOADED provenance.",
  alternates: { canonical: '/players' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
