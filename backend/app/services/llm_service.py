"""
app/services/llm_service.py — Groq LLM integration for ATS resume optimization.

Uses the OpenAI-compatible Groq client. The service:
  1. Sends sanitized resume + JD text with a strict system prompt
  2. Receives raw JSON from the LLM
  3. Validates the response against Pydantic models
  4. Returns a structurally guaranteed result dict ready for the frontend

Retry logic: up to 2 retries on transient failures (rate limit, timeout).
"""
from __future__ import annotations

import json
import re
import time
import uuid
from typing import Any

import structlog
from groq import AsyncGroq, APIError, APITimeoutError, RateLimitError

from app.config import settings
from app.services.prompts import SYSTEM_PROMPT, build_user_prompt

logger = structlog.get_logger(__name__)

# ── Pydantic validation models (reuse from responses.py) ──────────────────────
# We import these to validate the LLM output structure before passing it on.
from app.models.responses import (
    ContactInfo,
    ExperienceItem,
    EducationItem,
    SkillsSection,
    ProjectItem,
    CertificationItem,
    OptimizationSuggestion,
    ResumeData,
)

MAX_RETRIES = 2
RETRY_DELAYS = [2, 5]  # seconds


def _extract_json(raw: str) -> dict[str, Any]:
    """
    Extract a JSON object from the LLM response.

    Handles common issues:
      - Leading/trailing whitespace
      - Markdown code fences (```json ... ```)
      - Trailing commas (non-standard but LLMs do it)
    """
    text = raw.strip()

    # Strip markdown fences if present
    if text.startswith("```"):
        # Remove opening fence (with optional language tag)
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        # Remove closing fence
        text = re.sub(r"\n?```\s*$", "", text)
        text = text.strip()

    # Attempt direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find the outermost { ... } brace pair
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        substr = text[first_brace : last_brace + 1]
        try:
            return json.loads(substr)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from LLM response (length={len(raw)})")


def _ensure_ids(data: dict[str, Any]) -> dict[str, Any]:
    """
    Ensure every experience/education/project/certification item has a unique 'id'.
    LLMs sometimes return placeholder IDs or skip them entirely.
    """
    resume = data.get("optimizedResume", {})
    for section_key in ("experience", "education", "projects", "certifications"):
        items = resume.get(section_key, [])
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict) and (not item.get("id") or item["id"].startswith("<")):
                    item["id"] = str(uuid.uuid4())
    return data


def _validate_llm_output(data: dict[str, Any]) -> dict[str, Any]:
    """
    Validate the LLM JSON against our Pydantic models for structure checking.

    IMPORTANT: We validate using Pydantic (to catch schema violations early) but
    return the *original* parsed dict — not a Pydantic model_dump() — so that
    camelCase keys from the LLM (startDate, endDate, atsScore…) are preserved
    and flow directly to the frontend without any snake_case conversion.
    """
    resume_raw = data.get("optimizedResume", {})

    # ── Structural validation only (raises ValidationError on bad shape) ───────
    ContactInfo.model_validate(resume_raw.get("contact", {}))

    for e in resume_raw.get("experience", []):
        # Validate using aliases — LLM returns camelCase (startDate, endDate)
        _validate_experience(e)

    for edu in resume_raw.get("education", []):
        _validate_education(edu)

    SkillsSection.model_validate(resume_raw.get("skills", {"categories": []}))

    for p in resume_raw.get("projects", []):
        if not isinstance(p, dict):
            raise ValueError(f"Invalid project item: {p}")

    for c in resume_raw.get("certifications", []):
        if not isinstance(c, dict):
            raise ValueError(f"Invalid certification item: {c}")

    for s in data.get("suggestions", []):
        OptimizationSuggestion.model_validate(s)

    # ── Return the original camelCase dict — NOT a model dump ─────────────────
    return {
        "atsScore": int(data.get("atsScore", 0)),
        "matchedKeywords": data.get("matchedKeywords", []),
        "missingKeywords": data.get("missingKeywords", []),
        "suggestions": data.get("suggestions", []),
        "optimizedResume": resume_raw,  # original camelCase structure from LLM
    }


