import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: 'Service Connection',
  description: 'Live status of the FastAPI compute service: endpoint, latency, readiness, version and the fallback engine.',
  alternates: { canonical: '/system' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
