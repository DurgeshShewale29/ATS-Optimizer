"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export default function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionClass = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg",
            "text-xs text-white/90 font-medium",
            "bg-[#1e1e1e] border border-white/[0.1]",
            "shadow-[0_4px_16px_rgba(0,0,0,0.5)]",
            "pointer-events-none",
            "animate-[scale-in_0.15s_cubic-bezier(0.16,1,0.3,1)]",
            positionClass
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
