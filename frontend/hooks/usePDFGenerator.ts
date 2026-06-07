"use client";

import { useMemo } from "react";
import type { OptimizedResumeResponse } from "@/services/types";

export interface PDFDocumentProps {
  contact: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  summary?: string;
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    location?: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationDate: string;
    gpa?: string;
    honors?: string;
  }>;
  skills: Array<{ name: string; skills: string[] }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    link?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
}

export function usePDFGenerator(
  data: OptimizedResumeResponse | null
): PDFDocumentProps | null {
  return useMemo(() => {
    if (!data?.optimizedResume) return null;

    const r = data.optimizedResume;

    return {
      contact: {
        name: r.contact.name,
        email: r.contact.email,
        phone: r.contact.phone,
        location: r.contact.location,
        linkedin: r.contact.linkedin,
        github: r.contact.github,
        portfolio: r.contact.portfolio,
      },
      summary: r.summary,
      experience: r.experience.map((e) => ({
        company: e.company,
        role: e.role,
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location,
        bullets: e.bullets,
      })),
      education: r.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        graduationDate: e.graduationDate,
        gpa: e.gpa,
        honors: e.honors,
      })),
      skills: r.skills.categories.map((c) => ({
        name: c.name,
        skills: c.skills,
      })),
      projects: r.projects?.map((p) => ({
        name: p.name,
        description: p.description,
        technologies: p.technologies,
        link: p.link,
      })),
      certifications: r.certifications?.map((c) => ({
        name: c.name,
        issuer: c.issuer,
        date: c.date,
      })),
    };
  }, [data]);
}
