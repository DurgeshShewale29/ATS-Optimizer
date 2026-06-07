"""
app/services/job_store.py — In-memory job state store.

Thread-safe via asyncio.Lock. Designed behind a Protocol so the
implementation can be swapped for Redis/PostgreSQL with zero changes
to the service layer.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

import structlog
from pydantic import BaseModel, Field

logger = structlog.get_logger(__name__)


# ── Domain types ───────────────────────────────────────────────────────────────

class JobStatus(str, Enum):
    PROCESSING = "processing"
    COMPLETE   = "complete"
    FAILED     = "failed"


class JobRecord(BaseModel):
    job_id:       str
    status:       JobStatus = JobStatus.PROCESSING
    progress:     int       = Field(default=0, ge=0, le=100)
    result:       dict[str, Any] | None = None
    error:        str | None = None
    created_at:   datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at:   datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Internal fields (not exposed via API)
    resume_text:  str = ""
    jd_text:      str = ""


# ── Store ──────────────────────────────────────────────────────────────────────

class InMemoryJobStore:
    """
    Asyncio-safe in-memory job store.

    All mutating operations acquire a lock to prevent race conditions when
    background tasks update the same record concurrently.
    """

    def __init__(self) -> None:
        self._store: dict[str, JobRecord] = {}
        self._lock = asyncio.Lock()

    async def create(self, resume_text: str, jd_text: str) -> str:
        """Create a new job record and return its ID."""
        job_id = str(uuid4())
        record = JobRecord(
            job_id=job_id,
            resume_text=resume_text,
            jd_text=jd_text,
        )
        async with self._lock:
            self._store[job_id] = record
        logger.debug("job_created", job_id=job_id)
        return job_id

    async def get(self, job_id: str) -> JobRecord | None:
        """Return the job record or None if not found."""
        async with self._lock:
            return self._store.get(job_id)

    async def update(
        self,
        job_id: str,
        *,
        status: JobStatus | None = None,
        progress: int | None = None,
        result: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        """Partially update a job record."""
        async with self._lock:
            record = self._store.get(job_id)
            if record is None:
                logger.warning("job_update_missing", job_id=job_id)
                return
            if status   is not None: record.status   = status
            if progress is not None: record.progress  = progress
            if result   is not None: record.result    = result
            if error    is not None: record.error     = error
            record.updated_at = datetime.now(timezone.utc)
        logger.debug("job_updated", job_id=job_id, status=status, progress=progress)


# ── Singleton ──────────────────────────────────────────────────────────────────
# Instantiated once at import time; FastAPI shares this across requests.
job_store = InMemoryJobStore()
