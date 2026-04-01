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
      variant="secondary"
      onClick={toggleTheme}
      className="gap-2"
      aria-label={t("ui.theme")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? t("ui.light") : t("ui.dark")}
    </Button>
  );
}
