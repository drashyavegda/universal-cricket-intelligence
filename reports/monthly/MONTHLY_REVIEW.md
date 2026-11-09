# Monthly review — report definition

Not a generated report: this is the specification of one.

## 1. Data window
First to last day of the month, using `settings.referenceDate` (default `2027-04-01`) as the anchor so
a demo run is reproducible.

## 2. Sections

| # | Section | Source | Must state |
| --- | --- | --- | --- |
| 1 | Workspace activity | audit log | window, distinct actors, action counts |
| 2 | Data health | datasets | rows ingested, approved, rejected, quality delta |
| 3 | Analysis output | reports | reports generated, mean quality score, lowest-quality report and why |
| 4 | Shortlists | shortlists | new/updated, players added, approval state |
| 5 | AI usage | gateway | narrations, spend vs cap, fallbacks used |
| 6 | Reliability | host logs | 5xx rate, p95 latency, incidents |
| 7 | Trust | testimonials, feedback | published vs sample, median first-response time |
| 8 | Actions | — | ≤ 5 items, each with an owner and a date |

## 3. Quality gate

The report is not published if a section has no data: it says "no data for this period" instead of
showing zeros, because zeros look like good news.

## 4. Distribution

Internal only. Do not post excerpts publicly without removing figures that depend on private data.
