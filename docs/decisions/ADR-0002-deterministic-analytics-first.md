# ADR-0002 — Deterministic engines own the numbers; AI only narrates

* Status: Accepted
* Date: 2026-11-09

## Context
A cricket decision platform is judged on whether a selector can defend a number in a meeting. LLMs
produce fluent, occasionally invented, statistics. Seeded simulations also need to be replayable.

## Decision
1. All quantities are computed by `lib/core/**` engines with explicit formulas and sample sizes.
2. The AI layer (`lib/core/ai/*`) receives an evidence block and writes prose only. It may not
   compute, and it may not introduce a number that is absent from the evidence.
3. Every stochastic process takes a seed (`lib/core/rng.ts`); the reference date fixes ages and
   load windows.
4. Without a provider key, a deterministic fallback produces labelled narration from the same
   evidence — so the product is fully usable offline.

## Consequences
* Numbers are reproducible and unit-testable (151 tests, several asserting honesty such as "no
  trajectory without a season series").
* Narration quality depends on the provider; substance does not.
* Some "smart" features (fuzzy similarity, freeform Q&A) are deliberately constrained to the
  evidence set. That is the point.

## Alternatives considered
* Model-computed metrics — rejected: unauditable and non-reproducible.
* No AI at all — rejected: coaches read prose, not JSON; narration has real value if it is anchored.
