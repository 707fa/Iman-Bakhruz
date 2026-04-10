import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { cn, makeId } from "../lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ShowToastOptions {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toneStyles: Record<ToastTone, string> = {
  success: "border-burgundy-200 bg-burgundy-50 text-burgundy-800 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-white",
  error: "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
  info: "border-burgundy-200 bg-burgundy-50 text-burgundy-800 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-white",
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "error") return <CircleAlert className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(({ message, tone = "info", durationMs = 2600 }: ShowToastOptions) => {
    let id: string | null = null;
    setItems((prev) => {
      const hasSameToast = prev.some((item) => item.message === message && item.tone === tone);
      if (hasSameToast) return prev;
      id = makeId("toast");
      return [...prev, { id, message, tone }];
    });

    if (!id) return;

    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, Math.max(1200, durationMs));
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-3 sm:justify-end sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex items-start gap-2 rounded-2xl border px-3 py-3 text-sm shadow-soft backdrop-blur",
                toneStyles[item.tone],
              )}
              role="status"
              aria-live="polite"
            >
              <span className="mt-0.5 shrink-0">
                <ToneIcon tone={item.tone} />
              </span>
              <p className="min-w-0 flex-1 break-words">{item.message}</p>
              <button
                type="button"
                className="shrink-0 rounded-md p-1 opacity-70 transition hover:opacity-100"
                onClick={() => removeToast(item.id)}
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

