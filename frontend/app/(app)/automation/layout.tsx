import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Automation Centre",
  description: "Multi-agent workflows with least-privilege scopes and human approval gates.",
  alternates: { canonical: '/automation' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
