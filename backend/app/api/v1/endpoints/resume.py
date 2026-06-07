"""
app/api/v1/endpoints/resume.py — Resume upload and status endpoints.

Endpoints
---------
POST /resume/upload  — receive file + JD, extract text, create job
GET  /resume/status/{job_id} — poll job status (mirrors frontend PollStatusResponse)
"""
from __future__ import annotations

from typing import Annotated

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile

from app.dependencies import get_request_id
from app.exceptions import JobNotFoundError, ValidationError
from app.models.responses import (
    OptimizationSuggestion,
    StatusResponse,
    UploadResponse,
)
from app.services.extraction_service import extract_file, extract_jd, validate_upload
from app.services.job_store import JobStatus, job_store

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Resume"])


# ── Background task: LLM-powered optimisation ─────────────────────────────────

async def _run_optimisation(job_id: str) -> None:
    """
    Background task that:
      1. Retrieves extracted resume + JD text from the job store
      2. Calls the Groq LLM for ATS optimisation
      3. Validates the response against Pydantic models
      4. Stores the result (or error) in the job store for polling
    """
    log = logger.bind(job_id=job_id)
    log.info("optimisation_started")

    try:
        # Retrieve stored texts
        record = await job_store.get(job_id)
        if record is None:
            log.error("optimisation_job_missing")
            return

        resume_text = record.resume_text
        jd_text = record.jd_text

        if not resume_text or not jd_text:
            await job_store.update(
                job_id,
                status=JobStatus.FAILED,
                error="Missing resume or JD text. Upload may have failed.",
            )
            return

        # Progress: extraction done, starting LLM
        await job_store.update(job_id, progress=30)

        # Call the LLM
        from app.services.llm_service import optimize_resume

        result = await optimize_resume(
            resume_text=resume_text,
            jd_text=jd_text,
            job_id=job_id,
        )

        # Progress: LLM done, finalising
        await job_store.update(job_id, progress=90)

        # Build the final result envelope in camelCase — matches the
        # frontend's OptimizedResumeResponse TypeScript interface exactly.
        final_result = {
            "jobId": job_id,
            "status": "complete",
            "atsScore": result["atsScore"],
            "matchedKeywords": result["matchedKeywords"],
            "missingKeywords": result["missingKeywords"],
            "suggestions": result["suggestions"],
            "optimizedResume": result["optimizedResume"],
            "processingTimeMs": result.get("processingTimeMs"),
        }

        await job_store.update(
            job_id,
            status=JobStatus.COMPLETE,
            progress=100,
            result=final_result,
        )
        log.info("optimisation_complete", ats_score=result["atsScore"])

    except Exception as exc:
        log.exception("optimisation_error", error=str(exc))
        await job_store.update(
            job_id,
            status=JobStatus.FAILED,
            error=f"Optimisation failed: {exc}",
        )


# ── POST /resume/upload ────────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=202,
    summary="Upload resume and job description",
    description=(
        "Accepts a resume file (PDF/DOCX/PNG/JPG) and a job description "
        "(plain text or file). Returns a job_id for polling."
    ),
)
async def upload_resume(
    background_tasks: BackgroundTasks,
    request_id: Annotated[str, Depends(get_request_id)],
    resume_file: UploadFile = File(..., description="Resume: PDF, DOCX, PNG or JPG"),
    job_description: str = Form(default="", description="Raw JD text (optional if jd_file provided)"),
    jd_file: UploadFile | None = File(default=None, description="JD file: PDF, PNG or JPG"),
) -> UploadResponse:
    log = logger.bind(
        request_id=request_id,
        resume_filename=resume_file.filename,
        resume_content_type=resume_file.content_type,
    )
    log.info("upload_received")

    # ── Read resume bytes ──────────────────────────────────────────────────────
    resume_bytes = await resume_file.read()
    resume_mime = validate_upload(
        resume_bytes,
        resume_file.filename or "resume",
        resume_file.content_type,
    )

    # ── Validate & read JD file (optional) ────────────────────────────────────
    jd_bytes: bytes | None = None
    jd_mime: str | None = None
    jd_name: str = "jd_file"

    if jd_file and jd_file.filename:
        jd_bytes = await jd_file.read()
        jd_mime = validate_upload(
            jd_bytes,
            jd_file.filename,
            jd_file.content_type,
        )
        jd_name = jd_file.filename

    # At least one JD source required
    if not job_description.strip() and not jd_bytes:
        raise ValidationError(
            "Provide either job_description text or a jd_file.",
        )

    # ── Extract text ───────────────────────────────────────────────────────────
    resume_text = await extract_file(
        resume_bytes,
        resume_mime,
        resume_file.filename or "resume",
    )

    jd_text, jd_source = await extract_jd(
        text=job_description,
        file_data=jd_bytes,
        file_mime=jd_mime,
        file_name=jd_name,
    )

    log.info(
        "extraction_complete",
        resume_chars=len(resume_text),
        jd_chars=len(jd_text),
        jd_source=jd_source,
    )

    # ── Create job + fire background task ─────────────────────────────────────
    job_id = await job_store.create(resume_text=resume_text, jd_text=jd_text)
    background_tasks.add_task(_run_optimisation, job_id)

    log.info("job_created", job_id=job_id)
    return UploadResponse(job_id=job_id)


# ── GET /resume/status/{job_id} ───────────────────────────────────────────────

@router.get(
    "/status/{job_id}",
    response_model=StatusResponse,
    summary="Poll optimisation job status",
    description="Returns current status, progress (0-100), and result when complete.",
)
async def get_status(
    job_id: str,
    request_id: Annotated[str, Depends(get_request_id)],
) -> StatusResponse:
    record = await job_store.get(job_id)
    if record is None:
        raise JobNotFoundError(
            f"Job '{job_id}' not found.",
            details={"job_id": job_id},
        )

    return StatusResponse(
        job_id=record.job_id,
        status=record.status.value,  # type: ignore[arg-type]
        progress=record.progress,
        result=record.result,        # type: ignore[arg-type]
        error=record.error,
    )
