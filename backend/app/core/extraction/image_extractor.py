"""
app/core/extraction/image_extractor.py — OCR-based text extraction for PNG/JPG.

Strategy
--------
1. Load bytes with Pillow.
2. Convert to grayscale (L mode).
3. If image is small (< 1000 px wide), upscale 2× to improve OCR accuracy.
4. Apply a mild median filter to reduce scanner noise.
5. Run pytesseract with --psm 4 (single column of variable-size text).
6. Return raw OCR string.

Tesseract binary must be installed on the host:
  - Linux/Mac : apt/brew install tesseract
  - Windows   : https://github.com/UB-Mannheim/tesseract/wiki
                Set TESSERACT_CMD env var to point at the .exe if not on PATH.
"""
from __future__ import annotations

import io
import os

import structlog
from PIL import Image, ImageFilter

from app.core.extraction.base import BaseExtractor
from app.exceptions import EmptyDocumentError, ExtractionError

logger = structlog.get_logger(__name__)

_MIN_WIDTH_FOR_UPSCALE = 1_000   # pixels
_UPSCALE_FACTOR = 2
_MIN_OCR_LENGTH = 20             # chars — below this → likely failed OCR


def _configure_tesseract() -> None:
    """Point pytesseract at the binary if TESSERACT_CMD env var is set."""
    cmd = os.environ.get("TESSERACT_CMD")
    if cmd:
        try:
            import pytesseract
            pytesseract.pytesseract.tesseract_cmd = cmd
        except ImportError:
            pass  # handled below


class ImageExtractor(BaseExtractor):
    """Extract text from PNG/JPG resume images via Tesseract OCR."""

    @property
    def supported_mime_types(self) -> frozenset[str]:
        return frozenset({"image/png", "image/jpeg"})

    def extract(self, data: bytes, filename: str = "") -> str:
        log = logger.bind(extractor="image_ocr", filename=filename, size_bytes=len(data))
        log.debug("image_ocr_start")

        try:
            import pytesseract
        except ImportError as exc:
            raise ExtractionError(
                "pytesseract is not installed. Run: pip install pytesseract",
                details={"filename": filename},
            ) from exc

        _configure_tesseract()

        # ── Load and pre-process ───────────────────────────────────────────────
        try:
            img = Image.open(io.BytesIO(data))
        except Exception as exc:
            log.exception("image_open_error", error=str(exc))
            raise ExtractionError(
                f"Could not open image '{filename}': {exc}",
                details={"filename": filename},
            ) from exc

        # Convert to grayscale
        img = img.convert("L")

        # Upscale small images for better OCR
        w, h = img.size
        if w < _MIN_WIDTH_FOR_UPSCALE:
            img = img.resize(
                (w * _UPSCALE_FACTOR, h * _UPSCALE_FACTOR),
                Image.LANCZOS,  # type: ignore[attr-defined]
            )
            log.debug("image_upscaled", original_width=w, new_width=img.width)

        # Light noise reduction
        img = img.filter(ImageFilter.MedianFilter(size=3))

        # ── OCR ───────────────────────────────────────────────────────────────
        try:
            text: str = pytesseract.image_to_string(
                img,
                lang="eng",
                config="--psm 4 --oem 3",   # PSM 4: single column of variable text
            )
        except Exception as exc:
            log.exception("ocr_error", error=str(exc))
            raise ExtractionError(
                f"OCR failed for image '{filename}': {exc}",
                details={"filename": filename},
            ) from exc

        if len(text.strip()) < _MIN_OCR_LENGTH:
            log.warning(
                "ocr_low_confidence",
                filename=filename,
                chars=len(text.strip()),
                threshold=_MIN_OCR_LENGTH,
            )
            raise EmptyDocumentError(
                f"OCR produced insufficient text from '{filename}'. "
                "Ensure the image is clear and high-resolution.",
                details={"filename": filename, "chars_found": len(text.strip())},
            )

        log.info("image_ocr_complete", chars=len(text))
        return text
