"use client";

import { cn } from "@/lib/utils";
import { formatBytes } from "@/hooks/useDropZone";
import { FileText, X, CheckCircle2 } from "lucide-react";

interface FileChipProps {
  file: File;
  onRemove: () => void;
  className?: string;
}

export default function FileChip({ file, onRemove, className }: FileChipProps) {
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl",
        "bg-white/[0.04] border border-white/[0.08]",
        "transition-all duration-200 hover:bg-white/[0.06] hover:border-white/[0.12]",
        "animate-[fade-in-up_0.3s_cubic-bezier(0.16,1,0.3,1)]",
        className
      )}
    >
      {/* File icon */}
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 border border-accent/20">
        <FileText className="w-4 h-4 text-accent" strokeWidth={1.5} />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate max-w-[180px]">
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-2xs font-mono text-white/30 uppercase tracking-wide">
            {ext}
          </span>
          <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
          <span className="text-2xs text-white/30">
            {formatBytes(file.size)}
          </span>
        </div>
      </div>

      {/* Status + remove */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={2} />
        <button
          onClick={onRemove}
          aria-label="Remove file"
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-md",
            "text-white/30 hover:text-white/80 hover:bg-white/[0.08]",
            "transition-all duration-150",
            "opacity-0 group-hover:opacity-100"
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
