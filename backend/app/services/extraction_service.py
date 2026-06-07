"""
app/services/extraction_service.py — Orchestrates extractor selection,
async execution, and text normalization.

Public API
----------
    extract_resume(data, mime_type, filename) -> str
    extract_jd(text, file_data, file_mime, file_name) -> str
    validate_upload(data, filename, mime_type) -> None
"""
from __future__ import annotations

import asyncio
import mimetypes
import os
from pathlib import Path

import structlog

from app.config import settings
from app.core.extraction.base import BaseExtractor
from app.core.extraction.docx_extractor import DOCXExtractor
from app.core.extraction.image_extractor import ImageExtractor
from app.core.extraction.normalizer import normalize
from app.core.extraction.pdf_extractor import PDFExtractor
from app.exceptions import (
    EmptyDocumentError,
    ExtractionError,
    FileTooLargeError,
    UnsupportedFileTypeError,
)

logger = structlog.get_logger(__name__)

# ── Extractor registry ─────────────────────────────────────────────────────────

_EXTRACTORS: dict[str, BaseExtractor] = {}

def _get_registry() -> dict[str, BaseExtractor]:
    """Lazy-initialise extractor singletons (avoids import-time side effects)."""
    global _EXTRACTORS
    if not _EXTRACTORS:
        for extractor in (PDFExtractor(), DOCXExtractor(), ImageExtractor()):
            for mime in extractor.supported_mime_types:
                _EXTRACTORS[mime] = extractor
    return _EXTRACTORS


# ── MIME sniffing ──────────────────────────────────────────────────────────────

def _sniff_mime(data: bytes, filename: str) -> str:
    """
    Determine MIME type from file bytes first (magic bytes), then fall back
    to extension. python-magic is preferred; falls back to mimetypes stdlib.
    """
    try:
        import magic  # python-magic
        detected = magic.from_buffer(data[:2048], mime=True)
        if detected and detected != "application/octet-stream":
            return detected
    except ImportError:
        pass

    # Fallback: extension-based
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


# ── Validation ─────────────────────────────────────────────────────────────────

def validate_upload(data: bytes, filename: str, mime_type: str | None = None) -> str:
    """
    Validate file size and type. Returns the resolved MIME type.

    Raises:
        FileTooLargeError
        UnsupportedFileTypeError
    """
    # Size check
    if len(data) > settings.max_file_size_bytes:
        raise FileTooLargeError(
            f"File '{filename}' exceeds the {settings.max_file_size_mb} MB limit.",
            details={"size_bytes": len(data), "limit_bytes": settings.max_file_size_bytes},
        )

    # MIME detection (prefer provided, then sniff)
    resolved_mime = mime_type or _sniff_mime(data, filename)

    # Extension check as secondary guard
    ext = Path(filename).suffix.lower()
    if (
        resolved_mime not in settings.allowed_mime_types
        and ext not in settings.allowed_extensions
    ):
        raise UnsupportedFileTypeError(
            f"File type '{resolved_mime}' is not supported. "
            f"Accepted: PDF, DOCX, PNG, JPG.",
            details={"mime_type": resolved_mime, "extension": ext},
        )

    logger.debug(
        "file_validated",
        filename=filename,
        mime=resolved_mime,
        size_bytes=len(data),
    )
    return resolved_mime


# ── Extraction helpers ─────────────────────────────────────────────────────────

def _extract_sync(data: bytes, mime_type: str, filename: str) -> str:
    """Synchronous extraction — runs inside asyncio.to_thread()."""
    registry = _get_registry()
    extractor = registry.get(mime_type)

    if extractor is None:
        # Last-ditch: try extension mapping
        ext = Path(filename).suffix.lower()
        ext_to_mime = {
            ".pdf":  "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".png":  "image/png",
            ".jpg":  "image/jpeg",
            ".jpeg": "image/jpeg",
        }
        fallback = ext_to_mime.get(ext)
        extractor = registry.get(fallback or "")

    if extractor is None:
        raise UnsupportedFileTypeError(
            f"No extractor registered for '{mime_type}'.",
            details={"mime_type": mime_type, "filename": filename},
        )

    return extractor.extract(data, filename)


async def extract_file(data: bytes, mime_type: str, filename: str) -> str:
    """
    Async wrapper: runs the synchronous extractor in a thread pool,
    then normalises the result.

    Returns:
        Normalised text string.
    """
    log = logger.bind(filename=filename, mime=mime_type)
    log.info("extraction_requested")

    raw = await asyncio.to_thread(_extract_sync, data, mime_type, filename)
    normalised = normalize(raw)

    if not normalised:
        raise EmptyDocumentError(
            f"File '{filename}' produced no text after normalisation.",
            details={"filename": filename},
        )

    log.info("extraction_done", chars=len(normalised))
    return normalised


async def extract_jd(
    text: str = "",
    file_data: bytes | None = None,
    file_mime: str | None = None,
    file_name: str = "jd_file",
) -> tuple[str, str]:
    """
    Extract and normalise job description text from either a plain string
    or an uploaded file. Returns (normalised_text, source) where source is
    "text" or "file".

    Raises:
        EmptyDocumentError if both inputs are empty.
    """
    if file_data and file_mime:
        jd_text = await extract_file(file_data, file_mime, file_name)
        return jd_text, "file"

    normalised = normalize(text)
    if not normalised:
        raise EmptyDocumentError(
            "Job description is empty. Provide text or upload a JD file.",
        )
    return normalised, "text"
