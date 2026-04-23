import { AI_GATEWAY_TIMEOUT_MS, VOICE_GATEWAY_ENABLED, VOICE_GATEWAY_URL, VOICE_TTS_VOICE } from "../../lib/env";
import { getApiToken } from "../tokenStorage";
import { ApiError } from "./http";

export interface VoiceTtsPayload {
  text: string;
  lang: string;
  voice?: string | null;
}

export interface VoiceTtsResponse {
  audioSrc: string;
  provider?: string;
}

interface VoiceTtsRecord {
  audioUrl?: unknown;
  audio_url?: unknown;
  url?: unknown;
  audioBase64?: unknown;
  audio_base64?: unknown;
  base64?: unknown;
  mimeType?: unknown;
  mime_type?: unknown;
  format?: unknown;
  provider?: unknown;
}

const VOICE_TTS_PATHS = ["/api/voice/tts", "/api/ai/voice/tts", "/api/tts"];
let lastSuccessfulTtsPath: string | null = null;

function parseJsonSafe(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeJsonTts(payload: unknown): VoiceTtsResponse | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const data = payload as VoiceTtsRecord;

  const audioUrl = asNonEmptyString(data.audioUrl) ?? asNonEmptyString(data.audio_url) ?? asNonEmptyString(data.url);
  if (audioUrl) {
    return {
      audioSrc: audioUrl,
      provider: asNonEmptyString(data.provider) ?? undefined,
    };
  }

  const base64 = asNonEmptyString(data.audioBase64) ?? asNonEmptyString(data.audio_base64) ?? asNonEmptyString(data.base64);
  if (!base64) return null;

  const mime =
    asNonEmptyString(data.mimeType) ?? asNonEmptyString(data.mime_type) ?? asNonEmptyString(data.format) ?? "audio/mpeg";
  const cleanBase64 = base64.includes(",") ? base64.split(",").pop() ?? base64 : base64;
  return {
    audioSrc: `data:${mime};base64,${cleanBase64}`,
    provider: asNonEmptyString(data.provider) ?? undefined,
  };
}

export function isVoiceGatewayReady(): boolean {
  return VOICE_GATEWAY_ENABLED && Boolean(VOICE_GATEWAY_URL);
}

export async function requestVoiceTts(payload: VoiceTtsPayload): Promise<VoiceTtsResponse> {
  if (!isVoiceGatewayReady() || !VOICE_GATEWAY_URL) {
    throw new ApiError(0, { message: "Voice gateway URL is not configured." }, "Voice gateway is disabled");
  }

  const text = payload.text.trim();
  if (!text) {
    throw new ApiError(400, { message: "Text is required for TTS." }, "Empty TTS text");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_GATEWAY_TIMEOUT_MS);
  const voice = payload.voice?.trim() || VOICE_TTS_VOICE || "shimmer";
  const token = getApiToken();

  try {
    const candidatePaths = lastSuccessfulTtsPath
      ? [lastSuccessfulTtsPath, ...VOICE_TTS_PATHS.filter((path) => path !== lastSuccessfulTtsPath)]
      : [...VOICE_TTS_PATHS];

    for (let index = 0; index < candidatePaths.length; index += 1) {
      const path = candidatePaths[index];
      let response: Response;

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        response = await fetch(`${VOICE_GATEWAY_URL}${path}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            text,
            lang: payload.lang,
            voice,
            format: "mp3",
          }),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new ApiError(408, { message: "Voice gateway timeout." }, "Voice TTS timeout");
        }
        if (index === candidatePaths.length - 1) {
          if (error instanceof TypeError) {
            throw new ApiError(0, { message: "Voice gateway network error." }, "Voice TTS network error");
          }
          throw error;
        }
        continue;
      }

      if (!response.ok) {
        if (index < candidatePaths.length - 1 && (response.status === 404 || response.status === 405)) {
          continue;
        }
        const payloadError = parseJsonSafe(await response.text());
        throw new ApiError(response.status, payloadError, "Voice TTS request failed");
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType.startsWith("audio/")) {
        const blob = await response.blob();
        lastSuccessfulTtsPath = path;
        return {
          audioSrc: URL.createObjectURL(blob),
        };
      }

      const rawText = await response.text();
      const responsePayload = parseJsonSafe(rawText);
      const normalized = normalizeJsonTts(responsePayload);
      if (normalized) {
        lastSuccessfulTtsPath = path;
        return normalized;
      }

      if (index < candidatePaths.length - 1) {
        continue;
      }

      throw new ApiError(502, responsePayload, "Voice TTS response is invalid");
    }

    throw new ApiError(404, { message: "No supported TTS endpoint found." }, "Voice TTS endpoint not found");
  } finally {
    window.clearTimeout(timeoutId);
  }
}
