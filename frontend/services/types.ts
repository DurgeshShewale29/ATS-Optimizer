// ─── Shared Types ──────────────────────────────────────────────────────────────

export type AppState = "idle" | "uploading" | "processing" | "success" | "error";

// ─── Resume Data Model ─────────────────────────────────────────────────────────

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  location?: string;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa?: string;
  honors?: string;
}

export interface SkillsSection {
  categories: SkillCategory[];
}

export interface SkillCategory {
  name: string;
  skills: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link?: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export type ResumeSectionType =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

export interface ResumeData {
  contact: ContactInfo;
  summary?: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillsSection;
  projects?: ProjectItem[];
  certifications?: CertificationItem[];
}

// ─── API Request / Response ────────────────────────────────────────────────────

export interface UploadResumeRequest {
  file: File;
  jobDescription: string;
  jdFile?: File | null;
}

export interface OptimizationSuggestion {
  type: "keyword" | "structure" | "content" | "formatting";
  message: string;
  priority: "high" | "medium" | "low";
}

export interface OptimizedResumeResponse {
  jobId: string;
  status: "processing" | "complete" | "failed";
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: OptimizationSuggestion[];
  optimizedResume: ResumeData;
  processingTimeMs?: number;
}

export interface PollStatusResponse {
  jobId: string;
  status: "processing" | "complete" | "failed";
  progress?: number; // 0–100
  result?: OptimizedResumeResponse;
  error?: string;
}

// ─── API Error ─────────────────────────────────────────────────────────────────

export interface APIErrorPayload {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ─── UI State ──────────────────────────────────────────────────────────────────

export interface DropZoneState {
  isDragOver: boolean;
  file: File | null;
  error: string | null;
}

export interface OptimizerState {
  appState: AppState;
  jobId: string | null;
  progress: number;
  optimizedData: OptimizedResumeResponse | null;
  error: string | null;
}
