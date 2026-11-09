import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Data Centre & Upload Pipeline",
  description: "Upload CSV, XLSX, JSON, PDF or text cricket datasets, review column mapping and approve records.",
  alternates: { canonical: '/data' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
