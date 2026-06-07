"use client";

import { cn } from "@/lib/utils";

interface SkeletonBlockProps {
  className?: string;
  width?: string;
}

function SkeletonLine({ className, width = "100%" }: SkeletonBlockProps) {
  return (
    <div
      className={cn("skeleton h-2.5 rounded-sm", className)}
      style={{ width }}
    />
  );
}

function SkeletonSection({ title = true }: { title?: boolean }) {
  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center gap-3">
          <SkeletonLine width="28%" className="h-3" />
          <div className="flex-1 h-px skeleton opacity-40 rounded-none" />
        </div>
      )}
      <div className="space-y-2.5">
        <SkeletonLine width="92%" />
        <SkeletonLine width="85%" />
        <SkeletonLine width="78%" />
        <SkeletonLine width="60%" />
      </div>
    </div>
  );
}

interface PDFSkeletonProps {
  message?: string;
  progress?: number;
}

export default function PDFSkeleton({ message, progress }: PDFSkeletonProps) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start overflow-hidden">
      {/* Paper shadow */}
      <div
        className="relative w-full max-w-[680px] mx-auto rounded-xl overflow-hidden"
        style={{
          background: "#141414",
          boxShadow: "0 4px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04)",
          minHeight: "880px",
        }}
      >
        {/* Top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

        {/* Skeleton content — mimics resume layout */}
        <div className="p-10 space-y-8">
          {/* Header block */}
          <div className="space-y-3 pb-6 border-b border-white/[0.05]">
            <SkeletonLine width="45%" className="h-5 rounded-md" />
            <div className="flex gap-4 flex-wrap">
              <SkeletonLine width="22%" className="h-2" />
              <SkeletonLine width="18%" className="h-2" />
              <SkeletonLine width="20%" className="h-2" />
              <SkeletonLine width="16%" className="h-2" />
            </div>
          </div>

          {/* Summary */}
          <SkeletonSection title />

          {/* Experience */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <SkeletonLine width="24%" className="h-3" />
              <div className="flex-1 h-px skeleton opacity-40 rounded-none" />
            </div>
            {[0, 1].map((i) => (
              <div key={i} className="space-y-2.5 pl-0">
                <div className="flex items-baseline justify-between">
                  <SkeletonLine width="38%" className="h-3" />
                  <SkeletonLine width="18%" className="h-2.5" />
                </div>
                <SkeletonLine width="26%" className="h-2" />
                <div className="space-y-2 mt-2">
                  <SkeletonLine width="95%" />
                  <SkeletonLine width="88%" />
                  <SkeletonLine width="72%" />
                </div>
              </div>
            ))}
          </div>

          {/* Education */}
          <SkeletonSection title />

          {/* Skills */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <SkeletonLine width="18%" className="h-3" />
              <div className="flex-1 h-px skeleton opacity-40 rounded-none" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[60, 80, 50, 70, 90, 55, 65, 75].map((w, i) => (
                <div key={i} className={cn("skeleton h-6 rounded-md")} style={{ width: `${w}px` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Overlay with status */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141414]/70 backdrop-blur-[2px]">
          {/* Spinner ring */}
          <div className="relative w-12 h-12 mb-5">
            <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
            <div className="absolute inset-1 rounded-full border border-accent/10 animate-[spin_3s_linear_infinite_reverse]" />
          </div>

          <p className="text-sm font-medium text-white/70 mb-1.5">
            {message ?? "Processing your resume…"}
          </p>
          <p className="text-xs text-white/30">AI is tailoring keywords & structure</p>

          {/* Progress bar */}
          {progress !== undefined && progress > 0 && (
            <div className="mt-6 w-48 h-0.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-accent/60 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
