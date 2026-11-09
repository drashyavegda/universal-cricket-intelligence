import type { Metadata } from 'next';

/** Unique title + description for a private page. Always noindex (see (app)/layout.tsx). */
export const metadata: Metadata = {
  title: "Workload Management",
  description: "Rolling load windows, acute-to-chronic ratios and rotation guidance without medical diagnosis.",
  alternates: { canonical: '/workload' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
