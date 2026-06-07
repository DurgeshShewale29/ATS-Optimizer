"""
app/exceptions.py — Custom exception hierarchy + FastAPI exception handlers.

All HTTP errors return a uniform JSON envelope:
    {
        "error": {
            "code":    "SNAKE_CASE_CODE",
            "message": "Human readable message",
            "details": {}          # optional extra context
        }
    }
"""
from __future__ import annotations

from typing import Any

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = structlog.get_logger(__name__)


# ── Exception classes ──────────────────────────────────────────────────────────

class ATSBaseError(Exception):
    """Base class for all application errors."""

    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class UnsupportedFileTypeError(ATSBaseError):
    status_code = 415
    code = "UNSUPPORTED_FILE_TYPE"


class FileTooLargeError(ATSBaseError):
    status_code = 413
    code = "FILE_TOO_LARGE"


class ExtractionError(ATSBaseError):
    status_code = 422
    code = "EXTRACTION_FAILED"


class EmptyDocumentError(ATSBaseError):
    status_code = 422
    code = "EMPTY_DOCUMENT"


class JobNotFoundError(ATSBaseError):
    status_code = 404
    code = "JOB_NOT_FOUND"


class ValidationError(ATSBaseError):
    status_code = 400
    code = "VALIDATION_ERROR"


# ── Response builder ───────────────────────────────────────────────────────────

def _error_response(
    status_code: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            }
        },
    )


# ── Exception handlers ─────────────────────────────────────────────────────────

async def ats_exception_handler(request: Request, exc: ATSBaseError) -> JSONResponse:
    logger.warning(
        "application_error",
        code=exc.code,
        message=exc.message,
        details=exc.details,
        path=str(request.url),
    )
    return _error_response(exc.status_code, exc.code, exc.message, exc.details)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "unhandled_exception",
        exc_type=type(exc).__name__,
        path=str(request.url),
    )
    return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")


# ── Registration helper ────────────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """Attach all handlers to the FastAPI application."""
    app.add_exception_handler(ATSBaseError, ats_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
