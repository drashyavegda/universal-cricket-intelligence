"""Cross-cutting concerns for the UCIP API service.

Modules in this package must stay dependency-light and importable without a request context:
config, logging, errors. Anything that needs a request lives in ``middleware`` or ``api``.
"""
