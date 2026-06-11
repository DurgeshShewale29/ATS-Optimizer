"use client";

import { useState, useCallback, useRef } from "react";
import type { CopilotMessage, ResumePatch, OptimizedResumeResponse } from "@/services/types";

interface UseCopilotOptions {
  onPatch: (patch: ResumePatch) => void;
}

interface UseCopilotReturn {
  messages: CopilotMessage[];
  isStreaming: boolean;
  sendMessage: (
    text: string,
    optimizedData: OptimizedResumeResponse,
    jdText: string
  ) => Promise<void>;
  clearMessages: () => void;
}

let msgCounter = 0;
const nextId = () => `msg-${++msgCounter}`;

export function useCopilot({ onPatch }: UseCopilotOptions): UseCopilotReturn {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      text: string,
      optimizedData: OptimizedResumeResponse,
      jdText: string
    ) => {
      if (isStreaming) return;

      // Abort any previous stream
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      // Build history for the backend (exclude streaming placeholders)
      const historySnapshot = messages
        .filter((m) => !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }));

      // Add user message
      const userMsg: CopilotMessage = { id: nextId(), role: "user", content: text };
      const botMsgId = nextId();
      const botPlaceholder: CopilotMessage = {
        id: botMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, botPlaceholder]);
      setIsStreaming(true);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/copilot/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abort.signal,
            body: JSON.stringify({
              message: text,
              resumeJson: {
                ...optimizedData.optimizedResume,
                atsScore: optimizedData.atsScore, // included so LLM knows current baseline
              },
              jdText,
              history: historySnapshot,
            }),
          }
        );

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const event = JSON.parse(raw) as { type: string; data?: unknown };

              if (event.type === "patch" && event.data) {
                onPatch(event.data as ResumePatch);
              } else if (event.type === "token" && typeof event.data === "string") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMsgId
                      ? { ...m, content: m.content + event.data }
                      : m
                  )
                );
              } else if (event.type === "error" && typeof event.data === "string") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMsgId
                      ? { ...m, content: `⚠️ ${event.data}`, isStreaming: false }
                      : m
                  )
                );
              } else if (event.type === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMsgId ? { ...m, isStreaming: false } : m
                  )
                );
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  content: "⚠️ Connection failed. Please try again.",
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId && m.isStreaming ? { ...m, isStreaming: false } : m
          )
        );
      }
    },
    [isStreaming, messages, onPatch]
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, clearMessages };
}
