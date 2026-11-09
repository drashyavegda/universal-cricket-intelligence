import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Security & Settings",
  description: "AI provider, platform limits, security posture, testimonials, feedback and the audit trail.",
  alternates: { canonical: '/settings' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
