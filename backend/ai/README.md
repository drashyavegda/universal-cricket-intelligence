# backend/ai/ — AI (deliberately absent)

**No AI code lives here, and it should not.**

Architectural rule (ADR-0002): deterministic engines compute; the AI layer only narrates, and it lives
in the Next.js application (`lib/core/ai/*`) where it sits next to the evidence it is allowed to use
and next to the gateway that enforces the budget.

If a Python-side AI feature ever becomes necessary, it must:
1. accept a fully-prepared evidence block (never raw tables),
2. be forbidden from emitting a number that is absent from that block,
3. carry the same "DEMO NARRATION" fallback when no provider key exists,
4. enforce a monthly budget in the gateway, not in the prompt.
