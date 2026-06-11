"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AlignLeft, ClipboardPaste, Plus } from "lucide-react";
import FileChip from "../upload/FileChip";

interface JDInputProps {
  value: string;
  onChange: (value: string) => void;
  file?: File | null;
  onFileChange?: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
}

const MAX_CHARS = 5000;

export default function JDInput({ value, onChange, file, onFileChange, disabled, className }: JDInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value.slice(0, MAX_CHARS);
      onChange(val);
    },
    [onChange]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const combined = (value + text).slice(0, MAX_CHARS);
      onChange(combined);
    } catch {
      // Clipboard access denied — let native paste handle it
    }
  }, [value, onChange]);

  const charCount = value.length;
  const charPercent = (charCount / MAX_CHARS) * 100;
  const isNearLimit = charPercent > 80;

  return (
    <div className={cn("flex flex-col space-y-2 min-h-0", className)}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlignLeft className="w-3.5 h-3.5 text-white/30" strokeWidth={2} />
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Job Description
          </span>
        </div>

        {/* Paste shortcut */}
        <button
          onClick={handlePaste}
          disabled={disabled}
          aria-label="Paste from clipboard"
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs",
            "text-white/30 border border-white/[0.06] bg-white/[0.02]",
            "hover:text-white/60 hover:border-white/[0.1] hover:bg-white/[0.04]",
            "transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <ClipboardPaste className="w-3 h-3" />
          <span className="hidden sm:inline">Paste</span>
        </button>
      </div>

      {/* Textarea wrapper */}
      <div
        className={cn(
          "relative rounded-xl overflow-hidden transition-all duration-200 flex-1 flex flex-col",
          "border",
          isFocused
            ? "border-accent/40 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]"
            : "border-white/[0.08] hover:border-white/[0.12]",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id="jd-input"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder="Paste the job description here…&#10;&#10;Include the full posting with requirements, qualifications, and responsibilities for best ATS matching."
          rows={7}
          maxLength={MAX_CHARS}
          className={cn(
            "w-full flex-1 resize-none bg-white/[0.02] px-4 pt-4 pb-8",
            "text-sm text-white/80 placeholder:text-white/20",
            "focus:outline-none focus:bg-white/[0.03]",
            "transition-colors duration-150",
            "leading-relaxed scrollbar-hide"
          )}
        />

        {/* Bottom bar — char counter + progress */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-4 py-2 bg-black/20 backdrop-blur-sm">
          {/* Progress bar */}
          <div className="flex-1 h-0.5 rounded-full bg-white/[0.06] mr-4 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isNearLimit ? "bg-amber-400/60" : "bg-accent/40"
              )}
              style={{ width: `${charPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Count */}
            <span
              className={cn(
                "text-2xs font-mono tabular-nums transition-colors duration-200",
                charCount === 0
                  ? "text-white/20"
                  : isNearLimit
                  ? "text-amber-400/70"
                  : "text-white/30"
              )}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>

            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title="Upload JD File (PDF or Image)"
              className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/[0.1] text-white/40 hover:text-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && onFileChange) onFileChange(f);
                // Reset input so the same file can be selected again if removed
                if (e.target) e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>
      
      {/* File Chip */}
      {file && (
        <div className="mt-2">
          <FileChip file={file} onRemove={() => onFileChange?.(null)} />
        </div>
      )}
    </div>
  );
}
