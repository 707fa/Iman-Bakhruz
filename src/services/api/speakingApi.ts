import { AI_GATEWAY_TIMEOUT_MS, AI_GATEWAY_URL, API_BASE_URL } from "../../lib/env";
import type { SpeakingAnalysisResult } from "../../types";
import { getApiToken, getSessionUserId } from "../tokenStorage";
import { ApiError } from "./http";
import { platformApi } from "./platformApi";

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

function extractJsonCandidate(rawText: string): unknown {
  const text = String(rawText || "").trim();
  if (!text) return null;

  const direct = parseJsonSafe(text);
  if (direct && typeof direct === "object") {
    return direct;
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const parsed = parseJsonSafe(fencedMatch[1].trim());
    if (parsed && typeof parsed === "object") return parsed;
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const maybeJson = text.slice(firstBrace, lastBrace + 1);
    const parsed = parseJsonSafe(maybeJson);
    if (parsed && typeof parsed === "object") return parsed;
  }

  return null;
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

function fallbackAnalysisFromText(rawText: string, transcript: string): SpeakingAnalysisResult {
  const feedback = String(rawText || "").trim().slice(0, 1500);
  return {
    score: 0,
    grammarScore: 0,
    fluencyScore: 0,
    vocabularyScore: 0,
    transcript: transcript.trim(),
    correctedAnswer: "",
    mistakes: [],
    feedback: feedback || "AI returned an empty answer. Please retry.",
    modelAnswer: "",
    levelEstimate: "",
  };
}

function buildPlatformAiSpeakingPrompt(payload: SpeakingCheckPayload): string {
  return [
    "You are an English speaking evaluator for students.",
    "Return STRICT JSON only (no markdown):",
    "{",
    '  "score": number,',
    '  "grammarScore": number,',
    '  "fluencyScore": number,',
    '  "vocabularyScore": number,',
    '  "transcript": "string",',
    '  "correctedAnswer": "string",',
    '  "mistakes": [{"original":"string","corrected":"string","reason":"string"}],',
    '  "feedback": "string",',
    '  "modelAnswer": "string",',
    '  "levelEstimate": "string"',
    "}",
    "Use scores 0..100. Keep feedback practical and short.",
    "",
    `Level hint: ${String(payload.level || "").trim() || "unknown"}`,
    `Language hint: ${String(payload.language || "").trim() || "en"}`,
    `Question: ${String(payload.question || "").trim()}`,
    `Student transcript: ${String(payload.transcript || "").trim()}`,
  ].join("\n");
}

async function checkViaPlatformAi(payload: SpeakingCheckPayload): Promise<SpeakingAnalysisResult> {
  const token = getApiToken();
  if (!token) {
    throw new ApiError(401, { message: "No API token. Re-login is required." }, "Speaking fallback requires auth");
  }

  const prompt = buildPlatformAiSpeakingPrompt(payload);
  const messages = await platformApi.sendAiMessage(token, { text: prompt });
  const assistantText =
    [...messages].reverse().find((item) => item.role === "assistant" && item.text.trim())?.text.trim() ?? "";

  if (!assistantText) {
    throw new ApiError(502, { message: "AI returned empty response" }, "Speaking fallback empty response");
  }

  const extracted = extractJsonCandidate(assistantText);
  if (extracted) {
    return normalizeAnalysis(extracted);
  }

  return fallbackAnalysisFromText(assistantText, payload.transcript);
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
    if (error.status >= 400) {
      if (message && !/please check your text/i.test(message)) return message;
      return "AI could not analyze this answer. Please retry.";
    }
  }
  if (error instanceof TypeError) {
    return "Network error. Check internet or API connection.";
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
        if (error instanceof ApiError) {
          if ([401, 402, 403].includes(error.status)) {
            throw error;
          }
          lastError = error;
          continue;
        }
        if (error instanceof TypeError) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
  }

  try {
    return await checkViaPlatformAi({
      ...payload,
      question,
      transcript,
    });
  } catch (fallbackError) {
    if (fallbackError instanceof ApiError && [401, 402, 403].includes(fallbackError.status)) {
      throw fallbackError;
    }
    throw fallbackError ?? lastError ?? new Error("Speaking endpoint is unavailable");
  }
}
