import type { Metadata } from 'next';
import { ogFor, publicEntry, twitterFor } from '@/lib/site';

/**
 * Server layout so the sign-in route can carry its own metadata: the page itself is a
 * client component and cannot export `metadata`. Sign-in is never indexable.
 */
const entry = publicEntry('/login')!;

export const metadata: Metadata = {
  title: entry.title,
  description: entry.description,
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
  openGraph: ogFor(entry),
  twitter: twitterFor(entry),
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
