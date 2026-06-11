"""app/api/v1/router.py — v1 API router: mounts all endpoint sub-routers."""
from fastapi import APIRouter
from app.api.v1.endpoints import health, resume, copilot

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(resume.router, prefix="/resume")
router.include_router(copilot.router, prefix="/copilot", tags=["copilot"])
