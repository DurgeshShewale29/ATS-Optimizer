"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import Header from "@/components/layout/Header";
import DropZone from "@/components/upload/DropZone";
import JDInput from "@/components/jd/JDInput";
import AnalyzeButton from "@/components/controls/AnalyzeButton";
import PDFPreview from "@/components/pdf/PDFPreview";
import PDFSkeleton from "@/components/pdf/PDFSkeleton";
import InsightsPanel from "@/components/insights/InsightsPanel";
import Toast, { useToast } from "@/components/ui/Toast";
import { useResumeOptimizer } from "@/hooks/useResumeOptimizer";
import { usePDFGenerator } from "@/hooks/usePDFGenerator";
import { FileText, Wand2 } from "lucide-react";

export default function Home() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<"preview" | "insights">("preview");

  const { toasts, addToast, dismiss } = useToast();
  const optimizer = useResumeOptimizer();
  const pdfProps = usePDFGenerator(optimizer.optimizedData);

  const canAnalyze =
    resumeFile !== null &&
    (jobDescription.trim().length >= 50 || jdFile !== null) &&
    optimizer.appState === "idle";

  const handleAnalyze = useCallback(async () => {
    if (!resumeFile || (!jobDescription.trim() && !jdFile)) return;
    try {
      await optimizer.upload(resumeFile, jobDescription, jdFile);
      addToast({ type: "success", title: "Resume optimized!", description: "Your ATS-ready resume is ready to download." });
    } catch {
      addToast({ type: "error", title: "Optimization failed", description: optimizer.error ?? "Please try again." });
    }
  }, [resumeFile, jobDescription, jdFile, optimizer, addToast]);

  const handleReset = useCallback(() => {
    optimizer.reset();
    setResumeFile(null);
    setJobDescription("");
    setJdFile(null);
  }, [optimizer]);

  const isRightLoading =
    optimizer.appState === "uploading" || optimizer.appState === "processing";

  const showPreview = optimizer.appState === "success" && pdfProps !== null;

  return (
    <div className="gradient-mesh min-h-screen flex flex-col">
      <Header
        backendOnline={optimizer.appState !== "error"}
        atsScore={optimizer.optimizedData?.atsScore ?? null}
        docProps={pdfProps}
      />

      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* ── LEFT PANE ────────────────────────────────────── */}
        <section
          aria-label="Resume input"
          className={cn(
            "flex flex-col gap-6 p-6 lg:p-8",
            "w-full lg:w-[440px] xl:w-[480px] flex-shrink-0",
            "border-b lg:border-b-0 lg:border-r border-white/[0.06]",
            "overflow-y-auto",
          )}
        >
          {/* Section label */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center">
              <FileText className="w-3 h-3 text-accent" strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Your Resume
            </span>
          </div>

          {/* Drop zone */}
          <div className="space-y-2">
            <DropZone
              onFileChange={(f) => setResumeFile(f)}
              disabled={isRightLoading}
            />
            {!resumeFile && (
              <p className="text-xs text-white/20 px-1">
                Upload your current resume to get started
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.05]" />
            <div className="w-6 h-6 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
              <Wand2 className="w-3 h-3 text-white/20" />
            </div>
            <div className="flex-1 h-px bg-white/[0.05]" />
          </div>

          {/* JD Input */}
          <JDInput
            value={jobDescription}
            onChange={setJobDescription}
            file={jdFile}
            onFileChange={setJdFile}
            disabled={isRightLoading}
          />

          {/* Validation hint */}
          {!jdFile && jobDescription.length > 0 && jobDescription.trim().length < 50 && (
            <p className="text-xs text-amber-400/60 px-1 -mt-3 animate-[fade-in_0.2s_ease-out]">
              Add at least 50 characters for meaningful analysis
            </p>
          )}

          {/* CTA */}
          <div className="mt-auto pt-2">
            <AnalyzeButton
              appState={optimizer.appState}
              disabled={!canAnalyze}
              progress={optimizer.progress}
              onClick={handleAnalyze}
              onReset={handleReset}
            />

            {optimizer.error && (
              <p className="text-xs text-red-400/70 mt-2 px-1 animate-[fade-in_0.2s_ease-out]">
                {optimizer.error}
              </p>
            )}

            {optimizer.appState === "idle" && (
              <p className="text-xs text-white/20 text-center mt-3">
                Processing takes ~10–30 seconds
              </p>
            )}
          </div>
        </section>

        {/* ── RIGHT PANE ───────────────────────────────────── */}
        <section
          aria-label="Optimized resume output"
          className="flex-1 flex flex-col p-6 lg:p-8 overflow-hidden min-h-[600px]"
        >
          {/* Tab bar — only when results are available */}
          {showPreview && (
            <div className="flex items-center justify-between mb-2 w-full">
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] w-fit">
                {(["preview", "insights"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveRightTab(tab)}
                    className={cn(
                      "px-8 py-2 rounded-xl text-sm font-medium transition-all duration-200 capitalize tracking-wide",
                      activeRightTab === tab
                        ? "bg-white/[0.08] text-white/90 shadow-sm border border-white/[0.04]"
                        : "text-white/40 hover:text-white/70"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pr-1">
                {activeRightTab === "preview" && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
                <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  {activeRightTab === "preview" ? "Live Preview" : "Insights"}
                </span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Idle empty state */}
            {optimizer.appState === "idle" && (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
                {/* Decorative orb */}
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-accent/5 blur-2xl animate-pulse" />
                  <div className="absolute inset-4 rounded-full bg-accent/[0.08] border border-accent/10" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-accent/30" strokeWidth={1} />
                  </div>
                </div>
                <div>
                  <p className="text-base font-semibold text-white/40 mb-2">
                    Your optimized resume will appear here
                  </p>
                  <p className="text-sm text-white/20 max-w-xs leading-relaxed">
                    Upload your resume and paste a job description, then click Optimize Resume
                  </p>
                </div>
                {/* Feature chips */}
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {["ATS keyword matching", "Live PDF preview", "One-click download"].map((f) => (
                    <span
                      key={f}
                      className="px-3 py-1 rounded-full text-xs text-white/25 border border-white/[0.06] bg-white/[0.02]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {isRightLoading && (
              <PDFSkeleton
                message={
                  optimizer.appState === "uploading"
                    ? "Uploading your resume…"
                    : "AI is optimizing your resume…"
                }
                progress={optimizer.progress}
              />
            )}

            {/* Success — PDF preview tab */}
            {showPreview && activeRightTab === "preview" && pdfProps && (
              <PDFPreview
                docProps={pdfProps}
                atsScore={optimizer.optimizedData?.atsScore}
              />
            )}

            {/* Success — Insights tab */}
            {showPreview && activeRightTab === "insights" && optimizer.optimizedData && (
              <div className="animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)]">
                <InsightsPanel data={optimizer.optimizedData} />
              </div>
            )}

            {/* Error state */}
            {optimizer.appState === "error" && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/60 mb-1">Something went wrong</p>
                  <p className="text-xs text-white/30">{optimizer.error}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
