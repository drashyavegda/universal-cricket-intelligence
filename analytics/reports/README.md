# analytics/reports/

Definitions for recurring internal reports. **No data or generated output is committed here** — a
committed report contains user data and is stale the moment it is written.

| Report | Cadence | Contents | Owner |
| --- | --- | --- | --- |
| Weekly product review | weekly | funnel, activation, friction events, incidents | product |
| Monthly data quality | monthly | dataset quality scores, approvals, merge conflicts | data |
| Quarterly trust review | quarterly | public claims vs evidence, testimonials, privacy inventory diffs | product + legal |
| Release health | per release | test counts, smoke results, build duration, security job status | engineering |

Each report must state: measurement window, data source, sample size, and what changed since the last
one. A report with no "what changed" section is a status update, not a review.
