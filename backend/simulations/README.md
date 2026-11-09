# backend/simulations/ — Simulations

Monte Carlo work will move here in phase 4 because it is the one workload that genuinely benefits from
Python (batch loops, no per-request cold-start).

The reference implementation is `lib/core/sim/match.ts` (seeded mulberry32 PRNG). Any Python port must
use the **same seed semantics**, or a scenario replayed against the service will disagree with the app:

* integer seed → identical initial state;
* identical draw order;
* probabilities that sum to 1 after normalisation;
* quantile score bands rather than a single predicted score.

Parity test required before use: fixed seeds × fixed fixtures must produce identical win
probabilities to 4 decimal places, otherwise the port is not accepted.