def _validate_experience(e: dict) -> None:
    """Validate an experience item — accepts both camelCase and snake_case."""
    required = {"id", "company", "role", "bullets"}
    missing = required - e.keys()
    if missing:
        raise ValueError(f"Experience item missing fields: {missing}")
    # Require either camelCase OR snake_case date fields
    has_start = "startDate" in e or "start_date" in e
    has_end = "endDate" in e or "end_date" in e
    if not has_start or not has_end:
        raise ValueError("Experience item missing startDate/endDate fields")


def _validate_education(edu: dict) -> None:
    """Validate an education item — accepts both camelCase and snake_case."""
    required = {"id", "institution", "degree", "field"}
    missing = required - edu.keys()
    if missing:
        raise ValueError(f"Education item missing fields: {missing}")
    has_grad = "graduationDate" in edu or "graduation_date" in edu
    if not has_grad:
        raise ValueError("Education item missing graduationDate field")


async def optimize_resume(
    resume_text: str,
    jd_text: str,
    job_id: str,
) -> dict[str, Any]:
    """
    Call the Groq API to optimize a resume against a job description.

    Args:
        resume_text: Normalized resume text
        jd_text:     Normalized job description text
        job_id:      For logging context

    Returns:
        Validated dict matching the OptimizedResumeResult schema (minus job_id/status).

    Raises:
        ValueError: If the LLM response cannot be parsed or validated
        RuntimeError: If all retry attempts fail
    """
    log = logger.bind(job_id=job_id, model=settings.groq_model)

    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to your .env file. "
            "Get a free key at https://console.groq.com"
        )

    client = AsyncGroq(
        api_key=settings.groq_api_key,
        timeout=settings.llm_timeout_seconds,
    )

    user_message = build_user_prompt(resume_text, jd_text)
    log.info("llm_call_start", resume_chars=len(resume_text), jd_chars=len(jd_text))

    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            start = time.monotonic()

            response = await client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=settings.llm_temperature,
                max_tokens=settings.llm_max_tokens,
                response_format={"type": "json_object"},  # Groq native JSON mode
            )

            elapsed_ms = int((time.monotonic() - start) * 1000)
            raw_content = response.choices[0].message.content or ""

            log.info(
                "llm_call_complete",
                attempt=attempt + 1,
                elapsed_ms=elapsed_ms,
                response_chars=len(raw_content),
                model=response.model,
                usage_prompt=getattr(response.usage, "prompt_tokens", None),
                usage_completion=getattr(response.usage, "completion_tokens", None),
            )

            # Parse JSON from response
            parsed = _extract_json(raw_content)

            # Ensure all items have unique IDs
            parsed = _ensure_ids(parsed)

            # Validate against Pydantic models
            validated = _validate_llm_output(parsed)
            validated["processingTimeMs"] = elapsed_ms

            log.info(
                "llm_validation_passed",
                ats_score=validated["atsScore"],
                matched=len(validated["matchedKeywords"]),
                missing=len(validated["missingKeywords"]),
                suggestions=len(validated["suggestions"]),
            )

            return validated

        except (RateLimitError, APITimeoutError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                delay = RETRY_DELAYS[attempt]
                log.warning(
                    "llm_retryable_error",
                    attempt=attempt + 1,
                    error=str(exc),
                    retry_in_seconds=delay,
                )
                import asyncio
                await asyncio.sleep(delay)
            else:
                log.error("llm_retries_exhausted", error=str(exc))

        except APIError as exc:
            log.error("llm_api_error", status=exc.status_code, error=str(exc))
            raise RuntimeError(f"Groq API error ({exc.status_code}): {exc}") from exc

        except (ValueError, Exception) as exc:
            log.exception("llm_processing_error", attempt=attempt + 1, error=str(exc))
            if attempt >= MAX_RETRIES:
                raise RuntimeError(f"LLM output processing failed: {exc}") from exc
            last_error = exc
            import asyncio
            await asyncio.sleep(RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)])

    raise RuntimeError(f"All {MAX_RETRIES + 1} LLM attempts failed. Last error: {last_error}")
