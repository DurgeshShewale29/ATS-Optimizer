"""
app/main.py — FastAPI application factory with lifespan, CORS, and middleware.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import router as v1_router
from app.config import settings
from app.exceptions import register_exception_handlers
from app.logging_config import configure_logging

logger = structlog.get_logger(__name__)


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown hooks."""
    configure_logging(
        log_level=settings.log_level,
        json_logs=settings.is_production,
    )
    logger.info(
        "server_starting",
        env=settings.app_env,
        version=settings.app_version,
        host=settings.app_host,
        port=settings.app_port,
    )
    yield
    logger.info("server_stopped")


# ── App factory ────────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_title,
        version=settings.app_version,
        description=(
            "Async FastAPI backend for the ATS Resume Optimizer. "
            "Accepts resume files and job descriptions, extracts clean text, "
            "and returns ATS-optimised resume data."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # ── Request-ID response header middleware ─────────────────────────────────
    @app.middleware("http")
    async def add_request_id_header(request: Request, call_next):
        import uuid
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    # ── Exception handlers ────────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(v1_router)

    # ── Root redirect ─────────────────────────────────────────────────────────
    @app.get("/", include_in_schema=False)
    async def root():
        return JSONResponse({"message": "ATS Resume Optimizer API", "docs": "/docs"})

    return app


app = create_app()
