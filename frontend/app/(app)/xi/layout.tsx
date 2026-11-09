import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Playing XI Builder",
  description: "Build a constraint-satisfying XI with overseas limits, keeper requirements and a 20-over bowling plan.",
  alternates: { canonical: '/xi' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
