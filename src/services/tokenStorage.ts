import type { AuthSession } from "../types";

const TOKEN_KEY = "result-api-token";
const REFRESH_TOKEN_KEY = "result-api-refresh-token";
const DASHBOARD_STATE_KEY = "result-dashboard-v10";
const AUTH_SESSION_KEY = "result-api-session";

function isStoredAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const maybe = value as { role?: unknown; userId?: unknown; isPaid?: unknown; paidUntil?: unknown };
  const validRole = maybe.role === "student" || maybe.role === "teacher" || maybe.role === "parent";
  const validPaid = maybe.isPaid === undefined || typeof maybe.isPaid === "boolean";
  const validPaidUntil = maybe.paidUntil === undefined || typeof maybe.paidUntil === "string";
  return validRole && typeof maybe.userId === "string" && validPaid && validPaidUntil;
}

export function getApiToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setApiToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getApiRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setApiRefreshToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearApiToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function getPersistedAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isStoredAuthSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setPersistedAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearPersistedAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function getSessionUserId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DASHBOARD_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { session?: { userId?: unknown } };
    const userId = parsed?.session?.userId;
    if (typeof userId !== "string") return null;

    const normalized = userId.trim();
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}
