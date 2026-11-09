# ADR-0006 — Honeypot and rate limiting first, CAPTCHA optional

* Status: Accepted
* Date: 2026-11-09

## Context
Public contact forms attract spam, but CAPTCHAs cost conversions and exclude some users. The default
deployment should not require a third-party key, and legitimate users must never be blocked.

## Decision
Layer the defences: per-IP rate limit (5 / 10 min) → invisible honeypot → minimum fill time (1.2 s)
→ optional Cloudflare Turnstile (only when both keys are set) → server-side validation and
sanitisation → duplicate suppression (15 min) → store with a hashed IP. Every response carries a
`checks[]` trace. Each rejection has human copy and an email fallback.

## Consequences
* No puzzle by default; zero configuration to be protected against naive bots.
* Sophisticated bots are only reliably stopped once Turnstile is configured — stated openly in the
  privacy policy, the FAQ and `KNOWN_GAPS.md`.
* The limiter is per process; multi-instance deployments need a shared store (phase 4).

## Alternatives considered
* reCAPTCHA by default — rejected: third-party dependency + privacy cost for every visitor.
* Proof-of-work only — rejected: adds client CPU and still needs server state.
