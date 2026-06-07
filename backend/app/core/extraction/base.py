"""
app/core/extraction/base.py — Abstract base class for all extractors.

Each extractor receives raw bytes + MIME type and returns a plain string.
Running synchronous I/O libraries (pdfplumber, docx) in asyncio is handled
by the caller via asyncio.to_thread().
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class BaseExtractor(ABC):
    """Contract all concrete extractors must fulfil."""

    @abstractmethod
    def extract(self, data: bytes, filename: str = "") -> str:
        """
        Extract plain text from raw file bytes.

        Args:
            data:     Raw file bytes.
            filename: Original filename (used for logging / error context).

        Returns:
            Raw extracted string (not yet normalised).

        Raises:
            ExtractionError: If text could not be extracted.
            EmptyDocumentError: If the document contains no extractable text.
        """
        ...

    @property
    @abstractmethod
    def supported_mime_types(self) -> frozenset[str]:
        """MIME types this extractor handles."""
        ...
