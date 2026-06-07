"""
app/core/extraction/normalizer.py — Text normalization pipeline.

Applies a deterministic, ordered set of transformations to raw extracted text,
producing a clean UTF-8 string ready for LLM prompt injection.

Pipeline steps
--------------
1.  ftfy.fix_text()           — fix mojibake / garbled unicode
2.  Strip control characters  — remove zero-width, BOM, non-printable chars
3.  Normalize dashes          — en-dash / em-dash → ASCII hyphen
4.  Normalize whitespace      — tabs / multiple spaces → single space
5.  Normalize line endings    — \\r\\n, \\r → \\n
6.  Remove page numbers       — lone digit lines, "Page X of Y" patterns
7.  Strip running headers     — detect and remove lines repeated 3+ times
8.  Collapse blank lines      — 3+ consecutive blank lines → 2
9.  Final strip               — strip leading/trailing whitespace
"""
from __future__ import annotations

import re
from collections import Counter

import ftfy


# ── Regex constants ────────────────────────────────────────────────────────────

_CONTROL_CHARS = re.compile(
    r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f"   # C0 controls (keep \t \n \r)
    r"\ufeff\u200b-\u200f\u202a-\u202e"   # BOM, zero-width, bidirectional
    r"\u2028\u2029]"                        # Unicode line/paragraph separators
)
_DASH_CHARS = re.compile(r"[\u2010-\u2015\u2212\uff0d]")  # all dash variants
_MULTI_SPACE = re.compile(r"[ \t]+")
_TRAILING_SPACE = re.compile(r"[ \t]+$", re.MULTILINE)
_PAGE_NUMBER = re.compile(
    r"^\s*"
    r"(?:page\s+\d+\s+of\s+\d+|page\s+\d+|\d+)\s*$",
    re.IGNORECASE | re.MULTILINE,
)
_MULTI_BLANK = re.compile(r"\n{3,}")


def _strip_running_headers(text: str, threshold: int = 3) -> str:
    """
    Remove lines that appear identically >= `threshold` times across the document.
    These are typically headers/footers repeated on every page.
    """
    lines = text.split("\n")
    freq = Counter(ln.strip() for ln in lines if ln.strip())
    repeated = {line for line, count in freq.items() if count >= threshold}
    if not repeated:
        return text
    filtered = [ln for ln in lines if ln.strip() not in repeated]
    return "\n".join(filtered)


def normalize(raw: str) -> str:
    """
    Apply the full normalization pipeline and return a clean string.

    Args:
        raw: Raw text as extracted from a PDF, DOCX, or image.

    Returns:
        Normalized, LLM-ready string. May be empty if input had no content.
    """
    if not raw:
        return ""

    # Step 1 — Fix mojibake and garbled unicode
    text = ftfy.fix_text(raw)

    # Step 2 — Strip control characters (preserve \n and space)
    text = _CONTROL_CHARS.sub("", text)

    # Step 3 — Normalize dash variants to ASCII hyphen
    text = _DASH_CHARS.sub("-", text)

    # Step 4 — Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Step 5 — Collapse multiple spaces/tabs (within a line)
    text = _MULTI_SPACE.sub(" ", text)

    # Step 6 — Strip trailing whitespace per line
    text = _TRAILING_SPACE.sub("", text)

    # Step 7 — Remove standalone page numbers
    text = _PAGE_NUMBER.sub("", text)

    # Step 8 — Strip repeated header/footer lines
    text = _strip_running_headers(text, threshold=3)

    # Step 9 — Collapse 3+ consecutive blank lines to 2
    text = _MULTI_BLANK.sub("\n\n", text)

    # Step 10 — Final strip
    return text.strip()
