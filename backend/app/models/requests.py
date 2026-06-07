"""app/models/requests.py — Pydantic request models."""
from __future__ import annotations

from pydantic import BaseModel, Field


class UploadMetadata(BaseModel):
    """Optional JSON body fields that accompany the multipart upload."""
    job_description: str = Field(
        default="",
        max_length=10_000,
        description="Raw job description text (optional if jd_file is provided).",
    )
