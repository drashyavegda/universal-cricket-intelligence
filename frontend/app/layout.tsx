import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE } from '@/lib/site';
import { AnalyticsProvider } from '@/components/analytics';

/**
 * Root metadata.
 *
 * Every page inherits `metadataBase` (so relative OG/canonical URLs resolve to an
 * absolute origin), the branded default Open Graph image, the Twitter card and the
 * title template. Individual pages override title/description; nothing is left to
 * framework defaults.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.legalName} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.legalName,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.legalName }],
  creator: SITE.legalName,
  publisher: SITE.legalName,
  category: 'sports analytics',
  alternates: { canonical: '/' },
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }], shortcut: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: SITE.legalName,
    locale: SITE.locale,
    url: SITE.url,
    title: `${SITE.legalName} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: 'summary_large_image',
    site: SITE.twitter,
    creator: SITE.twitter,
    title: `${SITE.legalName} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: SITE.themeColour,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <AnalyticsProvider />
      </body>
    </html>
  );
}
