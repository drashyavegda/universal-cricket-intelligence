# ADR-0007 — GA4 off unless configured **and** consented

* Status: Accepted
* Date: 2026-11-09

## Context
Product analytics are useful; shipping a tracker that fires before consent is not acceptable, and
sending player or user data to a third party is worse.

## Decision
* No measurement config ⇒ no script at all (`AnalyticsProvider` renders nothing).
* Consent banner gates loading; declining or `navigator.doNotTrack === '1'` keeps it off.
* Event payloads pass a 14-key allowlist; numeric counts are bucketed; strings truncated.
  Player names, emails, file names and messages are not in the schema.
* IP anonymisation is enabled; ad storage is denied.

## Consequences
* Analytics data is sparse by design — acceptable for a product whose value is private analytics.
* Consent state lives in localStorage (`ucip.analytics.consent`) and can be cleared by the user;
  the privacy policy explains exactly that.
* No ad-tech, no cross-site tracking, nothing to sell.

## Alternatives considered
* Server-side analytics with no cookies — attractive but still third-party transmission; revisit if
  self-hosting an analytics backend becomes desirable.
* Always-on tracking with an opt-out — rejected: not the default we would want for our own data.
