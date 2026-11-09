import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Command Overview",
  description: "Workspace KPIs, recent fixtures, data-quality alerts and AI budget in one private command view.",
  alternates: { canonical: '/dashboard' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
