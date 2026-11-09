import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Squad Intelligence",
  description: "Squad balance, phase coverage, structural weaknesses, purse position and role gaps.",
  alternates: { canonical: '/team' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
