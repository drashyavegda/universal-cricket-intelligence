# =============================================================================
# Next.js application image (frontend + BFF + analytics engine).
#
# Build context is the repository root, which is where the Next.js app lives
# today (app/ lib/ components/ public/). After the phase-5 monorepo split, change
# the two COPY lines marked FRONTEND-ROOT to `frontend/`.
#   docker build -t ucip-web .
#   docker run -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 ucip-web
# =============================================================================
FROM node:20.20.2-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20.20.2-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
# FRONTEND-ROOT: today the app is at the build-context root
COPY . .
# Public env vars are inlined at build time — pass real values or the site will
# fall back to http://localhost:3000 in canonical/sitemap URLs.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_CONTACT_EMAIL=hello@cricket-intelligence.example
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
RUN npm run build

FROM node:20.20.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/app/.data
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs ucip && mkdir -p /app/.data && chown -R ucip:nodejs /app/.data
COPY --from=builder --chown=ucip:nodejs /app/.next ./.next
COPY --from=builder --chown=ucip:nodejs /app/public ./public
COPY --from=builder --chown=ucip:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ucip:nodejs /app/package.json ./package.json
COPY --from=builder --chown=ucip:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=ucip:nodejs /app/sample-data ./sample-data
USER ucip
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "start"]
