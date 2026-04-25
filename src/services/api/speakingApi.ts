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
  groupTitle?: string;
  groupTime?: string;
  mode?: "daily" | "weekly_exam";
  userId?: string;
}

interface SpeakingQuestionsPayload {
  level?: string;
  language?: string;
  lessonTopic: string;
  teacherQuestions?: string[];
  userId?: string;
}

export interface GeneratedSpeakingQuestion {
  id: string;
  topic: string;
  prompt: string;
}

const SPEAKING_ENDPOINT_PATHS = ["/api/ai/speaking/check", "/api/chat/ai/speaking/check", "/chat/ai/speaking/check"];
const SPEAKING_QUESTIONS_ENDPOINT_PATHS = ["/api/ai/speaking/questions", "/api/chat/ai/speaking/questions", "/chat/ai/speaking/questions"];

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

function normalizeSentence(text: string): string {
  const clean = String(text || "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const withCapital = clean.charAt(0).toUpperCase() + clean.slice(1);
  return /[.!?]$/.test(withCapital) ? withCapital : `${withCapital}.`;
}

function tokenize(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function average(...values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function clampScore(value: number): number {
  return normalizeScore(Math.round(value), 0);
}

function buildHeuristicAnalysis(payload: SpeakingCheckPayload): SpeakingAnalysisResult {
  const transcript = String(payload.transcript || "").trim();
  const question = String(payload.question || "").trim();
  const words = tokenize(transcript);
  const uniqueWords = new Set(words);
  const wordCount = words.length;
  const uniqueRatio = wordCount > 0 ? uniqueWords.size / wordCount : 0;

  const hasEndingPunctuation = /[.!?]$/.test(transcript);
  const hasCommonVerb = /\b(am|is|are|was|were|have|has|had|do|does|did|go|goes|went|will|can|should|would|like|want|study|learn)\b/i.test(
    transcript,
  );

  const questionTokens = new Set(tokenize(question).filter((item) => item.length >= 4));
  const overlapCount = [...questionTokens].filter((token) => uniqueWords.has(token)).length;
  const relevance = questionTokens.size > 0 ? overlapCount / questionTokens.size : 0.5;

  const grammarScore = clampScore(38 + (hasEndingPunctuation ? 10 : 0) + (hasCommonVerb ? 12 : 0) + Math.min(20, wordCount * 1.1));
  const fluencyScore = clampScore(35 + Math.min(45, wordCount * 1.6));
  const vocabularyScore = clampScore(35 + uniqueRatio * 45 + Math.min(15, wordCount / 3));
  const relevanceScore = clampScore(35 + relevance * 65);
  const score = clampScore(average(grammarScore, fluencyScore, vocabularyScore, relevanceScore));

  const mistakes: Array<{ original: string; corrected: string; reason: string }> = [];
  if (!hasEndingPunctuation && transcript) {
    mistakes.push({
      original: transcript,
      corrected: normalizeSentence(transcript),
      reason: "Add ending punctuation for a complete sentence.",
    });
  }
  if (!hasCommonVerb && transcript) {
    mistakes.push({
      original: transcript,
      corrected: `${normalizeSentence(transcript)} I use full sentences with verbs.`,
      reason: "Try to include a clear verb in each sentence.",
    });
  }

  return {
    score,
    grammarScore,
    fluencyScore,
    vocabularyScore,
    transcript,
    correctedAnswer: normalizeSentence(transcript),
    mistakes,
    feedback:
      score >= 70
        ? "Good answer. Keep your structure clear and add one extra detail to sound more natural."
        : "Connection fallback check used. Improve with longer full sentences, clear verbs, and one concrete example.",
    modelAnswer: question
      ? `A strong sample answer: ${normalizeSentence(`In my opinion, ${question.toLowerCase()} because it helps me communicate clearly in real situations`)}`
      : "A strong sample answer: I organize my ideas, give one clear example, and finish with a short conclusion.",
    levelEstimate: String(payload.level || "estimated"),
  };
}

function buildPlatformAiSpeakingPrompt(payload: SpeakingCheckPayload): string {
  return [
    "You are an expert English speaking evaluator for ESL students.",
    "Evaluate the answer fully using grammar, fluency, vocabulary, and relevance to the question.",
    "Return STRICT JSON only (no markdown, no explanation outside JSON):",
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
    "Rules:",
    "- Use scores 0..100 and keep them realistic.",
    "- mistakes must include specific real mistakes from transcript when possible.",
    "- correctedAnswer must be natural and grammatically correct English.",
    "- modelAnswer must be a concise high-quality sample answer to the same question.",
    "- feedback must be practical, clear, and short (max 4 lines).",
    "- Never return null fields. Return empty string/array instead.",
    "",
    `Level hint: ${String(payload.level || "").trim() || "unknown"}`,
    `Language hint: ${String(payload.language || "").trim() || "en"}`,
    `Group hint: ${String(payload.groupTitle || "").trim() || "unknown"}`,
    `Time hint: ${String(payload.groupTime || "").trim() || "unknown"}`,
    `Mode hint: ${String(payload.mode || "").trim() || "daily"}`,
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
  const messages = await platformApi.sendAiMessage(token, {
    text: prompt,
    level: payload.level,
    language: payload.language,
    groupTitle: payload.groupTitle,
    groupTime: payload.groupTime,
  });
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

function normalizeQuestionsResponse(payload: unknown): GeneratedSpeakingQuestion[] {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const list = Array.isArray(data?.questions) ? data.questions : [];
  const normalized: GeneratedSpeakingQuestion[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    const rec = asRecord(item);
    if (!rec) continue;
    const prompt = String(rec.prompt ?? "").trim();
    if (!prompt) continue;
    const key = prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      id: String(rec.id ?? `q-${normalized.length + 1}`),
      topic: String(rec.topic ?? "Lesson topic").trim() || "Lesson topic",
      prompt,
    });
    if (normalized.length >= 20) break;
  }

  if (normalized.length === 0) {
    throw new Error("Empty generated speaking questions");
  }

  return normalized;
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
    if (transcript) {
      return buildHeuristicAnalysis({ ...payload, question, transcript });
    }
    throw fallbackError ?? lastError ?? new Error("Speaking endpoint is unavailable");
  }
}

export async function generateSpeakingQuestions(payload: SpeakingQuestionsPayload): Promise<GeneratedSpeakingQuestion[]> {
  const lessonTopic = payload.lessonTopic.trim();
  if (!lessonTopic) {
    throw new Error("Lesson topic is required");
  }

  const candidateBases = Array.from(
    new Set([AI_GATEWAY_URL, API_BASE_URL].map((value) => (value || "").trim().replace(/\/+$/, "")).filter(Boolean)),
  );
  const token = getApiToken();
  const userId = payload.userId?.trim() || getSessionUserId() || "";
  const bodyPayload: SpeakingQuestionsPayload = {
    ...payload,
    lessonTopic,
    userId: userId || undefined,
    teacherQuestions: Array.isArray(payload.teacherQuestions) ? payload.teacherQuestions.filter(Boolean).slice(0, 20) : [],
  };

  let lastError: unknown = null;

  for (const baseUrl of candidateBases) {
    for (const path of SPEAKING_QUESTIONS_ENDPOINT_PATHS) {
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
          throw new ApiError(response.status, responsePayload, "Speaking questions request failed");
        }

        return normalizeQuestionsResponse(responsePayload);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new ApiError(408, { message: "Request timeout" }, "Speaking questions timeout");
          continue;
        }
        lastError = error;
      } finally {
        window.clearTimeout(timeoutId);
      }
    }
  }

  throw lastError ?? new Error("Speaking questions endpoint is unavailable");
}
