# AI layer contract

The AI layer makes the platform readable. It is not allowed to make the platform *right or
wrong*. This document is the contract; `tests/assistant-reporting.test.ts` enforces the parts
that can be automated.

---

## 1. Responsibilities

| Module | May | May not |
| --- | --- | --- |
| `ai/nlq.ts` | classify intent, extract entities (role, age, competition, player names present in the workspace) | invent an entity, choose a metric value |
| `ai/assistant.ts` | route to engines, assemble evidence, write prose over facts, request confirmation for writes | execute a write without confirmation, add numbers |
| `ai/agents.ts` | sequence steps, stop on failure, request approvals | escalate its own permissions |
| `ai/gateway.ts` | call the configured provider, enforce budget/rate limit, log usage | receive raw uploaded files, receive credentials |

## 2. Data sent to a provider (when configured)

Only the computed evidence block: metric names, values, units, sample sizes, provenance labels,
and the user's question. **Never**: raw file content, full dataset rows, email addresses, session
tokens, API keys, or other users' data.

## 3. Fallback when no provider is configured

Every AI surface returns a deterministic, clearly labelled `demo` response built from the same
evidence block. The UI shows the mode (`DEMO NARRATION`) so nobody mistakes it for model output.
Numerics are identical with or without a key — only prose changes.

## 4. Write intents

Recognised verbs (`save`, `delete`, `publish`, `approve`, `permanently`, …) set
`intent: 'write_action'` and `confirmRequired: true` *before* any other matching. The API returns
the plan and performs nothing. The UI must render an explicit confirm step; only a second,
user-initiated call may execute.

## 5. Prompt-injection defence

Knowledge-base and dataset text is untrusted input. The assistant:

1. treats retrieved text as data, never as instructions;
2. flags instruction-like content (`ignore previous`, `system:`, tool-call syntax) in the
   response metadata;
3. never follows an instruction that arrives from uploaded content;
4. keeps the guard switchable (`settings.security.promptInjectionGuard`) but defaults to on.

## 6. Budget and rate limiting

`PlatformSettings.ai` holds `monthlyBudgetUsd`, `rateLimitPerMinute`, `model`, `temperature`.
`ai/gateway.ts` refuses calls past the budget and logs every call to `AiUsageEntry`
(prompt/completion tokens, USD, status: `ok | error | demo | blocked`). The dashboard shows
spend against budget. Nothing is silently billed.

## 7. Provenance in answers

Every answer carries `evidence[]` entries with `label`, `value`, `source`. If an answer has no
evidence it must say so rather than improvise. The UI renders evidence beneath the prose.

## 8. Evaluation checklist for any prompt/model change

- [ ] Same question + same data ⇒ same evidence block (prose may vary).
- [ ] No number appears in prose that is absent from evidence.
- [ ] `"save the shortlist permanently"` still returns `confirmRequired: true` (smoke check).
- [ ] Unknown player names are not echoed as if real.
- [ ] Injection string in a knowledge doc does not change behaviour.
- [ ] Cost per question recorded; budget respected.
