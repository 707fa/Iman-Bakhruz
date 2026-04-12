export type DataProviderMode = "mock" | "api";

function hasExplicitApiUrl(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function normalizeProvider(value: string | undefined, apiUrlValue: string | undefined): DataProviderMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "api") return "api";
  if (normalized === "mock") return "mock";
  return hasExplicitApiUrl(apiUrlValue) ? "api" : "mock";
}

function normalizeApiUrl(value: string | undefined): string {
  const explicit = (value?.trim() || "").replace(/\/+$/, "");
  if (explicit) return explicit;

  if (typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app")) {
    return "https://result-backend-ynme.onrender.com";
  }

  return "http://127.0.0.1:8000";
}

function normalizeOptionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalUrl(value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.replace(/\/+$/, "");
}

function normalizeTimeout(value: string | undefined, fallbackMs: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallbackMs;
  const intValue = Math.trunc(parsed);
  if (intValue < 3000) return 3000;
  if (intValue > 180000) return 180000;
  return intValue;
}

export const DATA_PROVIDER_MODE: DataProviderMode = normalizeProvider(import.meta.env.VITE_DATA_PROVIDER, import.meta.env.VITE_API_URL);
export const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const API_REQUEST_TIMEOUT_MS = normalizeTimeout(import.meta.env.VITE_API_TIMEOUT_MS, 65000);
export const AI_GATEWAY_URL = normalizeOptionalUrl(import.meta.env.VITE_AI_GATEWAY_URL);
export const AI_GATEWAY_TIMEOUT_MS = normalizeTimeout(import.meta.env.VITE_AI_GATEWAY_TIMEOUT_MS, 90000);
export const API_HINT_TEACHER_PHONE = normalizeOptionalText(import.meta.env.VITE_API_HINT_TEACHER_PHONE);
export const API_HINT_TEACHER_PASSWORD = normalizeOptionalText(import.meta.env.VITE_API_HINT_TEACHER_PASSWORD);
export const API_HINT_STUDENT_PHONE = normalizeOptionalText(import.meta.env.VITE_API_HINT_STUDENT_PHONE);
export const API_HINT_STUDENT_PASSWORD = normalizeOptionalText(import.meta.env.VITE_API_HINT_STUDENT_PASSWORD);
