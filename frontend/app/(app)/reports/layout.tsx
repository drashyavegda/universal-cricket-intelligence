import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Reports & Presentation Decks",
  description: "Generate board-ready reports with a quality gate and export to PDF, DOCX, XLSX, PPTX, MD or HTML.",
  alternates: { canonical: '/reports' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
