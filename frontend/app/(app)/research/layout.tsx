import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Research Library",
  description: "Chunked knowledge base with BM25 retrieval, citations and knowledge-gap detection.",
  alternates: { canonical: '/research' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
