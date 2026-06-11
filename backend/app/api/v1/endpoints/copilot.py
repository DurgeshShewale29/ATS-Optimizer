"""
app/api/v1/endpoints/copilot.py — AI Resume Copilot chat endpoint.

POST /api/v1/copilot/chat
  Body: { message, resumeJson, jdText, history }
  Response: StreamingResponse (text/event-stream / SSE)

Each SSE event is one of:
  data: {"type": "patch", "data": {...}}   — resume patch (sent once, early in stream)
  data: {"type": "token", "data": "..."}   — text reply token (streamed word-by-word)
  data: {"type": "done"}                    — stream complete
  data: {"type": "error", "data": "..."}   — error message
"""
from __future__ import annotations

import json
import re
from typing import Any, AsyncIterator

import structlog
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from groq import AsyncGroq, APIError
from pydantic import BaseModel

from app.config import settings
from app.services.copilot_prompts import build_copilot_user_prompt

logger = structlog.get_logger(__name__)
router = APIRouter()


# ── Request schema ─────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class CopilotChatRequest(BaseModel):
    message: str
    resumeJson: dict[str, Any]
    jdText: str
    history: list[ChatMessage] = []


# ── SSE helpers ────────────────────────────────────────────────────────────────

def _sse(event_type: str, data: Any) -> str:
    """Format a single SSE event line."""
    return f"data: {json.dumps({'type': event_type, 'data': data})}\n\n"


def _sse_done() -> str:
    return "data: {\"type\": \"done\"}\n\n"


def _extract_patch_from_text(text: str) -> tuple[dict | None, str]:
    """
    Try to extract a JSON object from the LLM text response.
    Returns (patch_dict_or_None, clean_reply_string).
    """
    try:
        # The LLM should return a top-level JSON object
        stripped = text.strip()
        if stripped.startswith("```"):
            stripped = re.sub(r"^```(?:json)?\s*\n?", "", stripped)
            stripped = re.sub(r"\n?```\s*$", "", stripped)
            stripped = stripped.strip()

        parsed = json.loads(stripped)
        reply = parsed.get("reply", "")
        patch = parsed.get("patch", None)
        return patch, reply
    except (json.JSONDecodeError, ValueError):
        # Fallback: return raw text as reply, no patch
        return None, text


# ── Stream generator ───────────────────────────────────────────────────────────

async def _stream_copilot(
    request: CopilotChatRequest,
) -> AsyncIterator[str]:
    """
    Core streaming generator. Yields SSE events:
      1. Accumulate entire LLM response (non-streaming JSON mode for reliability)
      2. Parse patch and reply
      3. Send patch event first
      4. Stream reply tokens one-by-one for typewriter effect
    """
    log = logger.bind(message_len=len(request.message))

    client = AsyncGroq(
        api_key=settings.groq_api_key,
        timeout=60.0,
    )

    messages = build_copilot_user_prompt(
        message=request.message,
        resume_json=request.resumeJson,
        jd_text=request.jdText,
        history=[m.model_dump() for m in request.history],
    )

    log.info("copilot_call_start", history_len=len(request.history))

    try:
        # Use non-streaming JSON mode for reliable structured output
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.4,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        log.info("copilot_call_complete", response_chars=len(raw))

        patch, reply = _extract_patch_from_text(raw)

        # 1. Send patch immediately so the frontend can update the PDF
        if patch is not None:
            yield _sse("patch", patch)

        # 2. Stream reply tokens for typewriter effect
        words = reply.split(" ")
        for i, word in enumerate(words):
            token = word if i == 0 else " " + word
            yield _sse("token", token)

        yield _sse_done()

    except APIError as exc:
        log.error("copilot_api_error", error=str(exc))
        yield _sse("error", f"AI service error: {exc.message}")
        yield _sse_done()

    except Exception as exc:
        log.exception("copilot_unexpected_error", error=str(exc))
        yield _sse("error", "An unexpected error occurred. Please try again.")
        yield _sse_done()


# ── Route ──────────────────────────────────────────────────────────────────────

@router.post("/chat")
async def copilot_chat(body: CopilotChatRequest) -> StreamingResponse:
    """
    Stream an AI copilot response that can optionally include a resume patch.
    The client reads SSE events to update the live PDF preview in real time.
    """
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY is not configured on the server.",
        )

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    return StreamingResponse(
        _stream_copilot(body),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
