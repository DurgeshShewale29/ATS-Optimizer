"use client";

import dynamic from "next/dynamic";
import React, { Suspense, Component, type ReactNode } from "react";
import type { PDFDocumentProps } from "@/hooks/usePDFGenerator";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";
import ResumeDocument from "./ResumeDocument";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
      </div>
    ),
  }
);

// ─── Error boundary ───────────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; message: string }

class PDFErrorBoundary extends Component<
  { children: ReactNode; onError?: (err: Error) => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): ErrorBoundaryState {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error) {
    this.props.onError?.(err);
  }

  reset = () => this.setState({ hasError: false, message: "" });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 h-full px-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80 mb-1">PDF render failed</p>
            <p className="text-xs text-white/40 max-w-xs">{this.state.message}</p>
          </div>
          <button
            onClick={this.reset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-white/[0.1] text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-all duration-150"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── PDFPreview ───────────────────────────────────────────────────────────────
interface PDFPreviewProps {
  docProps: PDFDocumentProps;
  atsScore?: number;
}

export default function PDFPreview({ docProps, atsScore }: PDFPreviewProps) {
  return (
    <div className="flex flex-col h-full gap-0.3">
      {/* Viewer container */}
      <div
        className={cn(
          "flex-1 rounded-xl overflow-hidden",
          "border border-white/[0.07]",
          "shadow-[0_4px_32px_rgba(0,0,0,0.5)]",
          "animate-[fade-in_0.4s_ease-out]",
          "min-h-[600px]"
        )}
      >
        <PDFErrorBoundary>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
            </div>
          }>
            <PDFViewer
              width="100%"
              height="100%"
              showToolbar={false}
            >
              <ResumeDocument {...docProps} />
            </PDFViewer>
          </Suspense>
        </PDFErrorBoundary>
      </div>
    </div>
  );
}
