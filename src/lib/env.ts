export type DataProviderMode = "mock" | "api";

function normalizeProvider(value: string | undefined): DataProviderMode {
  return value?.trim().toLowerCase() === "api" ? "api" : "mock";
}

function normalizeApiUrl(value: string | undefined): string {
  const explicit = (value?.trim() || "").replace(/\/+$/, "");
  if (explicit) return explicit;

  if (typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app")) {
    return "https://result-backend-ynme.onrender.com";
  }

  return "http://localhost:4000";
}

function normalizeOptionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export const DATA_PROVIDER_MODE: DataProviderMode = normalizeProvider(import.meta.env.VITE_DATA_PROVIDER);
export const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const API_HINT_TEACHER_PHONE = normalizeOptionalText(import.meta.env.VITE_API_HINT_TEACHER_PHONE);
export const API_HINT_TEACHER_PASSWORD = normalizeOptionalText(import.meta.env.VITE_API_HINT_TEACHER_PASSWORD);
export const API_HINT_STUDENT_PHONE = normalizeOptionalText(import.meta.env.VITE_API_HINT_STUDENT_PHONE);
export const API_HINT_STUDENT_PASSWORD = normalizeOptionalText(import.meta.env.VITE_API_HINT_STUDENT_PASSWORD);
