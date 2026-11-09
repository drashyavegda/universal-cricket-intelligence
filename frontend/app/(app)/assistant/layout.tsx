import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "AI Assistant",
  description: "Ask questions in natural language; the parser runs the deterministic engine and cites the evidence.",
  alternates: { canonical: '/assistant' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
