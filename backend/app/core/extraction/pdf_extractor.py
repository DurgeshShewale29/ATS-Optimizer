"""
app/core/extraction/pdf_extractor.py — Layout-aware PDF text extraction.

Strategy
--------
1. Open with pdfplumber (built on pdfminer).
2. Per page:
   a. Sort words by (top, x0) — preserves reading order for multi-column layouts.
   b. Extract tables separately → convert cells to pipe-delimited rows.
   c. Exclude text that overlaps table bounding boxes (avoids duplication).
   d. Skip content in the top/bottom 7 % of the page (headers/footers).
3. If the entire document yields < 50 chars, the PDF is likely scanned →
   raise ExtractionError so the caller can fall back to OCR.
4. Join pages with double newlines.
"""
from __future__ import annotations

import io
import logging
from typing import Any

import pdfplumber
import structlog

from app.core.extraction.base import BaseExtractor
from app.exceptions import EmptyDocumentError, ExtractionError

logger = structlog.get_logger(__name__)

_MIN_TEXT_LENGTH = 50          # below this → treat as scanned / image-only PDF
_HEADER_FOOTER_MARGIN = 0.07   # fraction of page height to exclude top + bottom


def _bbox_to_bboxes(table_bbox: tuple[float, float, float, float]) -> dict[str, Any]:
    """Return a pdfplumber bounding-box filter dict for crop/within operations."""
    x0, top, x1, bottom = table_bbox
    return {"x0": x0, "top": top, "x1": x1, "bottom": bottom}


def _table_to_text(table: list[list[str | None]]) -> str:
    """Convert a 2-D table (list of rows) into readable pipe-delimited lines."""
    rows: list[str] = []
    for row in table:
        cells = [str(cell).strip() if cell is not None else "" for cell in row]
        # Skip fully empty rows
        if any(cells):
            rows.append(" | ".join(cells))
    return "\n".join(rows)


class PDFExtractor(BaseExtractor):
    """Extract text from PDF files using pdfplumber."""

    @property
    def supported_mime_types(self) -> frozenset[str]:
        return frozenset({"application/pdf"})

    def extract(self, data: bytes, filename: str = "") -> str:  # noqa: C901
        log = logger.bind(extractor="pdf", filename=filename, size_bytes=len(data))
        log.debug("pdf_extraction_start")

        try:
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                n_pages = len(pdf.pages)
                log.debug("pdf_opened", pages=n_pages)

                page_texts: list[str] = []

                for page_num, page in enumerate(pdf.pages, start=1):
                    page_height = page.height or 1.0
                    header_bottom = page_height * _HEADER_FOOTER_MARGIN
                    footer_top = page_height * (1.0 - _HEADER_FOOTER_MARGIN)

                    # ── Extract tables first ──────────────────────────────────
                    tables = page.extract_tables() or []
                    table_bboxes: list[tuple[float, float, float, float]] = []
                    table_texts: list[str] = []

                    for tbl_obj in page.find_tables():
                        table_bboxes.append(tbl_obj.bbox)
                        extracted = tbl_obj.extract()
                        if extracted:
                            table_texts.append(_table_to_text(extracted))

                    # ── Extract body words (excluding table regions + header/footer)
                    words = page.extract_words(
                        x_tolerance=3,
                        y_tolerance=3,
                        keep_blank_chars=False,
                        use_text_flow=True,
                    ) or []

                    body_words: list[str] = []
                    for w in words:
                        top = float(w.get("top", 0))
                        bottom = float(w.get("bottom", page_height))

                        # Skip header / footer region
                        if top < header_bottom or bottom > footer_top:
                            continue

                        # Skip words inside table bounding boxes
                        x0 = float(w.get("x0", 0))
                        x1 = float(w.get("x1", 0))
                        in_table = any(
                            (tx0 <= x0 <= tx1 and ttop <= top <= tbot)
                            for tx0, ttop, tx1, tbot in table_bboxes
                        )
                        if not in_table:
                            body_words.append(w["text"])

                    body_text = " ".join(body_words)

                    # Combine body + tables for this page
                    parts = [p for p in [body_text, "\n".join(table_texts)] if p.strip()]
                    page_texts.append("\n".join(parts))
                    log.debug("pdf_page_done", page=page_num, chars=len(parts))

                # ── Extract hyperlink annotations (LinkedIn, GitHub, etc.) ────
                hyperlinks: list[str] = []
                for page in pdf.pages:
                    for annot in (page.annots or []):
                        uri = annot.get("uri") or annot.get("URI")
                        if uri and isinstance(uri, str) and uri.startswith("http"):
                            hyperlinks.append(uri)

                full_text = "\n\n".join(pt for pt in page_texts if pt.strip())

                if hyperlinks:
                    unique_links = list(dict.fromkeys(hyperlinks))  # dedupe, preserve order
                    full_text += "\n\n[HYPERLINKS FOUND IN DOCUMENT]\n" + "\n".join(unique_links)
                    log.debug("pdf_hyperlinks_found", count=len(unique_links))

        except Exception as exc:
            log.exception("pdf_extraction_error", error=str(exc))
            raise ExtractionError(
                f"Failed to extract text from PDF '{filename}': {exc}",
                details={"filename": filename},
            ) from exc

        if len(full_text.strip()) < _MIN_TEXT_LENGTH:
            log.warning(
                "pdf_likely_scanned",
                chars=len(full_text.strip()),
                threshold=_MIN_TEXT_LENGTH,
            )
            raise ExtractionError(
                f"PDF '{filename}' appears to be scanned (no selectable text). "
                "Upload as an image for OCR processing.",
                details={"filename": filename, "chars_found": len(full_text.strip())},
            )

        log.info("pdf_extraction_complete", chars=len(full_text))
        return full_text

