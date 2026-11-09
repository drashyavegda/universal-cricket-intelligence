"""Minimal polling worker.

What it actually does today: ticks, checks for a configured queue, and logs. It does **not** process
report jobs — nothing is queued yet. This is intentional: a worker that pretends to work is worse
than no worker.

Run: ``python -m background_workers.worker`` (separate Render background service in phase 4).
"""
from __future__ import annotations

import logging
import signal
import threading
import time

from core.config import settings
from core.logging import configure_logging
from tasks.report_jobs import JOB_QUEUE_AVAILABLE, describe_job_contract

configure_logging(settings.log_level)
logger = logging.getLogger("ucip.worker")

_stop = threading.Event()


def _handle_signal(signum: int, _frame: object) -> None:
    logger.info("worker_signal", extra={"status": signum})
    _stop.set()


def run() -> None:
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    logger.info("worker_start", extra={"env": settings.env})
    if not JOB_QUEUE_AVAILABLE:
        logger.warning(
            "no_job_queue: %s. The worker is idle; report generation happens synchronously in the Next.js app.",
            describe_job_contract(),
        )

    while not _stop.is_set():
        # Placeholder for the phase-4 queue poll. Deliberately no-op.
        logger.info("worker_tick", extra={"duration_ms": 0})
        _stop.wait(settings.worker_poll_seconds)

    logger.info("worker_stop")


if __name__ == "__main__":
    run()
