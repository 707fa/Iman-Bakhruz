export type DataProviderMode = "mock" | "api";

function hasExplicitUrl(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function isLocalBrowser(): boolean {
  if (typeof window === "undefined") return true;
  const { hostname, protocol } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1" || protocol === "file:";
}

function shouldPreferApiMode(apiUrlValue: string | undefined): boolean {
  if (hasExplicitUrl(apiUrlValue)) return true;

  if (isLocalBrowser()) {
    return true;
  }

  return false;
}

function normalizeProvider(value: string | undefined, apiUrlValue: string | undefined): DataProviderMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "api") return "api";
  if (normalized === "mock") return "mock";
  return shouldPreferApiMode(apiUrlValue) ? "api" : "mock";
}

function normalizeApiUrl(value: string | undefined, localFallback: string): string {
  const explicit = (value?.trim() || "").replace(/\/+$/, "");
  if (explicit) return explicit;

  if (isLocalBrowser()) {
    return localFallback;
  }

  return "";
}

function normalizePlatformApiUrl(value: string | undefined, localFallback: string): string {
  const normalized = normalizeApiUrl(value, localFallback);
  if (!normalized) return "";
  if (/\/api(?:\/|$)/i.test(normalized)) return normalized;
  return `${normalized}/api`;
}

function normalizeOptionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalUrl(value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  const cleaned = normalized.replace(/\/+$/, "");
  const lower = cleaned.toLowerCase();

  const isLocalGateway = lower.startsWith("http://127.0.0.1") || lower.startsWith("http://localhost");
  if (
    isLocalGateway &&
    typeof window !== "undefined" &&
    (window.location.hostname.endsWith("vercel.app") || window.location.protocol === "https:")
  ) {
    return null;
  }

  // Ignore common placeholder values to avoid broken runtime requests.
  if (
    lower.includes("your-ai-gateway-domain.com") ||
    lower.includes("<your-gateway-domain>") ||
    lower.includes("result-backend-abc123.onrender.com")
  ) {
    return null;
  }

  return cleaned;
}

function normalizeTimeout(value: string | undefined, fallbackMs: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallbackMs;
  const intValue = Math.trunc(parsed);
  if (intValue < 3000) return 3000;
  if (intValue > 180000) return 180000;
  return intValue;
}

function normalizeBoolean(value: string | undefined, fallback: boolean): boolean {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") return false;
  return fallback;
}

const platformApiUrlCandidate = import.meta.env.VITE_PLATFORM_API_URL ?? import.meta.env.VITE_API_URL;
export const DATA_PROVIDER_MODE: DataProviderMode = normalizeProvider(import.meta.env.VITE_DATA_PROVIDER, platformApiUrlCandidate);
const socketUrlCandidate = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_AI_GATEWAY_URL;
const gatewayUrlCandidate =
  import.meta.env.VITE_AI_GATEWAY_URL ?? import.meta.env.VITE_SOCKET_URL ?? (DATA_PROVIDER_MODE === "api" ? platformApiUrlCandidate : undefined);
const voiceGatewayUrlCandidate = import.meta.env.VITE_VOICE_GATEWAY_URL ?? gatewayUrlCandidate;

export const API_BASE_URL = normalizePlatformApiUrl(platformApiUrlCandidate, "http://127.0.0.1:8000");
export const API_BASE_URL_CONFIGURED = Boolean(API_BASE_URL);
export const SOCKET_BASE_URL = normalizeOptionalUrl(socketUrlCandidate) ?? (isLocalBrowser() ? "http://127.0.0.1:8080" : null);
export const API_REQUEST_TIMEOUT_MS = normalizeTimeout(import.meta.env.VITE_API_TIMEOUT_MS, 65000);
export const AI_GATEWAY_URL = normalizeOptionalUrl(gatewayUrlCandidate);
export const AI_GATEWAY_ENABLED = normalizeBoolean(import.meta.env.VITE_AI_GATEWAY_ENABLED, AI_GATEWAY_URL !== null);
export const AI_GATEWAY_TIMEOUT_MS = normalizeTimeout(import.meta.env.VITE_AI_GATEWAY_TIMEOUT_MS, 90000);
export const VOICE_GATEWAY_URL = normalizeOptionalUrl(voiceGatewayUrlCandidate);
export const VOICE_GATEWAY_ENABLED = normalizeBoolean(import.meta.env.VITE_VOICE_GATEWAY_ENABLED, VOICE_GATEWAY_URL !== null);
export const VOICE_TTS_VOICE = normalizeOptionalText(import.meta.env.VITE_VOICE_TTS_VOICE);
export const VOICE_BROWSER_FALLBACK_ENABLED = normalizeBoolean(import.meta.env.VITE_VOICE_BROWSER_FALLBACK_ENABLED, true);
export const API_HINT_TEACHER_PHONE = normalizeOptionalText(import.meta.env.VITE_API_HINT_TEACHER_PHONE);
export const API_HINT_TEACHER_PASSWORD = normalizeOptionalText(import.meta.env.VITE_API_HINT_TEACHER_PASSWORD);
export const API_HINT_STUDENT_PHONE = normalizeOptionalText(import.meta.env.VITE_API_HINT_STUDENT_PHONE);
export const API_HINT_STUDENT_PASSWORD = normalizeOptionalText(import.meta.env.VITE_API_HINT_STUDENT_PASSWORD);
