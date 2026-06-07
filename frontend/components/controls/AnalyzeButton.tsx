"use client";

import { cn } from "@/lib/utils";
import { Sparkles, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import type { AppState } from "@/services/types";

interface AnalyzeButtonProps {
  appState: AppState;
  disabled?: boolean;
  progress?: number;
  onClick: () => void;
  onReset?: () => void;
}

const LABELS: Record<AppState, string> = {
  idle: "Optimize Resume",
  uploading: "Uploading…",
  processing: "Analyzing…",
  success: "Optimized!",
  error: "Try Again",
};

const ICONS: Record<AppState, React.ReactNode> = {
  idle: <Sparkles className="w-4 h-4" strokeWidth={1.8} />,
  uploading: <Loader2 className="w-4 h-4 animate-spin" />,
  processing: <Loader2 className="w-4 h-4 animate-spin" />,
  success: <Sparkles className="w-4 h-4 fill-current" strokeWidth={1.8} />,
  error: <AlertCircle className="w-4 h-4" strokeWidth={1.8} />,
};

export default function AnalyzeButton({
  appState,
  disabled,
  progress = 0,
  onClick,
  onReset,
}: AnalyzeButtonProps) {
  const isLoading = appState === "uploading" || appState === "processing";
  const isSuccess = appState === "success";
  const isError = appState === "error";
  const isIdle = appState === "idle";

  return (
    <div className="flex items-center gap-3">
      {/* Main CTA button */}
      <button
        id="analyze-btn"
        onClick={onClick}
        disabled={disabled || isLoading || isSuccess}
        aria-label={LABELS[appState]}
        className={cn(
          // Base layout
          "relative flex-1 flex items-center justify-center gap-2.5",
          "h-11 rounded-xl font-medium text-sm",
          "overflow-hidden transition-all duration-200 select-none",
          "btn-shimmer",

          // Idle + error — accent fill
          (isIdle || isError) && !disabled &&
            "bg-accent text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_4px_12px_rgba(99,102,241,0.3)] hover:bg-accent-dark hover:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_4px_20px_rgba(99,102,241,0.4)] active:scale-[0.98]",

          // Loading — muted accent
          isLoading &&
            "bg-accent/80 text-white/90 cursor-wait shadow-none",

          // Success — emerald
          isSuccess &&
            "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default",

          // Error
          isError &&
            "bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-accent hover:text-white hover:border-transparent",

          // Disabled
          disabled && !isLoading &&
            "opacity-40 cursor-not-allowed bg-white/[0.06] text-white/30 border border-white/[0.06] shadow-none"
        )}
      >
        {/* Progress bar underlay */}
        {isLoading && (
          <div
            className="absolute inset-y-0 left-0 bg-white/10 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        )}

        {/* Icon + Label */}
        <span className="relative flex items-center gap-2.5 z-10">
          {ICONS[appState]}
          <span>{LABELS[appState]}</span>
          {isLoading && progress > 0 && (
            <span className="tabular-nums text-xs opacity-60">{progress}%</span>
          )}
        </span>
      </button>

      {/* Reset button — visible only when success or error */}
      {(isSuccess || isError) && onReset && (
        <button
          onClick={onReset}
          aria-label="Start over"
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0",
            "border border-white/[0.08] bg-white/[0.03]",
            "text-white/40 hover:text-white/70 hover:bg-white/[0.07] hover:border-white/[0.14]",
            "transition-all duration-150 active:scale-95",
            "animate-[scale-in_0.2s_cubic-bezier(0.16,1,0.3,1)]"
          )}
        >
          <RotateCcw className="w-4 h-4" strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}
