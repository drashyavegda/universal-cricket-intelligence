# Architecture decision records

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](ADR-0001-single-nextjs-application.md) | One Next.js application instead of an early frontend/backend split | Accepted |
| [0002](ADR-0002-deterministic-analytics-first.md) | Deterministic engines own the numbers; AI only narrates | Accepted |
| [0003](ADR-0003-json-store-with-postgres-path.md) | JSON document store now, PostgreSQL path behind one façade | Accepted |
| [0004](ADR-0004-metadata-registry.md) | One metadata registry instead of per-page strings | Accepted |
| [0005](ADR-0005-public-private-route-split.md) | Public marketing routes separated from the private workspace | Accepted |
| [0006](ADR-0006-form-hardening-without-captcha-default.md) | Honeypot/rate-limit first, CAPTCHA optional | Accepted |
| [0007](ADR-0007-consent-gated-analytics.md) | GA4 off unless configured **and** consented | Accepted |
| [0008](ADR-0008-fastapi-service-on-render.md) | Optional FastAPI service for heavy compute on Render | Accepted (phase 2 scaffold) |
| [0009](ADR-0009-no-testimonial-structured-data.md) | No Review/AggregateRating schema for testimonials | Accepted |

Format: context → decision → consequences → alternatives. Add a new ADR rather than editing an
accepted one; supersede explicitly.
