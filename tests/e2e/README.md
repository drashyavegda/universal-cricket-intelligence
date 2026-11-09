# tests/e2e/

Browser-level specifications. **Not automated yet** — Playwright is not a dependency, and adding it
would need a CI runner with browsers, which the free-tier constraint rules out for now.

| Flow | Steps | Expected |
| --- | --- | --- |
| Anonymous browsing | `/` → `/tour` → `/faq` → expand an answer → `/contact` | no console errors; FAQ expands; no session cookie set |
| Workspace gate | visit `/dashboard` while signed out | 307 to `/login?next=/dashboard`; `X-Robots-Tag: noindex` |
| Sign in / out | sign in with a demo account → `/dashboard` → sign out | 12 h cookie; sign-out returns to `/login` and blocks `/dashboard` |
| Contact form | submit valid → invalid → honeypot-filled | success with reference; inline errors keep input; silent rejection for honeypot |
| Report pipeline | `/data` → upload sample CSV → `/talent` → `/reports` → generate → export PDF | quality score shown; PDF downloads and opens |
| Comparison | `/compare?ids=<a>,<b>` | loads without `<Suspense>` errors; radar renders |
| Mobile nav | 375 px viewport, public site + workspace | menu opens, focus moves into it, Escape closes |

## Manual run (today)

Follow the steps; record the date, browser version, and any deviation. A flow that fails silently is a
worse outcome than a red test, so write down what you saw even when it passes.

## When to automate

Adopt Playwright when a regression in one of the flows above has actually shipped twice, or when more
than one person is changing the shared components weekly. Automating everything speculatively is how
test suites become slow and ignored.
