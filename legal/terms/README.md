# Terms of use — required content

The public site currently carries a plain-language disclaimer in the footer and on the FAQ. Before any
commercial launch, publish a real terms page covering:

1. **Service description** — decision-support analytics; outputs are estimates, not guarantees.
2. **No professional advice** — not medical, not financial, not a substitute for coaching judgement.
3. **Data ownership** — the customer owns uploaded data; the operator processes it to deliver the service.
4. **Acceptable use** — no unlawful data, no scraping of third-party sources in breach of their terms,
   no attempts to re-identify individuals.
5. **Accounts** — one user per seat, no credential sharing, operator may suspend on abuse.
6. **Availability** — no uptime guarantee on a free tier; planned maintenance notice where possible.
7. **Liability** — limitation to fees paid; no liability for selection decisions made using the output.
8. **Termination and export** — the customer can export their reports before deletion.
9. **Governing law** — set per operator jurisdiction.
10. **Contact** — a monitored address.

Route created: `/terms` is **not** built yet; add it to `lib/site.ts` `PUBLIC_PAGES` with
`indexable: true` when the text is reviewed (tests enforce unique titles/descriptions).
