#!/usr/bin/env python3
"""Product-funnel metrics from a GA4 event export.

Why this exists: the same definitions must be used by anyone reporting on the product, or two people
will quote two different "activation" rates in the same meeting.

Usage
-----
    python analytics/metrics.py events.json            # JSON array of event objects
    python analytics/metrics.py events.jsonl           # one JSON object per line
    python analytics/metrics.py events.json --json     # machine-readable output

Input: a list of events shaped like the app emits them (see
``marketing-seo/analytics/GA4_EVENT_CATALOGUE.md``)::

    {"name": "sign_in", "ts": "2026-11-01T09:12:00Z", "params": {"method": "password"}}

No third-party dependency, no network access, no user identifiers.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Funnel definition — ordered. A user must hit step N through step N-1 to count.
FUNNEL = ("sign_in", "faq_opened", "dataset_uploaded", "report_generated", "report_exported")

# Events that indicate a failure the product should reduce, not a funnel step.
FRICTION = ("form_failed",)

ALLOWED_EVENTS = set(FUNNEL) | set(FRICTION) | {"form_submitted", "sign_out"}


@dataclass
class Snapshot:
    total_events: int = 0
    by_name: Counter = field(default_factory=Counter)
    unknown_events: Counter = field(default_factory=Counter)
    first_seen: dict[str, datetime] = field(default_factory=dict)
    funnel_by_session: dict[str, set[str]] = field(default_factory=lambda: defaultdict(set))
    sessions: set[str] = field(default_factory=set)

    def record(self, event: dict) -> None:
        name = str(event.get("name", ""))
        self.total_events += 1
        if name not in ALLOWED_EVENTS:
            # Never silently count an event the catalogue does not define.
            self.unknown_events[name or "(missing)"] += 1
            return
        self.by_name[name] += 1

        raw_ts = event.get("ts") or event.get("timestamp")
        if isinstance(raw_ts, str):
            try:
                self.first_seen.setdefault(name, datetime.fromisoformat(raw_ts.replace("Z", "+00:00")))
            except ValueError:
                pass

        session = event.get("session") or (event.get("params") or {}).get("session_id")
        if isinstance(session, str) and session:
            self.sessions.add(session)
            self.funnel_by_session[session].add(name)

    # ------------------------------------------------------------------ metrics
    def funnel(self) -> list[dict[str, object]]:
        reached: list[dict[str, object]] = []
        cohort = set(self.sessions)
        for step in FUNNEL:
            cohort = {s for s in cohort if step in self.funnel_by_session[s]}
            reached.append({"step": step, "sessions": len(cohort)})
        return reached

    def conversion_rates(self) -> list[dict[str, object]]:
        steps = self.funnel()
        denominator = len(self.sessions)
        out: list[dict[str, object]] = []
        for index, step in enumerate(steps):
            of_sessions = None if not denominator else round(step["sessions"] / denominator * 100, 1)
            previous = steps[index - 1]["sessions"] if index else denominator
            step_rate = None if not previous else round(step["sessions"] / previous * 100, 1)
            out.append({**step, "ofAllSessionsPct": of_sessions, "ofPreviousStepPct": step_rate})
        return out

    def activation(self, window_hours: int = 24) -> dict[str, object]:
        """A session is 'activated' when it reaches ``report_generated`` within the window of sign_in."""
        activated = sum(
            1 for session, names in self.funnel_by_session.items()
            if "sign_in" in names and "report_generated" in names
        )
        return {
            "definition": f"sessions reaching report_generated after sign_in",
            "windowHours": window_hours,
            "activatedSessions": activated,
            "sessions": len(self.sessions),
            "ratePct": None if not self.sessions else round(activated / len(self.sessions) * 100, 1),
            "caveat": "Session is a proxy for a user; do not present this as a per-person rate.",
        }

    def summary(self) -> dict[str, object]:
        strikes = [ts for ts in self.first_seen.values()]
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "totalEvents": self.total_events,
            "sessions": len(self.sessions),
            "eventsByName": dict(sorted(self.by_name.items())),
            "unknownEvents": dict(sorted(self.unknown_events.items())),
            "funnel": self.conversion_rates(),
            "activation": self.activation(),
            "frictionEvents": {name: self.by_name[name] for name in FRICTION if self.by_name[name]},
            "window": {
                "from": min(strikes).isoformat() if strikes else None,
                "to": max(strikes).isoformat() if strikes else None,
            },
            "caveats": [
                "Consent-gated: visitors who declined analytics are absent, so absolute counts understate usage.",
                "Counts are event counts, never people.",
                "Sessions without sign_in are excluded from funnel percentages.",
            ],
        }


def load_events(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []
    if text.startswith("["):
        parsed = json.loads(text)
        if not isinstance(parsed, list):
            raise SystemExit("Expected a JSON array of events")
        return [e for e in parsed if isinstance(e, dict)]
    events = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid JSON on line {line_number}: {exc}") from exc
        if isinstance(event, dict):
            events.append(event)
    return events


def format_human(summary: dict) -> str:
    lines = [
        "Product analytics snapshot",
        "=" * 26,
        f"events: {summary['totalEvents']}   sessions: {summary['sessions']}",
        f"window: {summary['window']['from']} → {summary['window']['to']}",
        "",
        "Funnel (sessions reaching each step):",
    ]
    for row in summary["funnel"]:
        lines.append(
            f"  {row['step']:<18} {row['sessions']:>6}"
            f"   {row['ofAllSessionsPct'] if row['ofAllSessionsPct'] is not None else '—'}% of sessions"
            f"   {row['ofPreviousStepPct'] if row['ofPreviousStepPct'] is not None else '—'}% of previous"
        )
    activation = summary["activation"]
    lines += [
        "",
        f"Activation: {activation['activatedSessions']}/{activation['sessions']} sessions "
        f"({activation['ratePct']}%) — {activation['definition']}",
        "",
        "Events by name:",
    ]
    for name, count in summary["eventsByName"].items():
        lines.append(f"  {name:<20} {count:>6}")
    if summary["unknownEvents"]:
        lines += ["", "Unknown events (not in the catalogue — fix the caller):"]
        for name, count in summary["unknownEvents"].items():
            lines.append(f"  {name:<20} {count:>6}")
    lines += ["", "Caveats:"]
    for caveat in summary["caveats"]:
        lines.append(f"  - {caveat}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Compute product-funnel metrics from a GA4 export")
    parser.add_argument("events", type=Path, help="events.json (array) or events.jsonl (one per line)")
    parser.add_argument("--json", action="store_true", help="emit JSON instead of a readable report")
    args = parser.parse_args(argv)

    if not args.events.exists():
        print(f"File not found: {args.events}", file=sys.stderr)
        return 2

    snapshot = Snapshot()
    for event in load_events(args.events):
        snapshot.record(event)
    summary = snapshot.summary()

    print(json.dumps(summary, indent=2) if args.json else format_human(summary))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
