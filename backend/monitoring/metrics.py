"""In-process counters and latency buckets, exposed as Prometheus-style text."""
from __future__ import annotations

import time
from collections import Counter
from threading import Lock

LATENCY_BUCKETS_MS = (25, 50, 100, 250, 500, 1000, 2500)
MAX_DISTINCT_LABELS = 200


class Metrics:
    def __init__(self) -> None:
        self._counters: Counter[str] = Counter()
        self._latency_sum_ms = 0.0
        self._latency_count = 0
        self._buckets: Counter[float] = Counter({float(b): 0 for b in LATENCY_BUCKETS_MS})
        self._started = time.time()
        self._lock = Lock()

    def increment(self, name: str, amount: int = 1) -> None:
        with self._lock:
            if len(self._counters) < MAX_DISTINCT_LABELS:
                self._counters[name] += amount

    def observe_latency(self, elapsed_ms: float) -> None:
        with self._lock:
            self._latency_sum_ms += elapsed_ms
            self._latency_count += 1
            for bound in LATENCY_BUCKETS_MS:
                if elapsed_ms <= bound:
                    self._buckets[float(bound)] += 1

    def render(self) -> str:
        lines = [
            "# HELP ucip_uptime_seconds Seconds since process start",
            "# TYPE ucip_uptime_seconds gauge",
            f"ucip_uptime_seconds {time.time() - self._started:.1f}",
        ]
        with self._lock:
            for name, value in sorted(self._counters.items()):
                lines += [f"# TYPE ucip_{name} counter", f"ucip_{name} {value}"]
            lines += ["# TYPE ucip_request_duration_ms summary",
                      f"ucip_request_duration_ms_sum {self._latency_sum_ms:.1f}",
                      f"ucip_request_duration_ms_count {self._latency_count}"]
            for bound, count in sorted(self._buckets.items()):
                lines.append(f'ucip_request_duration_ms_bucket{{le="{bound}"}} {count}')
        return "\n".join(lines) + "\n"


metrics = Metrics()
