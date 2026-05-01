import { AI_GATEWAY_TIMEOUT_MS, AI_GATEWAY_URL } from "../../lib/env";
import { ApiError } from "./http";

export interface AiGatewayCheckPayload {
  text?: string;
  imageFile?: File | null;
  userId?: string;
}

export interface AiGatewayCheckResponse {
  success: boolean;
  provider: string;
  cached: boolean;
  result: string;
}

interface ErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

function parseJsonSafe(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function normalizeResponse(payload: unknown): AiGatewayCheckResponse {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid AI gateway response");
  }

  const data = payload as Record<string, unknown>;
  const result = typeof data.result === "string" ? data.result.trim() : "";
  const provider = typeof data.provider === "string" ? data.provider : "unknown";
  const cached = Boolean(data.cached);
  const success = data.success !== false;

  if (!result) {
    throw new Error("AI gateway returned empty result");
  }

  return {
    success,
    provider,
    cached,
    result,
  };
}

function extractErrorCode(error: ApiError): string {
  const payload = error.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const typed = payload as ErrorPayload;
  return String(typed.error?.code || "").trim().toUpperCase();
}

export function mapAiGatewayErrorToMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const code = extractErrorCode(error);

    if (error.status === 0 || code === "NETWORK_ERROR") {
      return "Connection problem. Please check internet and try again.";
    }

    if (error.status === 408 || code === "AI_GATEWAY_TIMEOUT") {
      return "AI timeout. Try again.";
    }

    if (error.status === 429 || code === "RATE_LIMIT_EXCEEDED") {
      return "Too many requests. Wait 30-60 seconds.";
    }

    if (error.status === 503 || code === "ALL_PROVIDERS_UNAVAILABLE" || code === "RATE_LIMIT_UNAVAILABLE") {
      return "AI provider is temporarily unavailable. Try again in 1-2 minutes.";
    }

    if (error.status >= 500) {
      return "Service is temporarily unavailable. Please retry.";
    }

    if (error.status >= 400) {
      return "Check input data and try again.";
    }
  }

  if (error instanceof TypeError) {
    return "Connection problem. Please check internet and try again.";
  }

  return "Failed to get AI reply. Try again.";
}

export async function aiGatewayCheckHomework(payload: AiGatewayCheckPayload): Promise<AiGatewayCheckResponse> {
  if (!AI_GATEWAY_URL) {
    throw new Error("AI service is not ready yet");
  }

  const text = (payload.text || "").trim();
  const file = payload.imageFile ?? null;
  if (!text && !file) {
    throw new Error("Provide text or image");
  }

  const formData = new FormData();
  if (text) {
    formData.append("text", text);
  }
  if (file) {
    formData.append("image", file);
  }
  if (payload.userId) {
    formData.append("userId", payload.userId);
  }

  const headers: Record<string, string> = {};
  if (payload.userId) {
    headers["x-user-id"] = payload.userId;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_GATEWAY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${AI_GATEWAY_URL}/api/ai/chat`, {
      method: "POST",
      body: formData,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, { error: { code: "AI_GATEWAY_TIMEOUT", message: "Request timeout" } }, "AI gateway timeout");
    }
    if (error instanceof TypeError) {
      throw new ApiError(0, { error: { code: "NETWORK_ERROR", message: error.message } }, "AI gateway network error");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const rawText = await response.text();
  const responsePayload = parseJsonSafe(rawText);

  if (!response.ok) {
    throw new ApiError(response.status, responsePayload, "AI gateway request failed");
  }

  return normalizeResponse(responsePayload);
}
