# backend/integrations/ — Third-party integrations (planned)

No outbound network calls are made by this service today — nothing to leak, nothing to rate-limit.

Planned, all optional and all key-gated:
| Integration | Purpose | Guard |
| --- | --- | --- |
| Weather provider | venue conditions | server-side key, cached 30 min, degrade to climatology |
| Object storage (S3/Supabase) | large export artefacts | pre-signed URLs, 24 h expiry |
| Email provider | transactional notices | server-side key, template ids only |

Rules: never make a user request depend on a third party succeeding; always have a labelled fallback;
log the integration and duration, never the payload.
