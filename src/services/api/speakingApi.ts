import { AI_GATEWAY_TIMEOUT_MS, AI_GATEWAY_URL, API_BASE_URL } from "../../lib/env";
import type { SpeakingAnalysisResult } from "../../types";
import { getApiToken, getSessionUserId } from "../tokenStorage";
import { ApiError } from "./http";

interface SpeakingCheckPayload {
  question: string;
  transcript: string;
  level?: string;
  language?: string;
  userId?: string;
}

const SPEAKING_ENDPOINT_PATHS = ["/api/ai/speaking/check", "/api/chat/ai/speaking/check", "/chat/ai/speaking/check"];

function parseJsonSafe(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeScore(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return Math.round(parsed);
}

function normalizeAnalysis(payload: unknown): SpeakingAnalysisResult {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;

  if (!data) {
    throw new Error("Invalid speaking analysis response");
  }

  const mistakesRaw = Array.isArray(data.mistakes) ? data.mistakes : [];
  const mistakes = mistakesRaw
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) return null;
      const original = String(rec.original ?? "").trim();
      const corrected = String(rec.corrected ?? "").trim();
      const reason = String(rec.reason ?? "").trim();
      if (!original && !corrected && !reason) return null;
      return { original, corrected, reason };
    })
    .filter((item): item is { original: string; corrected: string; reason: string } => item !== null);

  return {
    score: normalizeScore(data.score, 0),
    grammarScore: normalizeScore(data.grammarScore, 0),
    fluencyScore: normalizeScore(data.fluencyScore, 0),
    vocabularyScore: normalizeScore(data.vocabularyScore, 0),
    transcript: String(data.transcript ?? "").trim(),
    correctedAnswer: String(data.correctedAnswer ?? "").trim(),
    mistakes,
    feedback: String(data.feedback ?? "").trim(),
    modelAnswer: String(data.modelAnswer ?? "").trim(),
    levelEstimate: String(data.levelEstimate ?? "").trim(),
  };
}

function extractErrorMessage(payload: unknown): string {
  const root = asRecord(payload);
  if (!root) return "";
  const message = root.message;
  if (typeof message === "string" && message.trim()) return message;
  const data = asRecord(root.data);
  if (data && typeof data.message === "string") return data.message;
  const errors = asRecord(root.errors);
  if (errors) {
    const first = Object.values(errors)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }
  return "";
}

export function mapSpeakingApiErrorToMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const message = extractErrorMessage(error.payload);
    if (error.status === 401 || error.status === 403) return "Please log in again to use speaking practice.";
    if (error.status === 402) return "Speaking practice is available for full-access students.";
    if (error.status === 408) return "Request timeout. Please try again.";
    if (error.status === 429) return "Too many requests. Wait a bit and retry.";
    if (error.status >= 500) return message || "AI server is temporarily unavailable. Try again in 1-2 minutes.";
    if (error.status >= 400) return message || "Please check your text and try again.";
  }
  if (error instanceof TypeError) {
    return "Network error. Check internet connection.";
  }
  return "Unable to analyze speaking answer. Please retry.";
}

async function sendRequest(baseUrl: string, path: string, payload: SpeakingCheckPayload): Promise<SpeakingAnalysisResult> {
  const token = getApiToken();
  const userId = payload.userId?.trim() || getSessionUserId() || "";
  const bodyPayload: SpeakingCheckPayload = {
    ...payload,
    userId: userId || undefined,
  };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (userId) {
    headers["x-user-id"] = userId;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_GATEWAY_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify(bodyPayload),
    });

    const rawText = await response.text();
    const responsePayload = parseJsonSafe(rawText);

    if (!response.ok) {
      throw new ApiError(response.status, responsePayload, "Speaking request failed");
    }

    return normalizeAnalysis(responsePayload);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, { message: "Request timeout" }, "Speaking request timeout");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function checkSpeakingAnswer(payload: SpeakingCheckPayload): Promise<SpeakingAnalysisResult> {
  const question = payload.question.trim();
  const transcript = payload.transcript.trim();
  if (!question || !transcript) {
    throw new Error("Question and transcript are required");
  }

  const candidateBases = Array.from(
    new Set([AI_GATEWAY_URL, API_BASE_URL].map((value) => (value || "").trim().replace(/\/+$/, "")).filter(Boolean)),
  );
  let lastError: unknown = null;

  for (const baseUrl of candidateBases) {
    for (const path of SPEAKING_ENDPOINT_PATHS) {
      try {
        return await sendRequest(baseUrl, path, { ...payload, question, transcript });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Speaking endpoint is unavailable");
}
