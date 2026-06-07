"use client";

import { useCallback, useRef, useState } from "react";
import resumeService from "@/services/resumeService";
import type { AppState, OptimizedResumeResponse, OptimizerState } from "@/services/types";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30; // 60 seconds total

interface UseResumeOptimizerReturn extends OptimizerState {
  upload: (file: File, jobDescription: string, jdFile?: File | null) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: OptimizerState = {
  appState: "idle",
  jobId: null,
  progress: 0,
  optimizedData: null,
  error: null,
};

export function useResumeOptimizer(): UseResumeOptimizerReturn {
  const [state, setState] = useState<OptimizerState>(INITIAL_STATE);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptsRef = useRef(0);

  const setAppState = (appState: AppState, extra?: Partial<OptimizerState>) =>
    setState((prev) => ({ ...prev, appState, ...extra }));

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollAttemptsRef.current = 0;
  }, []);

  const pollStatus = useCallback(
    async (jobId: string) => {
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        setAppState("error", { error: "Processing timed out. Please try again." });
        return;
      }

      pollAttemptsRef.current += 1;

      try {
        const res = await resumeService.pollStatus(jobId);

        if (res.status === "complete" && res.result) {
          stopPolling();
          setState({
            appState: "success",
            jobId,
            progress: 100,
            optimizedData: res.result,
            error: null,
          });
          return;
        }

        if (res.status === "failed") {
          stopPolling();
          setAppState("error", { error: res.error ?? "Optimization failed. Please try again." });
          return;
        }

        // Still processing — update progress and schedule next poll
        const progress = res.progress ?? Math.min(pollAttemptsRef.current * 4, 90);
        setState((prev) => ({ ...prev, progress }));

        pollTimerRef.current = setTimeout(() => pollStatus(jobId), POLL_INTERVAL_MS);
      } catch (err) {
        stopPolling();
        const message = err instanceof Error ? err.message : "Unexpected error during polling.";
        setAppState("error", { error: message });
      }
    },
    [stopPolling]
  );

  const upload = useCallback(
    async (file: File, jobDescription: string, jdFile?: File | null) => {
      stopPolling();
      setState({ ...INITIAL_STATE, appState: "uploading", progress: 10 });

      try {
        const { jobId } = await resumeService.upload({ file, jobDescription, jdFile });
        setState((prev) => ({ ...prev, appState: "processing", jobId, progress: 20 }));

        // Begin polling
        pollAttemptsRef.current = 0;
        pollTimerRef.current = setTimeout(() => pollStatus(jobId), POLL_INTERVAL_MS);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed. Please try again.";
        setAppState("error", { error: message });
      }
    },
    [pollStatus, stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState(INITIAL_STATE);
  }, [stopPolling]);

  return { ...state, upload, reset };
}
