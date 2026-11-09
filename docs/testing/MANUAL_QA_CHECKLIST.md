# Manual QA checklist

Run against a production build (`npm run build && npm start`) after any change touching
navigation, metadata, forms, auth or analytics. Tick honestly; note the build SHA.

## Public site
- [ ] `/` renders the hero, module groups, trust panel, testimonials/privacy/FAQ links
- [ ] `/tour` lists 30 modules with statuses
- [ ] `/faq` search filters, category chips work, accordion keyboard-operable (Tab + Enter)
- [ ] `/privacy` table of contents links jump to the right section
- [ ] `/testimonials` shows the "No verified testimonials" banner and three Sample badges
- [ ] `/contact` form: empty submit shows four field errors; typing enables submit
- [ ] Mobile (375 px): nav collapses, no horizontal scroll on any public page
- [ ] `/does-not-exist` shows the branded 404 with six links

## Forms & thank-you
- [ ] Valid submission → `/thank-you?ref=FB-XXXXXX` shows the confirmation and reference
- [ ] Submitting twice quickly → duplicate warning, not a second success
- [ ] Opening `/thank-you` with no reference → "Nothing to confirm yet"
- [ ] `/thank-you?status=failed` → failure state with a retry button
- [ ] Owner sees the submission in Settings → Growth & trust with its spam-check trace

## Workspace
- [ ] Signed-out `/dashboard` → `/login?next=%2Fdashboard`
- [ ] Login with each of the four demo roles; nav and actions match the permission matrix
- [ ] Breadcrumbs show `Overview › Section` on every page
- [ ] Player card: "Related analysis" links open compare (pre-selected), stats, talent, auction
- [ ] Empty states: clear the filters on `/talent` → explanatory empty state, no blank table
- [ ] Error state: stop the server mid-session → pages show an error, not a white screen
- [ ] Report generation → all six exports download and open
- [ ] Assistant: "save the shortlist permanently" → confirmation prompt, no write
- [ ] Settings → Growth & trust: add a testimonial as owner (201), as analyst (403)

## Consent & analytics
- [ ] With `NEXT_PUBLIC_GA_MEASUREMENT_ID` set and consent unset → banner appears, no network call
      to googletagmanager in the Network tab
- [ ] Accept → script loads, `page_view` fires once per navigation
- [ ] Decline → no script, banner disappears, site still works
- [ ] Clear localStorage `ucip.analytics.consent` → banner returns

## Security & indexing spot checks
- [ ] `curl -I /dashboard` (signed in) shows `x-robots-tag: noindex…`
- [ ] `/sitemap.xml` contains only the six public URLs
- [ ] `/robots.txt` disallows `/dashboard` and `/api/`
- [ ] `/opengraph-image` is a 1200×630 PNG (check with `file`)
- [ ] Paste a public URL into a social preview debugger → card loads

## Sign-off

| Field | Value |
| --- | --- |
| Build / commit | |
| Tester | |
| Date | |
| Environment | |
| Blocking issues | |
