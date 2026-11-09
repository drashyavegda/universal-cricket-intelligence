/**
 * Frontend-facing view of the site configuration.
 *
 * SOURCE OF TRUTH: `lib/site.ts` at the repository root. This module exists so that feature code
 * has one stable import path during the phase-5 move, and so nobody re-declares the canonical URL
 * or the title template in a component.
 */
import { SITE, absoluteUrl, SHARE_IMAGE } from '@/lib/site';

export const siteConfig = {
  name: SITE.name,
  legalName: SITE.legalName,
  tagline: SITE.tagline,
  description: SITE.description,
  url: SITE.url,
  locale: SITE.locale,
  contactEmail: SITE.contactEmail,
  twitter: SITE.twitter,
  themeColour: SITE.themeColour,
  shareImage: SHARE_IMAGE,
} as const;

/** Absolute URL for a route, safe for metadata and share links. */
export const canonical = (path = '/'): string => absoluteUrl(path);

/**
 * Feature flags derived from environment. All are optional integrations; the UI must degrade
 * gracefully (and say so) when one is absent.
 */
export const features = {
  analytics: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
  captcha: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  publicPlayerPreviews: (process.env.PUBLIC_PLAYER_PREVIEWS ?? 'true') !== 'false',
} as const;

/**
 * Deployment surface used by banners and diagnostics. Never render secrets here — only whether a
 * capability is configured.
 */
export const deployment = {
  analyticsService: Boolean(process.env.ANALYTICS_SERVICE_URL),
  contactEmail: SITE.contactEmail,
} as const;
