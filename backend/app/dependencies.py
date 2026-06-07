"""app/dependencies.py — Shared FastAPI Depends() factories."""
from __future__ import annotations

import uuid
from fastapi import Request
import structlog


async def get_request_id(request: Request) -> str:
    """Return or generate a unique request ID, bound to structlog context."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        path=str(request.url.path),
        method=request.method,
    )
    return request_id
