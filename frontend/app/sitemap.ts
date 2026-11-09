import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, absoluteUrl } from '@/lib/site';

/**
 * XML sitemap containing ONLY public, indexable pages.
 *
 * Deliberately excluded: every workspace route (dashboard, players, reports, …),
 * /api/*, the sign-in page and the /thank-you confirmation page. There are no
 * dynamic public routes that expose private data, so nothing else is derived here;
 * if a public content type is added later it must opt in by setting
 * `indexable: true` in lib/site.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PAGES.filter((page) => page.indexable).map((page) => ({
    url: absoluteUrl(page.path),
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.sitemapPriority,
  }));
}
