"""Lightweight, dependency-free observability.

No Prometheus client library: a small counter/histogram registry keeps the image slim and avoids a
metrics server dependency on a free tier. If full Prometheus support is needed later, swap this
module — nothing else imports it except ``main.py`` and the ``/metrics`` route.
"""
