"""Report job contract (design only — not wired to any queue).

A report job is *requested evidence*, not a promise of output. The contract records who asked, what
they asked for and which dataset versions the answer depends on, so a generated report can be
reproduced later.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

JOB_QUEUE_AVAILABLE = False  # flip in phase 4 when a real queue (Redis/SQS/pg-boss) is wired

ReportKind = Literal["talent", "player", "team", "venue"]


@dataclass(frozen=True, slots=True)
class ReportJob:
    job_id: str
    kind: ReportKind
    requested_by: str
    options: dict[str, object] = field(default_factory=dict)
    dataset_versions: tuple[str, ...] = ()
    requested_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def validate(self) -> None:
        if not self.job_id:
            raise ValueError("job_id is required")
        if self.kind not in ("talent", "player", "team", "venue"):
            raise ValueError(f"unsupported report kind: {self.kind}")
        if not self.requested_by:
            raise ValueError("requested_by is required")


def describe_job_contract() -> str:
    return (
        "ReportJob(job_id, kind in {talent,player,team,venue}, requested_by, options, "
        "dataset_versions, requested_at)"
    )
