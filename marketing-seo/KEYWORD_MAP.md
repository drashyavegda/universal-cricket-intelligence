# Keyword map

One primary intent per page. If two pages target the same intent, they compete with each other — that
is a defect, not extra coverage.

| Page | Primary intent | Supporting phrases (used naturally, not stuffed) | Title (≤ 60) | Description (≤ 160) |
| --- | --- | --- | --- | --- |
| `/` | cricket analytics platform | cricket intelligence platform, cricket data analysis software, IPL analytics | "Cricket Intelligence Platform — Analytics, Scouting & Auction" | "30 analytics modules plus a scouting and auction workspace for cricket teams. Deterministic metrics, cited data, AI narration that never invents numbers." |
| `/tour` | what the platform does | cricket analytics modules, squad analysis tools, auction strategy software | "Product tour — 30 cricket analytics modules" | "See every module: data ingestion, player intelligence, talent discovery, auction strategy, match forecasting, workload and reporting." |
| `/faq` | cricket analytics questions | is cricket analytics accurate, cricket data privacy, does it need a paid API | "Cricket analytics FAQ — data, accuracy, privacy" | "Straight answers about data sources, sample sizes, forecast accuracy, privacy, cookies and what the platform cannot do." |
| `/privacy` | privacy of cricket data | cricket analytics privacy policy, cookie consent | "Privacy policy" | "What we collect, why, how long we keep it, and how analytics consent works." |
| `/testimonials` | user feedback | cricket analytics reviews | "Feedback and testimonials" | "Published feedback from coaches and analysts — and an honest note when there is none yet." |
| `/contact` | request a demo | cricket analytics demo, contact | "Request a demo" | "Tell us about your team, your data and the question you are trying to answer. Reply within two working days." |

## Rules
1. Titles are unique and 50–60 characters; descriptions 130–160. Tests in `tests/seo.test.ts` assert
   uniqueness and length — copy changes must keep them green.
2. No keyword appears more than twice in body copy.
3. Every claim on a page must point to something the product does; the tour lists modules that exist.
4. `/dashboard` and every workspace route stay `noindex` and out of the sitemap.
