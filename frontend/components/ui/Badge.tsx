"use client";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "error" | "warning" | "accent" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default:  "bg-white/[0.06] text-white/60 border-white/[0.08]",
  success:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  error:    "bg-red-500/10 text-red-400 border-red-500/20",
  warning:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  accent:   "bg-accent/10 text-accent-light border-accent/20",
  muted:    "bg-white/[0.03] text-white/30 border-white/[0.05]",
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  default:  "bg-white/40",
  success:  "bg-emerald-400",
  error:    "bg-red-400",
  warning:  "bg-amber-400",
  accent:   "bg-accent",
  muted:    "bg-white/20",
};

export default function Badge({ children, variant = "default", dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md",
        "text-xs font-medium border",
        VARIANTS[variant],
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", DOT_COLORS[variant])} />}
      {children}
    </span>
  );
}
