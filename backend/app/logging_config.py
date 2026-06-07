"""
app/logging_config.py — Structlog setup.

  - Development  : colourised, human-readable console output via rich
  - Production   : newline-delimited JSON (stdout) for log aggregators

Call configure_logging() once at application startup.
"""
from __future__ import annotations

import logging
import sys

import structlog
from structlog.types import EventDict, WrappedLogger


# ── Custom processors ──────────────────────────────────────────────────────────

def _drop_color_message_key(
    logger: WrappedLogger, method: str, event_dict: EventDict
) -> EventDict:
    """Uvicorn duplicates the message in 'color_message'; drop it."""
    event_dict.pop("color_message", None)
    return event_dict


def _add_log_level(
    logger: WrappedLogger, method: str, event_dict: EventDict
) -> EventDict:
    """Ensure 'level' key is always present (structlog doesn't add it by default)."""
    if "level" not in event_dict:
        event_dict["level"] = method.upper()
    return event_dict


# ── Public entry point ─────────────────────────────────────────────────────────

def configure_logging(log_level: str = "DEBUG", *, json_logs: bool = False) -> None:
    """
    Configure structlog + standard-library logging to work together.

    Args:
        log_level:  One of DEBUG | INFO | WARNING | ERROR | CRITICAL
        json_logs:  True in production (emits JSON lines), False for pretty dev output
    """
    level = getattr(logging, log_level.upper(), logging.DEBUG)

    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        _add_log_level,
        _drop_color_message_key,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.stdlib.add_logger_name,
        structlog.processors.StackInfoRenderer(),
    ]

    if json_logs:
        # Production — machine-readable JSON
        renderer = structlog.processors.JSONRenderer()
    else:
        # Development — rich colourised output
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=shared_processors
        + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(level)

    # Quieten noisy third-party loggers in production
    for noisy in ("pdfminer", "PIL", "multipart"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
