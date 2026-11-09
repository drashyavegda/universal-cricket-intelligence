# backend/agents/ — Agents (planned)

Planned multi-step workflows (data QA sweep, weekly brief, shortlist refresh). Today the equivalent
functionality exists in the Next.js application as `/automation` workflows with approval gates and in
`lib/core/ai/agents.ts`.

Design constraints for anything added here:
* every step must be independently re-runnable and idempotent;
* a step that writes data requires a human approval gate — no autonomous writes;
* each step records its inputs (dataset versions) so a result can be reproduced;
* failures surface to the workflow run, never silently retried more than twice.
