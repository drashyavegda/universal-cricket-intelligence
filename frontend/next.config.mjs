/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Never advertise the framework version.
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
    serverComponentsExternalPackages: ['pdf-parse', 'xlsx'],
    outputFileTracingIncludes: { '/api/**': ['./sample-data/**'] },
  },
  eslint: { ignoreDuringBuilds: true },

  /**
   * Baseline security headers for every response, including static assets that never
   * pass through middleware. HSTS is only meaningful over HTTPS, so it is added for
   * exactly that case. X-Frame-Options is intentionally omitted here (the platform
   * preview legitimately embeds the app in an iframe); the production deployment
   * configs — vercel.json and render.yaml — set it on the real hosts.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/:path*',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'https' }],
        headers: [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }],
      },
      {
        // Private surfaces: belt-and-braces noindex even without a session.
        source: '/(dashboard|data|players|talent|compare|stats|team|xi|auction|match|pitch|opposition|prediction|scouting|workload|research|assistant|automation|reports|settings|system|share)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ];
  },
};

export default nextConfig;
