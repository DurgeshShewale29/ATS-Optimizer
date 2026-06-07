"use client";

import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import type { PDFDocumentProps } from "@/hooks/usePDFGenerator";

interface HeaderProps {
  backendOnline?: boolean;
  atsScore?: number | null;
  docProps?: PDFDocumentProps | null;
}

async function downloadPDF(props: PDFDocumentProps) {
  const { pdf } = await import("@react-pdf/renderer");
  const { default: ResumeDocument } = await import("@/components/pdf/ResumeDocument");
  const blob = await pdf(<ResumeDocument {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${props.contact.name.replace(/\s+/g, "_")}_Resume.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadWord(props: PDFDocumentProps) {
  const { downloadWordDocument } = await import("@/lib/wordGenerator");
  await downloadWordDocument(props);
}

export default function Header({ backendOnline = true, atsScore, docProps }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Glassmorphism bar */}
      <div className="relative flex items-center justify-between px-6 h-14 border-b border-white/[0.06] bg-[#080808]/80 backdrop-blur-xl">
        {/* Subtle top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Left — Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight text-white">
              ATS Optimizer
            </span>
            <span className="hidden sm:inline text-xs text-white/50 font-normal">
              by Durgesh Shewale
            </span>
          </div>
        </div>

        {/* Right — Downloads + Score */}
        <div className="flex items-center gap-3">
          {/* Download buttons — only shown when result is ready */}
          {docProps && (
            <div className="flex items-center gap-2">
              <button
                id="header-download-word-btn"
                onClick={() => downloadWord(docProps)}
                title="Download Word"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-blue-500/20 bg-blue-500/[0.06] text-blue-400/70 hover:text-blue-300 hover:bg-blue-500/[0.12] hover:border-blue-500/30 transition-all duration-150 active:scale-95"
              >
                <Download className="w-3 h-3" />
                Word
              </button>
              <button
                id="header-download-pdf-btn"
                onClick={() => downloadPDF(docProps)}
                title="Download PDF"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/[0.1] bg-white/[0.03] text-white/50 hover:text-white/80 hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-150 active:scale-95"
              >
                <Download className="w-3 h-3" />
                PDF
              </button>
            </div>
          )}

          {atsScore !== null && atsScore !== undefined && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07]">
              <span className="text-xs text-white/50">ATS Score</span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  atsScore >= 80
                    ? "text-emerald-400"
                    : atsScore >= 60
                      ? "text-amber-400"
                      : "text-red-400"
                )}
              >
                {atsScore}%
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
