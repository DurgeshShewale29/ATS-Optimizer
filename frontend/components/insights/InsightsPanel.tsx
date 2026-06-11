"use client";

import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Tooltip from "@/components/ui/Tooltip";
import type { OptimizedResumeResponse } from "@/services/types";
import { TrendingUp, CheckCircle2, XCircle, Lightbulb, Wand2, Sparkles } from "lucide-react";

interface InsightsPanelProps {
  data: OptimizedResumeResponse;
  className?: string;
  onFixKeyword?: (keyword: string) => void;
  onFixAll?: (keywords: string[]) => void;
}

const PRIORITY_VARIANT = {
  high:   "error",
  medium: "warning",
  low:    "muted",
} as const;

export default function InsightsPanel({ data, className, onFixKeyword, onFixAll }: InsightsPanelProps) {
  const { atsScore, matchedKeywords, missingKeywords, suggestions } = data;

  return (
    <div className={cn("space-y-5", className)}>
      {/* ATS Score */}
      <div className={cn(
        "relative flex items-center gap-5 p-4 rounded-xl overflow-hidden",
        "bg-white/[0.02] border border-white/[0.07]"
      )}>
        {/* Score ring */}
        <div className="relative flex-shrink-0 flex items-center justify-center w-16 h-16">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={atsScore >= 80 ? "#10b981" : atsScore >= 60 ? "#f59e0b" : "#ef4444"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${(atsScore / 100) * 163.4} 163.4`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className={cn(
            "text-lg font-bold tabular-nums",
            atsScore >= 80 ? "text-emerald-400" : atsScore >= 60 ? "text-amber-400" : "text-red-400"
          )}>
            {atsScore}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-white/30" strokeWidth={2} />
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">ATS Score</span>
          </div>
          <p className="text-sm font-semibold text-white/80">
            {atsScore >= 80 ? "Excellent match" : atsScore >= 60 ? "Good match" : "Needs improvement"}
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            {matchedKeywords.length} of {matchedKeywords.length + missingKeywords.length} keywords matched
          </p>
        </div>
      </div>

      {/* Matched keywords */}
      {matchedKeywords.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} />
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Matched Keywords
            </span>
            <Badge variant="success" className="ml-auto">{matchedKeywords.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedKeywords.map((kw) => (
              <Badge key={kw} variant="success">{kw}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Missing keywords */}
      {missingKeywords.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-3.5 h-3.5 text-red-400" strokeWidth={2} />
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Missing Keywords
            </span>
            <Badge variant="error" className="ml-auto">{missingKeywords.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingKeywords.map((kw) => (
              <Tooltip key={kw} content={onFixKeyword ? "Click Fix to add via Copilot" : "Add this to your resume"} side="top">
                <div className="flex items-center gap-1">
                  <Badge variant="error">{kw}</Badge>
                  {onFixKeyword && (
                    <button
                      onClick={() => onFixKeyword(kw)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                        "bg-accent/10 text-accent/70 border border-accent/20",
                        "hover:bg-accent/20 hover:text-accent transition-all duration-150",
                        "active:scale-95"
                      )}
                      title={`Ask Copilot to add "${kw}" to your resume`}
                    >
                      <Wand2 className="w-2.5 h-2.5" />
                      Fix
                    </button>
                  )}
                </div>
              </Tooltip>
            ))}
          </div>

          {/* Fix All button */}
          {onFixAll && missingKeywords.length > 1 && (
            <button
              onClick={() => onFixAll(missingKeywords)}
              className={cn(
                "mt-3 w-full flex items-center justify-center gap-2",
                "px-4 py-2.5 rounded-xl text-sm font-medium",
                "bg-accent/10 text-accent/80 border border-accent/20",
                "hover:bg-accent/20 hover:text-accent hover:border-accent/40",
                "transition-all duration-200 active:scale-[0.98]",
                "shadow-[0_0_16px_rgba(99,102,241,0.08)] hover:shadow-[0_0_20px_rgba(99,102,241,0.18)]"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fix All {missingKeywords.length} Missing Keywords
            </button>
          )}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-3.5 h-3.5 text-accent-light" strokeWidth={2} />
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Suggestions
            </span>
          </div>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors duration-150"
              >
                <Badge variant={PRIORITY_VARIANT[s.priority]} className="flex-shrink-0 mt-0.5">
                  {s.priority}
                </Badge>
                <p className="text-xs text-white/60 leading-relaxed">{s.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

