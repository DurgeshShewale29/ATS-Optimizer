"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={1.8} />,
  error:   <AlertCircle  className="w-4 h-4 text-red-400"     strokeWidth={1.8} />,
  info:    <Info         className="w-4 h-4 text-indigo-400"  strokeWidth={1.8} />,
};

const BORDER: Record<ToastType, string> = {
  success: "border-emerald-500/20",
  error:   "border-red-500/20",
  info:    "border-indigo-500/20",
};

// ─── Single toast item ────────────────────────────────────────────────────────
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration ?? 4500;
    const exitTimer  = setTimeout(() => setExiting(true), duration - 300);
    const removeTimer = setTimeout(onDismiss, duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.duration, onDismiss]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 w-80 px-4 py-3.5 rounded-xl",
        "bg-[#1a1a1a]/95 border backdrop-blur-xl",
        "shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
        BORDER[toast.type],
        exiting
          ? "[animation:fade-in_0.2s_ease-out_reverse]"
          : "[animation:slide-in-right_0.3s_cubic-bezier(0.16,1,0.3,1)]"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{ICONS[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(onDismiss, 300);
        }}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-white/20 hover:text-white/60 transition-colors mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Toast container ──────────────────────────────────────────────────────────
export default function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}

// ─── useToast hook ────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((msg: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...msg, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismiss };
}
