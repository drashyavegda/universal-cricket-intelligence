# Personas, jobs and journeys

## Permission matrix (implemented in `lib/core/auth/service.ts`)

| Capability | owner | analyst | scout | viewer |
| --- | --- | --- | --- | --- |
| Read any analysis (`view`) | ✅ | ✅ | ✅ | ✅ |
| Upload / edit data (`data:upload`, `data:edit`) | ✅ | ✅ | — | — |
| Approve data (`data:approve`) | ✅ | — | — | — |
| Run analyses (`analysis:run`) | ✅ | ✅ | ✅ | — |
| Write shortlists (`shortlist:write`) | ✅ | ✅ | ✅ | — |
| Approve shortlists (`shortlist:approve`) | ✅ | ✅ | — | — |
| Generate reports (`report:write`) | ✅ | ✅ | ✅ | — |
| AI provider settings (`settings:ai`) | ✅ | — | — | — |
| Security settings, testimonials (`settings:security`) | ✅ | — | — | — |
| User administration (`admin:users`) | ✅ | — | — | — |

## Personas

### P1 — Scouting analyst (RR), role `analyst`
*Day:* receives a domestic season dump on Monday, needs a 10-player uncapped brief by Thursday.
*Jobs:* upload → map → validate → approve (ask owner) → rank under-23 uncapped → compare top 8 →
check workload/risk → export PDF + XLSX.
*Pain today:* three spreadsheets, no sample-size discipline, arguments about "who watched whom".
*Success:* brief accepted without rework; every claim traced to a row.

### P2 — Head coach / director, role `owner`
*Day:* 20 minutes before a selection meeting.
*Jobs:* read the brief, open the XI optimiser, sanity-check the bowling plan, ask the assistant
"who bowls the 17th at Chepauk", approve the final shortlist.
*Pain today:* numbers arrive without context; revert to gut feel.
*Success:* one page, caveats visible, decision recorded in the audit trail.

### P3 — Auction strategist, role `analyst`
*Day:* three weeks of purse scenarios.
*Jobs:* set purse and retention plan, value roles, run seeded auction rooms, stress-test bid
ceilings, produce the plan deck.
*Pain today:* scenarios can't be reproduced in the room.
*Success:* any scenario re-runs identically from its seed.

### P4 — Data engineer / platform admin, role `owner`
*Day:* new source formats, quality regressions, access reviews.
*Jobs:* extend mapping synonyms, monitor quality scores, audit sign-ins and exports, keep AI
spend inside budget, publish/retire testimonials.
*Pain today:* no idea which metric came from where.
*Success:* every metric traceable; audit answers "who changed this".

### P5 — Viewer / stakeholder, role `viewer`
*Day:* reads dashboards and exported PDFs between meetings.
*Jobs:* open the dashboard, read a report, check a player card.
*Success:* read-only by construction, nothing to break.

### P6 — Public visitor (no account)
*Day:* evaluating the platform after a link or a search result.
*Jobs:* skim the landing page, read the FAQ, judge credibility (privacy policy, testimonials
labelled honestly), send a question via the contact form.
*Success:* understands what is real vs demo, and trusts the page enough to book a demo.

## Journey: RR uncapped shortlist (happy path)

1. **Upload** — 4 files (batting CSV, bowling CSV, age sheet XLSX, trial PDF) → mapping preview.
2. **Validate** — 3 warnings (missing DOB ×2, one impossible date) → correct in preview.
3. **Approve** — owner approves; audit entry `dataset_approved`.
4. **Rank** — `/talent`, max age 23, uncapped, weights preset "RR 2027" → 42 candidates.
5. **Compare** — top 8 → radar + percentile table + like-for-like warning for 2 all-rounders.
6. **Check** — risk bands, workload flags, career trajectory (some "insufficient history").
7. **Package** — `talent` report → quality 80/100 → export PDF (staff) + XLSX (analysts) + PPTX (board).
8. **Decide** — shortlist saved; auction ceilings generated for the retained targets.

Failure paths that must be handled: file rejected (typed error, nothing stored), approval denied
(403 + message), empty cohort (explainable empty state), export failure (error surfaced, never a
fake "success").

## Anti-personas
* Someone looking for betting tips.
* Anyone wanting medical clearance for an injured player.
* A scraper trying to harvest player data (private routes are session-gated + noindex).
