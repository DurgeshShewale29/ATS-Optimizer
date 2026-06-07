import type { APIErrorPayload } from "./types";

// ─── Custom API Error ───────────────────────────────────────────────────────────

export class APIError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(payload: APIErrorPayload) {
    super(payload.message);
    this.name = "APIError";
    this.status = payload.status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

// ─── Config ────────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const DEFAULT_TIMEOUT = 30_000; // 30s
const MAX_RETRIES = 3;
const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

// ─── Retry helper ──────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof APIError && !RETRYABLE_STATUSES.includes(err.status)) {
        throw err; // Non-retryable — bail immediately
      }
      if (attempt < retries) {
        await sleep(Math.pow(2, attempt) * 300); // 300ms, 600ms, 1200ms
      }
    }
  }
  throw lastError;
}

// ─── Response handler ──────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.blob() as unknown as T;
  }

  let message = `Request failed with status ${res.status}`;
  let code: string | undefined;
  let details: Record<string, unknown> | undefined;

  try {
    const body = await res.json();
    message = body.message ?? body.detail ?? message;
    code = body.code;
    details = body.details;
  } catch {
    // response body isn't JSON — keep default message
  }

  throw new APIError({ status: res.status, message, code, details });
}

// ─── Core request function ─────────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: BodyInit;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
  skipRetry?: boolean;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    signal,
    timeout = DEFAULT_TIMEOUT,
    skipRetry = false,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const combinedSignal = signal ?? controller.signal;

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!(body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const fetchFn = () =>
    fetch(`${BASE_URL}${endpoint}`, {
      method,
      body,
      headers: { ...defaultHeaders, ...headers },
      signal: combinedSignal,
    }).then((res) => {
      clearTimeout(timeoutId);
      return handleResponse<T>(res);
    });

  return skipRetry ? fetchFn() : withRetry(fetchFn);
}

// ─── Exported API client ───────────────────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...opts, method: "GET" }),

  post: <T>(endpoint: string, body?: BodyInit, opts?: Omit<RequestOptions, "method">) =>
    request<T>(endpoint, { ...opts, method: "POST", body }),

  postJSON: <T>(endpoint: string, data: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, {
      ...opts,
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string, opts?: Omit<RequestOptions, "method">) =>
    request<T>(endpoint, { ...opts, method: "DELETE" }),
};

export default api;
