"""app/api/v1/endpoints/health.py — Health check endpoint."""
from __future__ import annotations

from fastapi import APIRouter
from app.config import settings
from app.models.responses import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns API status and version. Used by the frontend status indicator.",
)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        environment=settings.app_env,
    )
