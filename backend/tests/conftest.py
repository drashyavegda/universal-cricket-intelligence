from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Allow `pytest` from the backend/ directory without installing the package.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    """Headers for the stats routes; empty dict when no token is configured."""
    if not settings.requires_token:
        return {}
    return {"authorization": f"Bearer {settings.service_token}"}
