import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useUi } from "../hooks/useUi";
import { cn } from "../lib/utils";
import { Input } from "./ui/input";

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  className?: string;
}

export function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
  enterKeyHint,
  className,
}: PasswordFieldProps) {
  const { t } = useUi();
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint={enterKeyHint}
        placeholder={placeholder}
        className="pr-12"
        required
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        disabled={disabled}
        className="absolute inset-y-0 right-0 inline-flex items-center justify-center px-3 text-charcoal/55 transition hover:text-burgundy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-300 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-white"
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
      >
        {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}

