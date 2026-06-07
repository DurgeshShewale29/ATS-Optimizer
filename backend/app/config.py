"""
app/config.py — Typed settings via pydantic-settings.

All values are read from environment variables (or a .env file).
Access the singleton via:  from app.config import settings
"""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Annotated

from pydantic import field_validator, AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Server ─────────────────────────────────────────────────────────────────
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_workers: int = 1
    app_title: str = "ATS Resume Optimizer API"
    app_version: str = "1.0.0"

    # ── CORS ───────────────────────────────────────────────────────────────────
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        """Accept either a JSON string or an already-parsed list."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # Single bare origin string
                return [v.strip()]
        return v

    # ── Upload ─────────────────────────────────────────────────────────────────
    max_file_size_mb: int = 10

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    # ── Logging ────────────────────────────────────────────────────────────────
    log_level: str = "DEBUG"

    # ── Tesseract ──────────────────────────────────────────────────────────────
    tesseract_cmd: str | None = None  # None = rely on $PATH

    # ── LLM / Groq ─────────────────────────────────────────────────────────────
    groq_api_key: str = ""                          # GROQ_API_KEY env var
    groq_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"  # fast + capable
    llm_temperature: float = 0.3                    # low for deterministic JSON
    llm_max_tokens: int = 4096
    llm_timeout_seconds: int = 60

    # ── Derived helpers ────────────────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def allowed_mime_types(self) -> frozenset[str]:
        return frozenset(
            {
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "image/png",
                "image/jpeg",
            }
        )

    @property
    def allowed_extensions(self) -> frozenset[str]:
        return frozenset({".pdf", ".docx", ".png", ".jpg", ".jpeg"})


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


# Convenience singleton
settings: Settings = get_settings()
