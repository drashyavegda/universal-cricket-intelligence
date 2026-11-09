import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Opposition Intelligence",
  description: "Form, key-player threats, dependency indicators, phase plans and head-to-head match-ups.",
  alternates: { canonical: '/opposition' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
