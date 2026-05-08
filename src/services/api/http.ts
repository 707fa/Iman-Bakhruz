import { API_BASE_URL, API_BASE_URL_CONFIGURED, API_FALLBACK_BASE_URL, API_REQUEST_TIMEOUT_MS } from "../../lib/env";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown | FormData;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown, message = "API request failed") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getRequestUrls(path: string): string[] {
  const primaryUrl = `${API_BASE_URL}${path}`;
  const shouldAddFallback =
    API_FALLBACK_BASE_URL &&
    API_FALLBACK_BASE_URL !== API_BASE_URL &&
    (API_BASE_URL.startsWith("/") || API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1"));

  if (!shouldAddFallback) return [primaryUrl];
  return [primaryUrl, `${API_FALLBACK_BASE_URL}${path}`];
}

function shouldRetryRequest(error: ApiError): boolean {
  return error.status === 0 || error.status === 408 || error.status === 404 || error.status === 502 || error.status === 503 || error.status === 504;
}

async function fetchPayload(url: string, options: RequestOptions, headers: Record<string, string>, body: BodyInit | undefined) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? API_REQUEST_TIMEOUT_MS;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const handleAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", handleAbort, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: controller.signal,
    });
    const payload = await parseJsonSafe(response);
    return { response, payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, { message: "Request timeout" }, "API request timeout");
    }

    // Network-level failures: CORS, refused, offline, DNS, etc.
    if (error instanceof TypeError) {
      throw new ApiError(0, { message: error.message || "Network error" }, "API network error");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (options.signal) {
      options.signal.removeEventListener("abort", handleAbort);
    }
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL_CONFIGURED) {
    throw new ApiError(
      0,
      { message: "Service is not ready yet." },
      "Service is not ready yet",
    );
  }

  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const body =
    options.body === undefined
      ? undefined
      : isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body);

  const urls = getRequestUrls(path);
  let lastError: unknown = null;

  for (let index = 0; index < urls.length; index += 1) {
    const hasFallback = index < urls.length - 1;

    try {
      const { response, payload } = await fetchPayload(urls[index], options, headers, body);
      const contentType = response.headers.get("content-type") ?? "";
      const gotHtmlInsteadOfApi = response.ok && typeof payload === "string" && contentType.includes("text/html");

      if (gotHtmlInsteadOfApi && hasFallback) {
        lastError = new ApiError(response.status, { message: "API proxy returned HTML" });
        continue;
      }

      if (!response.ok) {
        const error = new ApiError(response.status, payload);
        if (hasFallback && shouldRetryRequest(error)) {
          lastError = error;
          continue;
        }
        throw error;
      }

      return payload as T;
    } catch (error) {
      if (hasFallback && error instanceof ApiError && shouldRetryRequest(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new ApiError(0, { message: "API request failed" });
}
