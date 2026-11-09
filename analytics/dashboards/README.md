# analytics/dashboards/

Dashboards are defined as **questions + metric definitions**, not screenshots: a screenshot cannot be
recomputed, and a chart without a definition invites disagreement.

| Dashboard | Question it answers | Metrics | Source |
| --- | --- | --- | --- |
| Acquisition | Do people reach the product at all? | sessions, `/` → `/tour` → `/contact` progression | GA4 (consent-gated) |
| Activation | Do they reach a first useful output? | sign_in → report_generated within a session | `metrics.py` funnel |
| Engagement | Which modules are actually used? | events per module owner (assistant, talent, auction) | audit log + GA4 |
| Reliability | Is the product breaking? | 5xx rate per route, p95 latency, `form_failed` | host logs |
| Trust | Are public claims supported? | testimonials published vs sample, feedback response time | store tables |

## Definitions that must not drift

* **Active session** — any session with ≥ 1 allow-listed event.
* **Activated session** — reached `report_generated` (not merely `dataset_uploaded`; uploading is not
  value, a report is).
* **Retention (D7)** — a session in week 2 from an IP-hash-stable returning visitor. Approximate, and
  labelled as such wherever it appears.
* **Friction** — `form_failed` per 100 `form_submitted`. A rising ratio is a bug, not a marketing issue.

## Rules

1. Never publish a metric that `analytics/metrics.py` cannot recompute.
2. Show the denominator with every percentage.
3. Consent-gated data is a sample of traffic, not all traffic — say so in the dashboard footer.
