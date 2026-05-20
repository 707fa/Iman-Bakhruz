import type { AuthSession } from "../types";

const TOKEN_KEY = "result-api-token";
const REFRESH_TOKEN_KEY = "result-api-refresh-token";
const DASHBOARD_STATE_KEY = "result-dashboard-v10";
const AUTH_SESSION_KEY = "result-api-session";
const REMEMBERED_AUTH_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

interface StoredValue<T> {
  value: T;
  expiresAt?: number;
}

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
  return readStoredString(TOKEN_KEY);
}

export function setApiToken(token: string, remember = isApiAuthRemembered()) {
  if (typeof window === "undefined") return;
  writeStoredString(TOKEN_KEY, token, remember);
}

export function getApiRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return readStoredString(REFRESH_TOKEN_KEY);
}

export function setApiRefreshToken(token: string, remember = isApiAuthRemembered()) {
  if (typeof window === "undefined") return;
  writeStoredString(REFRESH_TOKEN_KEY, token, remember);
}

export function clearApiToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
}

export function getPersistedAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    return readStoredJson(AUTH_SESSION_KEY, isStoredAuthSession);
  } catch {
    return null;
  }
}

export function setPersistedAuthSession(session: AuthSession, remember = isApiAuthRemembered()) {
  if (typeof window === "undefined") return;
  writeStoredJson(AUTH_SESSION_KEY, session, remember);
}

export function clearPersistedAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
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

export function isApiAuthRemembered(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    readStoredStringFrom(window.localStorage, TOKEN_KEY) ||
      readStoredStringFrom(window.localStorage, REFRESH_TOKEN_KEY) ||
      readStoredJsonFrom(window.localStorage, AUTH_SESSION_KEY, isStoredAuthSession),
  );
}

function storagePayload<T>(value: T, remember: boolean): T | StoredValue<T> {
  if (!remember) return value;
  return {
    value,
    expiresAt: Date.now() + REMEMBERED_AUTH_MAX_AGE_MS,
  };
}

function readStoredString(key: string): string | null {
  if (typeof window === "undefined") return null;
  return readStoredStringFrom(window.localStorage, key) ?? readStoredStringFrom(window.sessionStorage, key);
}

function readStoredStringFrom(storage: Storage, key: string): string | null {
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isExpiredStoredValue(parsed)) {
      storage.removeItem(key);
      return null;
    }
    if (isStoredValue<string>(parsed) && typeof parsed.value === "string") {
      return parsed.value;
    }
  } catch {
    // Old token format was stored as a plain string.
  }

  return raw;
}

function writeStoredString(key: string, value: string, remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
  const target = remember ? window.localStorage : window.sessionStorage;
  target.setItem(key, remember ? JSON.stringify(storagePayload(value, true)) : value);
}

function readStoredJson<T>(key: string, guard: (value: unknown) => value is T): T | null {
  if (typeof window === "undefined") return null;
  return readStoredJsonFrom(window.localStorage, key, guard) ?? readStoredJsonFrom(window.sessionStorage, key, guard);
}

function readStoredJsonFrom<T>(storage: Storage, key: string, guard: (value: unknown) => value is T): T | null {
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isExpiredStoredValue(parsed)) {
      storage.removeItem(key);
      return null;
    }
    const candidate = isStoredValue<T>(parsed) ? parsed.value : parsed;
    return guard(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function writeStoredJson<T>(key: string, value: T, remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
  const target = remember ? window.localStorage : window.sessionStorage;
  target.setItem(key, JSON.stringify(storagePayload(value, remember)));
}

function isStoredValue<T>(value: unknown): value is StoredValue<T> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && "value" in value);
}

function isExpiredStoredValue(value: unknown): boolean {
  if (!isStoredValue<unknown>(value)) return false;
  if (typeof value.expiresAt !== "number") return false;
  return value.expiresAt <= Date.now();
}
