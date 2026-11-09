# analytics/ — measurement of the product itself

Two different things share the word "analytics" in this project. Keep them apart:

| | Product analytics | Cricket analytics |
| --- | --- | --- |
| Question | Is the product used and useful? | Who should we pick? |
| Lives in | `analytics/`, `lib/client/analytics.ts`, `marketing-seo/analytics/` | `lib/core/**` (40 modules) |
| Data | 8 allow-listed GA4 events (consent-gated) | match events, dataset records |
| Never | player names, emails, messages | third-party tracking |

```
analytics/
├── metrics.py         runnable: computes the funnel definitions from an event export
├── dashboards/        what each dashboard answers, and the metric definitions behind it
├── queries/           versioned SQL for the Postgres path
└── reports/           recurring internal reports (definitions, not data)
```

## The one rule

Every metric in this folder must be computable from stored data. If a number cannot be recomputed, it
does not go on a dashboard — that rule is what stops invented statistics from creeping into the
product's own reporting.
