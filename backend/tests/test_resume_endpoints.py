"""tests/test_resume_endpoints.py — Integration tests for resume API endpoints."""
from __future__ import annotations

import io
import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.anyio


class TestHealth:
    async def test_health_ok(self, client: AsyncClient):
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data


class TestUpload:
    async def test_upload_docx_with_text_jd(
        self, client: AsyncClient, sample_docx_bytes: bytes
    ):
        resp = await client.post(
            "/api/v1/resume/upload",
            files={"resume_file": ("resume.docx", sample_docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"job_description": "We are looking for a Senior Python Engineer with FastAPI experience " * 3},
        )
        assert resp.status_code == 202
        body = resp.json()
        assert "job_id" in body
        assert body["status"] == "processing"

    async def test_upload_missing_jd_returns_400(
        self, client: AsyncClient, sample_docx_bytes: bytes
    ):
        resp = await client.post(
            "/api/v1/resume/upload",
            files={"resume_file": ("resume.docx", sample_docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"job_description": ""},
        )
        assert resp.status_code in (400, 422)

    async def test_upload_unsupported_type_returns_415(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/resume/upload",
            files={"resume_file": ("resume.txt", b"plain text resume", "text/plain")},
            data={"job_description": "Python engineer role " * 5},
        )
        assert resp.status_code == 415

    async def test_upload_too_large_returns_413(self, client: AsyncClient):
        big = b"x" * (11 * 1024 * 1024)  # 11 MB
        resp = await client.post(
            "/api/v1/resume/upload",
            files={"resume_file": ("big.pdf", big, "application/pdf")},
            data={"job_description": "Python engineer role " * 5},
        )
        assert resp.status_code == 413


class TestStatus:
    async def test_unknown_job_returns_404(self, client: AsyncClient):
        resp = await client.get("/api/v1/resume/status/non-existent-id")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "JOB_NOT_FOUND"

    async def test_status_after_upload(
        self, client: AsyncClient, sample_docx_bytes: bytes
    ):
        upload = await client.post(
            "/api/v1/resume/upload",
            files={"resume_file": ("resume.docx", sample_docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"job_description": "Senior Python FastAPI developer needed " * 3},
        )
        job_id = upload.json()["job_id"]

        status = await client.get(f"/api/v1/resume/status/{job_id}")
        assert status.status_code == 200
        body = status.json()
        assert body["job_id"] == job_id
        assert body["status"] in ("processing", "complete", "failed")
        assert 0 <= body["progress"] <= 100
