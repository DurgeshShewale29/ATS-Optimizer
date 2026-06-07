import api from "./api";
import type {
  OptimizedResumeResponse,
  PollStatusResponse,
  UploadResumeRequest,
} from "./types";

// ─── Mock data for demo/dev mode ───────────────────────────────────────────────

export const MOCK_OPTIMIZED_RESUME: OptimizedResumeResponse = {
  jobId: "mock-job-001",
  status: "complete",
  atsScore: 87,
  matchedKeywords: [
    "React", "TypeScript", "Next.js", "REST API", "Agile",
    "CI/CD", "Docker", "PostgreSQL", "GraphQL", "Node.js",
  ],
  missingKeywords: ["Kubernetes", "AWS Lambda", "Terraform"],
  suggestions: [
    {
      type: "keyword",
      message: "Add 'Kubernetes' to your skills section — it appears 4× in the JD.",
      priority: "high",
    },
    {
      type: "content",
      message: "Quantify impact in your second experience bullet (e.g., 'reduced load time by 40%').",
      priority: "medium",
    },
    {
      type: "structure",
      message: "Move Skills section above Experience for better ATS parsing.",
      priority: "low",
    },
  ],
  optimizedResume: {
    contact: {
      name: "Alex Johnson",
      email: "alex.johnson@email.com",
      phone: "+1 (555) 234-5678",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/alexjohnson",
      github: "github.com/alexjohnson",
    },
    summary:
      "Full-Stack Software Engineer with 5+ years building scalable web applications using React, TypeScript, and Node.js. Proven track record delivering high-impact features in Agile environments. Experienced with CI/CD pipelines, Docker containerization, and PostgreSQL database optimization.",
    experience: [
      {
        id: "exp-1",
        company: "Acme Corp",
        role: "Senior Software Engineer",
        startDate: "Jan 2022",
        endDate: "Present",
        location: "San Francisco, CA",
        bullets: [
          "Led development of customer-facing Next.js application serving 500K+ monthly active users, improving Lighthouse performance score from 62 to 94.",
          "Designed and implemented GraphQL API layer replacing 12 legacy REST endpoints, reducing average response time by 38%.",
          "Mentored 3 junior engineers, conducted weekly code reviews, and established TypeScript best practices adopted team-wide.",
          "Built automated CI/CD pipeline using GitHub Actions and Docker, cutting deployment time from 45 minutes to under 8 minutes.",
        ],
      },
      {
        id: "exp-2",
        company: "StartupXYZ",
        role: "Software Engineer",
        startDate: "Jun 2019",
        endDate: "Dec 2021",
        location: "Remote",
        bullets: [
          "Developed React component library used across 4 product lines, reducing UI development time by 30%.",
          "Integrated third-party payment APIs (Stripe, PayPal) processing $2M+ in monthly transactions.",
          "Optimized PostgreSQL queries and introduced indexing strategies, improving dashboard load times by 55%.",
        ],
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "University of California, Berkeley",
        degree: "Bachelor of Science",
        field: "Computer Science",
        graduationDate: "May 2019",
        gpa: "3.8",
        honors: "Magna Cum Laude",
      },
    ],
    skills: {
      categories: [
        {
          name: "Languages & Frameworks",
          skills: ["TypeScript", "JavaScript", "Python", "React", "Next.js", "Node.js", "GraphQL"],
        },
        {
          name: "Tools & Platforms",
          skills: ["Docker", "PostgreSQL", "Redis", "GitHub Actions", "Vercel", "AWS"],
        },
        {
          name: "Practices",
          skills: ["Agile/Scrum", "CI/CD", "Test-Driven Development", "Code Review", "REST API Design"],
        },
      ],
    },
    projects: [
      {
        id: "proj-1",
        name: "OpenResume",
        description:
          "Open-source resume builder with real-time PDF preview and ATS optimization. 2.4K GitHub stars.",
        technologies: ["Next.js", "TypeScript", "React PDF", "Tailwind CSS"],
        link: "github.com/alexjohnson/openresume",
      },
    ],
  },
  processingTimeMs: 3200,
};

// ─── Service layer ─────────────────────────────────────────────────────────────

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true" || false;

export const resumeService = {
  /**
   * Upload resume + job description. Returns a jobId for polling.
   */
  async upload(req: UploadResumeRequest): Promise<{ jobId: string }> {
    if (IS_MOCK) {
      await new Promise((r) => setTimeout(r, 1200));
      return { jobId: "mock-job-001" };
    }

    const form = new FormData();
    form.append("resume_file", req.file);
    form.append("job_description", req.jobDescription);
    if (req.jdFile) {
      form.append("jd_file", req.jdFile);
    }

    // Backend returns snake_case { job_id, status, message } — map to camelCase
    const res = await api.post<{ job_id: string; status: string }>("/resume/upload", form, {
      timeout: 60_000,
    });
    return { jobId: res.job_id };
  },

  /**
   * Poll job status until complete or failed.
   */
  async pollStatus(jobId: string): Promise<PollStatusResponse> {
    if (IS_MOCK) {
      await new Promise((r) => setTimeout(r, 800));
      return {
        jobId,
        status: "complete",
        progress: 100,
        result: MOCK_OPTIMIZED_RESUME,
      };
    }

    // Backend returns snake_case fields: { job_id, status, progress, result, error }
    const raw = await api.get<{
      job_id: string;
      status: string;
      progress?: number;
      result?: OptimizedResumeResponse;
      error?: string;
    }>(`/resume/status/${jobId}`);

    return {
      jobId: raw.job_id,
      status: raw.status as PollStatusResponse["status"],
      progress: raw.progress,
      result: raw.result,
      error: raw.error,
    };
  },

  /**
   * Download the final optimized PDF as a Blob.
   */
  async downloadPDF(jobId: string): Promise<Blob> {
    if (IS_MOCK) {
      throw new Error("Download is only available with a live backend.");
    }
    return api.get<Blob>(`/resume/${jobId}/download`);
  },

  /**
   * Cancel a running job.
   */
  async cancelJob(jobId: string): Promise<void> {
    if (IS_MOCK) return;
    await api.delete(`/resume/${jobId}`);
  },
};

export default resumeService;
