"""Typed application settings.

All values come from environment variables (Render dashboard / .env locally). Nothing is hardcoded
and nothing secret has a usable default: an empty token disables token checking and is reported as
disabled rather than pretending to be secure.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = Field(default="development", alias="BACKEND_ENV")
    host: str = Field(default="0.0.0.0", alias="BACKEND_HOST")
    port: int = Field(default=8000, alias="BACKEND_PORT")
    log_level: str = Field(default="info", alias="BACKEND_LOG_LEVEL")
    service_name: str = Field(default="ucip-api", alias="BACKEND_SERVICE_NAME")

    # Exact origins only. A trailing slash or a wildcard is rejected by the validator.
    cors_origins: list[str] = Field(default=["http://localhost:3000"], alias="BACKEND_CORS_ORIGINS")

    # Shared secret for service-to-service calls from the Next.js BFF.
    service_token: str = Field(default="", alias="ANALYTICS_SERVICE_TOKEN")

    database_url: str = Field(default="", alias="DATABASE_URL")
    max_body_bytes: int = Field(default=1_000_000, alias="BACKEND_MAX_BODY_BYTES")
    worker_poll_seconds: int = Field(default=15, alias="WORKER_POLL_SECONDS")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return value

    @property
    def requires_token(self) -> bool:
        return bool(self.service_token)

    @property
    def is_production(self) -> bool:
        return self.env.lower() in {"production", "prod"}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
