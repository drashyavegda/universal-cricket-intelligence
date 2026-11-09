import { NextResponse, type NextRequest } from 'next/server';
import {
  canonicalHostTarget, isProtectedPath, requiresSession, securityHeaders, shouldRedirectToHttps, NOINDEX_HEADER,
} from '@/lib/core/security/edge';

const SESSION_COOKIE = 'ucip_session';
const ENFORCE_HTTPS = process.env.ENFORCE_HTTPS === 'true';
const CANONICAL_HOST = process.env.CANONICAL_HOST || '';

/**
 * Edge middleware: transport security, canonical host, private-route gating and
 * security headers. The session cookie is only checked for presence here — the
 * authoritative validation happens server-side in app/(app)/layout.tsx.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get('host');

  const redirectTarget = canonicalHostTarget(host, CANONICAL_HOST, pathname, search);
  if (redirectTarget) return NextResponse.redirect(redirectTarget, 308);

  const forwardedProto = req.headers.get('x-forwarded-proto');
  if (shouldRedirectToHttps(forwardedProto, ENFORCE_HTTPS, host)) {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    url.host = host ?? url.host;
    return NextResponse.redirect(url, 308);
  }

  if (requiresSession(pathname) && !req.cookies.get(SESSION_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url, 307);
  }

  const res = NextResponse.next();
  const isHttps = forwardedProto === 'https' || req.nextUrl.protocol === 'https:';
  for (const [key, value] of Object.entries(securityHeaders(isHttps))) res.headers.set(key, value);
  if (isProtectedPath(pathname)) for (const [key, value] of Object.entries(NOINDEX_HEADER)) res.headers.set(key, value);
  return res;
}

export const config = {
  // Skip Next internals, static assets, the icon and the OG image routes.
  matcher: ['/((?!_next/static|_next/image|favicon.svg|opengraph-image|robots.txt|sitemap.xml).*)'],
};
