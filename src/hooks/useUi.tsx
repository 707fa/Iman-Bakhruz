import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { localeOrder, translate, type Locale, type ThemeMode, type TranslateParams } from "../lib/i18n";

const STORAGE_KEY = "result-ui-settings-v1";

interface UiState {
  locale: Locale;
  theme: ThemeMode;
}

interface UiContextValue extends UiState {
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  t: (key: string, params?: TranslateParams) => string;
}

function readUiState(): UiState {
  if (typeof window === "undefined") return { locale: "ru", theme: "light" };

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { locale: "ru", theme: "light" };
  }

  if (!raw) return { locale: "ru", theme: "light" };

  try {
    const parsed = JSON.parse(raw) as UiState;
    const locale = localeOrder.includes(parsed.locale) ? parsed.locale : "ru";
    const theme: ThemeMode = parsed.theme === "dark" ? "dark" : "light";
    return { locale, theme };
  } catch {
    return { locale: "ru", theme: "light" };
  }
}

function saveUiState(state: UiState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors (private mode, restricted storage, etc).
  }
}

const UiContext = createContext<UiContextValue | undefined>(undefined);

export function UiProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<UiState>(() => readUiState());

  useEffect(() => {
    saveUiState(state);
  }, [state]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle("dark", state.theme === "dark");
    body.classList.toggle("dark", state.theme === "dark");
    root.setAttribute("data-theme", state.theme);
    body.setAttribute("data-theme", state.theme);
    root.style.colorScheme = state.theme;
  }, [state.theme]);

  const value = useMemo<UiContextValue>(
    () => ({
      ...state,
      setLocale: (locale) => setState((prev) => ({ ...prev, locale })),
      setTheme: (theme) => setState((prev) => ({ ...prev, theme })),
      toggleTheme: () => setState((prev) => ({ ...prev, theme: prev.theme === "dark" ? "light" : "dark" })),
      t: (key, params) => translate(state.locale, key, params),
    }),
    [state],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const context = useContext(UiContext);
  if (!context) {
    throw new Error("useUi must be used within UiProvider");
  }
  return context;
}
