"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { CopilotMessage, OptimizedResumeResponse, ResumePatch } from "@/services/types";
import { useCopilot } from "@/hooks/useCopilot";
import { Send, Sparkles, Bot, User, RotateCcw, Zap, Undo2 } from "lucide-react";

// ─── Quick-action suggestions shown on empty state ───────────────────────────
const QUICK_ACTIONS = [
  "Rewrite my summary to better match the JD",
  "Add missing keywords to my experience",
  "Strengthen my top bullet points",
  "Reorganize my skills section",
];

interface CopilotChatProps {
  optimizedData: OptimizedResumeResponse;
  jdText: string;
  onPatch: (patch: ResumePatch) => void;
  /** Pre-filled message — used by InsightsPanel "Fix →" button */
  prefillMessage?: string;
  onPrefillConsumed?: () => void;
  /** Undo the last applied patch */
  onUndo?: () => void;
  /** Whether there is anything to undo */
  canUndo?: boolean;
}

export default function CopilotChat({
  optimizedData,
  jdText,
  onPatch,
  prefillMessage,
  onPrefillConsumed,
  onUndo,
  canUndo = false,
}: CopilotChatProps) {
  const [input, setInput] = useState("");
  const [patchedCount, setPatchedCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isStreaming, sendMessage, clearMessages } = useCopilot({
    onPatch: (patch) => {
      onPatch(patch);
      setPatchedCount((n) => n + 1);
    },
  });

  // Consume prefill message
  useEffect(() => {
    if (prefillMessage) {
      setInput(prefillMessage);
      inputRef.current?.focus();
      onPrefillConsumed?.();
    }
  }, [prefillMessage, onPrefillConsumed]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    await sendMessage(text, optimizedData, jdText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-sm font-semibold text-white/80">Resume Copilot</span>
          {patchedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {patchedCount} change{patchedCount !== 1 ? "s" : ""} applied
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Undo last change */}
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] transition-colors duration-150",
                  canUndo
                    ? "text-amber-400/70 hover:text-amber-400"
                    : "text-white/15 cursor-not-allowed"
                )}
                title={canUndo ? "Undo last change" : "Nothing to undo"}
              >
                <Undo2 className="w-3 h-3" />
                Undo
              </button>
            )}
            <button
              onClick={() => { clearMessages(); setPatchedCount(0); }}
              className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors duration-150"
              title="Clear chat"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-4 py-8">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full bg-accent/5 blur-xl animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-accent/[0.06] border border-accent/10">
                <Bot className="w-6 h-6 text-accent/50" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white/50 mb-1">
                Your AI Resume Copilot
              </p>
              <p className="text-xs text-white/25 max-w-xs leading-relaxed">
                Ask me to fix missing keywords, rewrite bullet points, or boost your ATS score.
              </p>
            </div>

            {/* Quick action chips */}
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => setInput(action)}
                  className={cn(
                    "text-left px-3 py-2 rounded-xl text-xs text-white/50",
                    "border border-white/[0.06] bg-white/[0.02]",
                    "hover:border-accent/20 hover:bg-accent/[0.04] hover:text-white/70",
                    "transition-all duration-150 flex items-center gap-2"
                  )}
                >
                  <Zap className="w-3 h-3 text-accent/40 flex-shrink-0" />
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 mt-3">
        <div className={cn(
          "flex items-end gap-2 p-2 rounded-xl",
          "border border-white/[0.08] bg-white/[0.02]",
          "focus-within:border-accent/30 focus-within:bg-accent/[0.02]",
          "transition-all duration-200"
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Copilot to improve your resume…"
            disabled={isStreaming}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm text-white/80 placeholder-white/20",
              "outline-none leading-relaxed min-h-[24px] max-h-[120px] py-1 px-1",
              "scrollbar-hide disabled:opacity-50"
            )}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
              "transition-all duration-150 active:scale-95",
              input.trim() && !isStreaming
                ? "bg-accent text-white hover:bg-accent/90 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                : "bg-white/[0.04] text-white/20 cursor-not-allowed"
            )}
          >
            {isStreaming ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-white/15 mt-1.5 text-center">
          Changes apply instantly to the Live Preview · Enter to send
        </p>
      </div>
    </div>
  );
}

// ─── Chat bubble sub-component ────────────────────────────────────────────────

function ChatBubble({ message }: { message: CopilotMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-0.5",
        isUser
          ? "bg-white/[0.05] border border-white/[0.08]"
          : "bg-accent/[0.08] border border-accent/15"
      )}>
        {isUser
          ? <User className="w-3 h-3 text-white/40" />
          : <Bot className="w-3 h-3 text-accent/60" />
        }
      </div>

      {/* Bubble */}
      <div className={cn(
        "max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed",
        isUser
          ? "bg-white/[0.06] text-white/80 border border-white/[0.07]"
          : "bg-accent/[0.06] text-white/75 border border-accent/10"
      )}>
        {message.content || (
          message.isStreaming && (
            <span className="flex gap-1 items-center h-4">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce [animation-delay:300ms]" />
            </span>
          )
        )}
        {message.isStreaming && message.content && (
          <span className="inline-block w-0.5 h-3.5 bg-accent/60 ml-0.5 animate-pulse align-text-bottom" />
        )}
      </div>
    </div>
  );
}
