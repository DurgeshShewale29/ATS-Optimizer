"use client";

import { type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { useDropZone } from "@/hooks/useDropZone";
import FileChip from "./FileChip";
import { Upload, FileUp, AlertCircle } from "lucide-react";

interface DropZoneProps {
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function DropZone({ onFileChange, disabled }: DropZoneProps) {
  // Pass onFileChange directly into the hook — single source of truth
  const { getRootProps, getInputProps, isDragOver, file, error, clear } =
    useDropZone(onFileChange);

  const handleRemove = () => {
    clear(); // clears internal state AND calls onFileChange(null)
  };

  const rootProps = getRootProps({
    // When disabled, intercept clicks so the file dialog doesn't open
    onClick: disabled ? (e: MouseEvent) => e.stopPropagation() : undefined,
  });

  return (
    <div className="space-y-3">
      {/* Drop zone — only shown when no file is selected */}
      {!file && (
        <div
          {...rootProps}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload resume — click or drag and drop"
          aria-disabled={disabled}
          className={cn(
            "relative flex flex-col items-center justify-center gap-4",
            "min-h-[180px] rounded-2xl cursor-pointer select-none",
            "border border-dashed transition-all duration-200 ease-out",
            "group outline-none",

            // Base state
            !isDragOver && !error && !disabled &&
              "border-white/[0.12] bg-white/[0.02] hover:border-accent/40 hover:bg-accent/[0.03]",

            // Drag-over state
            isDragOver &&
              "border-accent/60 bg-accent/[0.05] scale-[1.01]",

            // Error state
            error && "border-red-500/40 bg-red-500/[0.03]",

            // Disabled state
            disabled && "opacity-50 cursor-not-allowed border-white/[0.06] bg-transparent"
          )}
        >
          {/* react-dropzone handles both file-dialog AND drag-and-drop via getInputProps */}
          <input {...getInputProps()} disabled={disabled} />

          {/* Animated icon */}
          <div
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-xl",
              "bg-white/[0.04] border border-white/[0.08]",
              "transition-all duration-200",
              isDragOver
                ? "bg-accent/10 border-accent/30 scale-110"
                : "group-hover:bg-accent/[0.06] group-hover:border-accent/20 group-hover:-translate-y-0.5"
            )}
          >
            {isDragOver ? (
              <FileUp className="w-5 h-5 text-accent" strokeWidth={1.5} />
            ) : (
              <Upload
                className="w-5 h-5 text-white/40 group-hover:text-accent/70 transition-colors duration-200"
                strokeWidth={1.5}
              />
            )}

            {/* Glow pulse on drag */}
            {isDragOver && (
              <div className="absolute inset-0 rounded-xl bg-accent/10 blur-md animate-pulse" />
            )}
          </div>

          {/* Text */}
          <div className="text-center px-4">
            <p
              className={cn(
                "text-sm font-medium transition-colors duration-200",
                isDragOver ? "text-accent" : "text-white/60 group-hover:text-white/80"
              )}
            >
              {isDragOver ? "Drop to upload" : "Drop your resume here"}
            </p>
            <p className="text-xs text-white/30 mt-1">
              PDF, DOCX, or Image · Max 10 MB
            </p>
          </div>

          {/* Divider */}
          {!isDragOver && (
            <div className="flex items-center gap-3 w-full px-6">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-xs text-white/20">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
          )}

          {/* Browse button */}
          {!isDragOver && (
            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium",
                "border border-white/[0.08] bg-white/[0.03]",
                "text-white/50 group-hover:text-white/70",
                "transition-all duration-200 group-hover:border-white/[0.14] group-hover:bg-white/[0.05]"
              )}
            >
              Browse files
            </div>
          )}
        </div>
      )}

      {/* File chip shown after selection */}
      {file && (
        <FileChip file={file} onRemove={handleRemove} />
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/[0.06] border border-red-500/20 animate-[fade-in_0.2s_ease-out]">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
