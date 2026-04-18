import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useUi } from "../hooks/useUi";

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme, t } = useUi();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      size={compact ? "sm" : "default"}
      variant="ghost"
      onClick={toggleTheme}
      className="gap-2 border border-burgundy-200 bg-white/90 text-charcoal hover:bg-burgundy-50 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
      aria-label={t("ui.theme")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {compact ? <span className="hidden sm:inline">{isDark ? t("ui.light") : t("ui.dark")}</span> : isDark ? t("ui.light") : t("ui.dark")}
    </Button>
  );
}
