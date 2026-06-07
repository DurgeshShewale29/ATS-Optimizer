"""app/models/responses.py — Pydantic response models (mirrors frontend types)."""
from __future__ import annotations

from typing import Literal, Any
from pydantic import BaseModel, Field


# ── Health ─────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    version: str
    environment: str


# ── Upload ─────────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    job_id: str
    status: Literal["processing"] = "processing"
    message: str = "Resume received and extraction started."


# ── Status / Poll ──────────────────────────────────────────────────────────────

class OptimizationSuggestion(BaseModel):
    type: Literal["keyword", "structure", "content", "formatting"]
    message: str
    priority: Literal["high", "medium", "low"]


class ContactInfo(BaseModel):
    name: str
    email: str
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None
    github: str | None = None
    portfolio: str | None = None


class ExperienceItem(BaseModel):
    id: str
    company: str
    role: str
    start_date: str
    end_date: str
    location: str | None = None
    bullets: list[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    id: str
    institution: str
    degree: str
    field: str
    graduation_date: str
    gpa: str | None = None
    honors: str | None = None


class SkillCategory(BaseModel):
    name: str
    skills: list[str]


class SkillsSection(BaseModel):
    categories: list[SkillCategory] = Field(default_factory=list)


class ProjectItem(BaseModel):
    id: str
    name: str
    description: str
    technologies: list[str] = Field(default_factory=list)
    link: str | None = None


class CertificationItem(BaseModel):
    id: str
    name: str
    issuer: str
    date: str


class ResumeData(BaseModel):
    contact: ContactInfo
    summary: str | None = None
    experience: list[ExperienceItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    skills: SkillsSection = Field(default_factory=SkillsSection)
    projects: list[ProjectItem] = Field(default_factory=list)
    certifications: list[CertificationItem] = Field(default_factory=list)


class OptimizedResumeResult(BaseModel):
    job_id: str
    status: Literal["complete"]
    ats_score: int = Field(ge=0, le=100)
    matched_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    suggestions: list[OptimizationSuggestion] = Field(default_factory=list)
    optimized_resume: ResumeData
    processing_time_ms: int | None = None


class StatusResponse(BaseModel):
    job_id: str
    status: Literal["processing", "complete", "failed"]
    progress: int = Field(default=0, ge=0, le=100)
    # Stored and returned as raw camelCase dict to match the frontend TypeScript types
    result: dict[str, Any] | None = None
    error: str | None = None


# ── Extraction (internal) ──────────────────────────────────────────────────────

class ExtractedTexts(BaseModel):
    """Internal model passed from extraction_service to the LLM layer."""
    resume_text: str
    jd_text: str
    resume_file_name: str
    resume_mime_type: str
    jd_source: Literal["text", "file"]
