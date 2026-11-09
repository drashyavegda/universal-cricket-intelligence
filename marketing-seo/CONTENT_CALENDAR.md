# Content calendar (definitions, not dates)

Ordered by dependency: you cannot write a case study before the product has been used, and you must not
publish a comparison page before the positioning is settled.

| # | Piece | Depends on | Acceptance criteria |
| --- | --- | --- | --- |
| 1 | FAQ expansion (22 → 30 answers) | real support questions | each answer ≤ 120 words, no promise of accuracy beyond what tests show |
| 2 | "How sample size changes a selection call" article | worked example from demo data | every figure reproducible from the seeded workspace, labelled DEMO |
| 3 | Auction-planning explainer | auction module | ends with a limitation, not a sales claim |
| 4 | Data-quality article | `/data` quality panel | shows a real validation finding |
| 5 | Methodology page (`/methodology`) | review of formulas | links each metric to its `lib/core` module; new route ⇒ `lib/site.ts` + tests |
| 6 | Case study | one real deployment + written permission | no metric without written sign-off from the customer |
| 7 | Comparison page | positioning decision | factual feature table only; no denigration; date-stamped |

## Publishing checklist
- [ ] Title/description unique, within length, added to `lib/site.ts`
- [ ] Internal links from at least two existing pages
- [ ] Facts re-checked against the code (not from memory)
- [ ] No unsupported superlatives ("best", "only", "#1")
- [ ] Preview in the in-app viewer (no external images/fonts — they will not load there)
- [ ] `npm test` green (metadata + sitemap tests)
