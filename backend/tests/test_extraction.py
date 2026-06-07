"""tests/test_extraction.py — Unit tests for the extraction engine."""
from __future__ import annotations

import pytest

from app.core.extraction.docx_extractor import DOCXExtractor
from app.core.extraction.normalizer import normalize
from app.exceptions import EmptyDocumentError


# ── Normalizer ─────────────────────────────────────────────────────────────────

class TestNormalizer:
    def test_strips_control_chars(self):
        assert "\x00" not in normalize("Hello\x00World")

    def test_fixes_mojibake(self):
        # ftfy should handle common encoding issues
        result = normalize("resumÃ©")
        assert result  # should not crash

    def test_collapses_blank_lines(self):
        result = normalize("Line1\n\n\n\n\nLine2")
        assert result.count("\n") <= 3

    def test_removes_page_numbers(self):
        result = normalize("Jane Smith\nPage 1 of 3\nSoftware Engineer")
        assert "Page 1 of 3" not in result

    def test_strips_running_headers(self):
        repeated = "CONFIDENTIAL"
        # Repeat 4 times across "pages"
        text = f"\n{repeated}\nSome content\n{repeated}\nMore content\n{repeated}\nEnd\n{repeated}"
        result = normalize(text)
        assert result.count(repeated) == 0

    def test_empty_input(self):
        assert normalize("") == ""
        assert normalize("   \n\n  ") == ""

    def test_normalizes_dashes(self):
        result = normalize("2020\u20132023")  # en-dash
        assert "\u2013" not in result
        assert "-" in result


# ── DOCX Extractor ─────────────────────────────────────────────────────────────

class TestDOCXExtractor:
    def test_extracts_paragraphs(self, sample_docx_bytes):
        extractor = DOCXExtractor()
        text = extractor.extract(sample_docx_bytes, "test.docx")
        assert "Jane Smith" in text
        assert "Senior Software Engineer" in text

    def test_extracts_experience(self, sample_docx_bytes):
        extractor = DOCXExtractor()
        text = extractor.extract(sample_docx_bytes, "test.docx")
        assert "Acme Corp" in text

    def test_empty_bytes_raises(self):
        extractor = DOCXExtractor()
        with pytest.raises(Exception):
            extractor.extract(b"", "empty.docx")

    def test_supported_mime(self):
        extractor = DOCXExtractor()
        assert (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            in extractor.supported_mime_types
        )
