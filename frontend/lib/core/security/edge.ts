/**
 * Edge-safe security helpers used by middleware.ts.
 *
 * Kept free of Node built-ins so the module can be bundled for the Edge runtime and
 * unit-tested directly (see tests/growth.test.ts).
 */
import { PRIVATE_PREFIXES } from '@/lib/site';

/** Workspace prefixes that must never be indexed or rendered without a session. */
export const PROTECTED_PREFIXES = [...PRIVATE_PREFIXES, '/api'];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * `/dashboard` and friends need a session; `/api/*` returns its own 401 JSON.
 *
 * Generated share cards (`/players/[id]/opengraph-image`) are the one exception:
 * social crawlers cannot send cookies, so gating them would break every link
 * preview. They are still safe by construction — app/(app)/players/[id]/opengraph-image.tsx
 * draws only name/role/team/format, and PUBLIC_PLAYER_PREVIEWS=false replaces the
 * name with generic branding for real, non-consented data.
 */
export function requiresSession(pathname: string): boolean {
  if (pathname.includes('/opengraph-image')) return false;
  return isProtectedPath(pathname) && !pathname.startsWith('/api/');
}

/**
 * HTTP → HTTPS decision. Enabled only when the operator sets ENFORCE_HTTPS=true,
 * because managed platforms (Vercel, Render) already terminate TLS and redirect at
 * the edge, and because a mis-detected proxy header must never cause a redirect loop.
 */
export function shouldRedirectToHttps(protocol: string | null, enabled: boolean, host: string | null): boolean {
  if (!enabled) return false;
  if (!host) return false;
  // Proxies send either "http" or "http://" depending on the platform.
  const normalised = protocol ? protocol.trim().toLowerCase().replace(/:\/\/$/, '') : null;
  if (normalised === 'https') return false;
  // Local development hosts are never redirected.
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return false;
  return normalised === 'http' || normalised === null;
}

/** Optional canonical-host redirect (e.g. apex → www) driven by CANONICAL_HOST. */
export function canonicalHostTarget(host: string | null, canonicalHost: string, pathname: string, search: string): string | null {
  if (!canonicalHost || !host) return null;
  const bare = host.split(':')[0].toLowerCase();
  if (bare === canonicalHost.toLowerCase()) return null;
  if (/^(localhost|127\.0\.0\.1)$/.test(bare)) return null;
  return `https://${canonicalHost}${pathname}${search}`;
}

/**
 * Response headers applied to every request.
 *
 * NOTE: no X-Frame-Options / CSP `frame-ancestors` here on purpose — this build is
 * legitimately embedded by the hosting preview iframe, and a blanket deny would
 * break it. Clickjacking protection belongs on the real deployment (see vercel.json,
 * which sets X-Frame-Options for production hosts).
 */
export function securityHeaders(isHttps: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-DNS-Prefetch-Control': 'off',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
  if (isHttps) headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  return headers;
}

/** Applied to private routes so a crawler that follows a leaked link cannot index it. */
export const NOINDEX_HEADER = { 'X-Robots-Tag': 'noindex, nofollow, noarchive' } as const;
