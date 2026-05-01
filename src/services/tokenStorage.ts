const TOKEN_KEY = "result-api-token";
const DASHBOARD_STATE_KEY = "result-dashboard-v9";

export function getApiToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setApiToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearApiToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
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
