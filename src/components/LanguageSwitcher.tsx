import { localeOrder, type Locale } from "../lib/i18n";
import { cn } from "../lib/utils";
import { useUi } from "../hooks/useUi";

const labels: Record<Locale, string> = {
  ru: "RU",
  uz: "UZ",
  en: "EN",
}; 

interface LanguageSwitcherProps {
  compact?: boolean;
  mode?: "full" | "single";
}

export function LanguageSwitcher({ compact = false, mode = "full" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useUi();
  const currentIndex = localeOrder.indexOf(locale);
  const nextLocale = localeOrder[(currentIndex + 1) % localeOrder.length];

  if (mode === "single") {
    return (
      <button
        type="button"
        onClick={() => setLocale(nextLocale)}
        className={cn(
          "inline-flex h-9 min-w-12 items-center justify-center rounded-xl border border-burgundy-200 bg-white/90 px-3 text-xs font-semibold shadow-sm transition hover:bg-burgundy-50 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800",
          compact && "h-8 min-w-10 px-2.5",
        )}
        aria-label={`${t("ui.language")}: ${labels[locale]}`}
      >
        {labels[locale]}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-burgundy-200 bg-white/90 p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90",
        compact && "scale-[0.96]",
      )}
      aria-label={t("ui.language")}
    >
      {localeOrder.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          className={cn(
            "rounded-lg px-2 py-1.5 text-xs font-semibold transition sm:px-2.5 sm:py-1",
            item === locale
              ? "bg-burgundy-700 text-white"
              : "text-charcoal/70 hover:bg-burgundy-50 hover:text-burgundy-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
          )}
        >
          {labels[item]}
        </button>
      ))}
    </div>
  );
}
