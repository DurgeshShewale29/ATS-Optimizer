"""
app/core/extraction/docx_extractor.py — DOCX text extraction via python-docx.

Strategy
--------
1. Iterate document.paragraphs — preserves heading hierarchy and list order.
2. Iterate all tables recursively: row → cell → nested paragraphs.
3. Walk XML body in document order so text appears in reading sequence.
4. Extract headers and footers separately, then discard (noise for ATS).
5. Skip runs that are marked as deleted (tracked changes / redlines).
6. Skip whitespace-only paragraphs.
"""
from __future__ import annotations

import io
from typing import Iterator

import structlog
from docx import Document
from docx.document import Document as DocumentClass
from docx.oxml.ns import qn
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph

from app.core.extraction.base import BaseExtractor
from app.exceptions import EmptyDocumentError, ExtractionError

logger = structlog.get_logger(__name__)


def _iter_block_items(parent: Document | _Cell) -> Iterator[Paragraph | Table]:
    """
    Yield Paragraph and Table objects in document order from any parent element.
    Works for the main document body and for table cells (handles nested tables).
    """
    parent_elm = parent.element.body if isinstance(parent, DocumentClass) else parent._tc  # type: ignore[union-attr]
    for child in parent_elm.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, parent)
        elif child.tag == qn("w:tbl"):
            yield Table(child, parent)


def _paragraph_text(para: Paragraph) -> str:
    """Extract text from a paragraph, skipping deleted runs (tracked changes)."""
    parts: list[str] = []
    for run in para.runs:
        # Skip runs inside <w:del> (track-change deletions)
        parent_tag = run._r.getparent().tag if run._r.getparent() is not None else ""  # type: ignore[union-attr]
        if "del" in parent_tag.lower():
            continue
        parts.append(run.text)
    return "".join(parts)


def _table_to_lines(table: Table) -> list[str]:
    """Recursively convert a table (and nested tables) to text lines."""
    lines: list[str] = []
    for row in table.rows:
        cell_texts: list[str] = []
        for cell in row.cells:
            # Recurse into block items to handle nested tables
            cell_parts: list[str] = []
            for item in _iter_block_items(cell):
                if isinstance(item, Paragraph):
                    txt = _paragraph_text(item)
                    if txt.strip():
                        cell_parts.append(txt.strip())
                elif isinstance(item, Table):
                    cell_parts.extend(_table_to_lines(item))
            if cell_parts:
                cell_texts.append(" ".join(cell_parts))
        if cell_texts:
            lines.append(" | ".join(cell_texts))
    return lines


class DOCXExtractor(BaseExtractor):
    """Extract text from .docx files using python-docx."""

    @property
    def supported_mime_types(self) -> frozenset[str]:
        return frozenset(
            {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
        )

    def extract(self, data: bytes, filename: str = "") -> str:
        log = logger.bind(extractor="docx", filename=filename, size_bytes=len(data))
        log.debug("docx_extraction_start")

        try:
            doc = Document(io.BytesIO(data))
        except Exception as exc:
            log.exception("docx_open_error", error=str(exc))
            raise ExtractionError(
                f"Could not open DOCX file '{filename}': {exc}",
                details={"filename": filename},
            ) from exc

        try:
            lines: list[str] = []

            for item in _iter_block_items(doc):
                if isinstance(item, Paragraph):
                    txt = _paragraph_text(item)
                    if txt.strip():
                        lines.append(txt)
                elif isinstance(item, Table):
                    lines.extend(_table_to_lines(item))

        except Exception as exc:
            log.exception("docx_parse_error", error=str(exc))
            raise ExtractionError(
                f"Failed to parse DOCX content in '{filename}': {exc}",
                details={"filename": filename},
            ) from exc

        full_text = "\n".join(lines)

        if not full_text.strip():
            log.warning("docx_empty_document", filename=filename)
            raise EmptyDocumentError(
                f"DOCX file '{filename}' contains no readable text.",
                details={"filename": filename},
            )

        log.info("docx_extraction_complete", chars=len(full_text), lines=len(lines))
        return full_text
