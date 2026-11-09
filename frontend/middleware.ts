import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  canonicalHostTarget,
  isProtectedPath,
  requiresSession,
  securityHeaders,
  shouldRedirectToHttps,
  NOINDEX_HEADER,
} from '@/lib/core/security/edge';

const SESSION_COOKIE = 'ucip_session';
const ENFORCE_HTTPS = process.env.ENFORCE_HTTPS === 'true';
const CANONICAL_HOST = process.env.CANONICAL_HOST || '';

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get('host');

  const redirectTarget = canonicalHostTarget(
    host,
    CANONICAL_HOST,
    pathname,
    search
  );

  if (redirectTarget) {
    return NextResponse.redirect(redirectTarget, 308);
  }

  const forwardedProto = req.headers.get('x-forwarded-proto');

  if (shouldRedirectToHttps(forwardedProto, ENFORCE_HTTPS, host)) {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    url.host = host ?? url.host;
    return NextResponse.redirect(url, 308);
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });

          response = NextResponse.next({ request: req });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasDemoSession = Boolean(
    req.cookies.get(SESSION_COOKIE)?.value
  );

  if (requiresSession(pathname) && !hasDemoSession && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;

    const redirectResponse = NextResponse.redirect(url, 307);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  const isHttps =
    forwardedProto === 'https' ||
    req.nextUrl.protocol === 'https:';

  for (const [key, value] of Object.entries(securityHeaders(isHttps))) {
    response.headers.set(key, value);
  }

  if (isProtectedPath(pathname)) {
    for (const [key, value] of Object.entries(NOINDEX_HEADER)) {
      response.headers.set(key, value);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.svg|opengraph-image|robots.txt|sitemap.xml).* )',
  ],
};