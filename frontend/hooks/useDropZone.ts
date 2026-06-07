"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ACCEPTED_FILE_TYPES, formatBytes, isValidFileSize } from "@/lib/utils";
import type { DropZoneState } from "@/services/types";

interface UseDropZoneReturn extends DropZoneState {
  getRootProps: ReturnType<typeof useDropzone>["getRootProps"];
  getInputProps: ReturnType<typeof useDropzone>["getInputProps"];
  clear: () => void;
}

export function useDropZone(onFileChange?: (file: File | null) => void): UseDropZoneReturn {
  const [state, setState] = useState<DropZoneState>({
    isDragOver: false,
    file: null,
    error: null,
  });

  const onDrop = useCallback((accepted: File[], rejected: import("react-dropzone").FileRejection[]) => {
    setState((prev) => ({ ...prev, isDragOver: false }));

    if (rejected.length > 0) {
      const firstError = rejected[0].errors[0];
      let message = "File not accepted.";
      if (firstError.code === "file-too-large") {
        message = "File exceeds 10 MB limit.";
      } else if (firstError.code === "file-invalid-type") {
        message = "Only PDF, DOCX, and image files (PNG/JPG) are supported.";
      }
      setState({ isDragOver: false, file: null, error: message });
      onFileChange?.(null);
      return;
    }

    if (accepted.length > 0) {
      const file = accepted[0];
      if (!isValidFileSize(file)) {
        setState({ isDragOver: false, file: null, error: "File exceeds 10 MB limit." });
        onFileChange?.(null);
        return;
      }
      setState({ isDragOver: false, file, error: null });
      onFileChange?.(file);
    }
  }, [onFileChange]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDragEnter: () => setState((prev) => ({ ...prev, isDragOver: true })),
    onDragLeave: () => setState((prev) => ({ ...prev, isDragOver: false })),
  });

  const clear = useCallback(() => {
    setState({ isDragOver: false, file: null, error: null });
    onFileChange?.(null);
  }, [onFileChange]);

  return {
    getRootProps,
    getInputProps,
    isDragOver: state.isDragOver,
    file: state.file,
    error: state.error,
    clear,
  };
}

export { formatBytes };
