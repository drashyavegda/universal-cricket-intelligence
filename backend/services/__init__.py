"""Service layer: pure functions that do the work.

Rule: everything in this package is deterministic given its inputs, does not read the environment,
does not log and does not touch the network. That makes it trivially testable and safe to reuse from
the worker.
"""
