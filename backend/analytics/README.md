# backend/analytics/ — Service analytics

Product analytics (GA4, consent-gated) are a frontend concern and live in the Next app.

What this service exposes is **operational** telemetry: request counts, error counts and latency
buckets at `/metrics` in Prometheus text format, plus structured JSON logs with a request id. There is
no user-level tracking here, and no payload logging (stat inputs are user data).
