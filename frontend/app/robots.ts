import type { MetadataRoute } from 'next';
import { PRIVATE_PREFIXES, SITE, absoluteUrl } from '@/lib/site';

/**
 * robots.txt.
 *
 * Public pages are crawlable; every private workspace route, API surface and thin
 * confirmation page is disallowed. The sitemap is referenced with its absolute URL.
 * robots.txt is a crawling convention, not an access control — the real protection is
 * the authentication gate in middleware.ts + app/(app)/layout.tsx and the
 * `X-Robots-Tag: noindex` header on private responses.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    ...PRIVATE_PREFIXES,
    '/api/',
    '/login',
    '/thank-you',
    '/_next/',
  ].sort();

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      // Aggressive scrapers that ignore robots.txt conventions are explicitly excluded too.
      { userAgent: ['GPTBot', 'CCBot', 'anthropic-ai', 'Bytespider'], allow: ['/', '/faq', '/tour', '/privacy', '/testimonials'], disallow },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE.url,
  };
}
