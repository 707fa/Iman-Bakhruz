import { Minus, Plus, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useUi } from "../hooks/useUi";
import type { ScoreAction } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ScoreActionsProps {
  onSelect: (action: ScoreAction) => void;
}

export function ScoreActions({ onSelect }: ScoreActionsProps) {
  const { t } = useUi();

  const quickActions: ScoreAction[] = [
    { value: 5, label: t("score.quickDone") },
    { value: 3.5, label: t("score.quickOneLeft") },
    { value: 1.25, label: t("score.quickPartial") },
    { value: -2, label: t("score.quickNotDone") },
  ];

  const [customValue, setCustomValue] = useState("");

  const parsedCustom = useMemo(() => Number(customValue.replace(",", ".")), [customValue]);
  const isCustomValid = Number.isFinite(parsedCustom) && customValue.trim().length > 0;

  function applyCustomScore(event?: FormEvent<HTMLFormElement>) {
    if (event) {
      event.preventDefault();
    }
    if (!isCustomValid) return;

    onSelect({
      value: Number(parsedCustom.toFixed(2)),
      label: t("score.customDefaultLabel"),
    });
    setCustomValue("");
  }

  return (
    <div className="space-y-3">
      <form
        className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
        onSubmit={applyCustomScore}
      >
        <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-400">
          <SlidersHorizontal className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
          {t("score.custom")}
        </p>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            placeholder={t("score.customValuePlaceholder")}
            inputMode="decimal"
          />
          <Button type="submit" variant="secondary" disabled={!isCustomValid}>
            {t("score.apply")}
          </Button>
        </div>
      </form>

      <div className="grid gap-2 sm:grid-cols-2">
        {quickActions.map((action) => (
          <Button
            key={`${action.value}-${action.label}`}
            variant={action.value >= 0 ? "positive" : "destructive"}
            size="sm"
            onClick={() => onSelect(action)}
            className="h-auto justify-start gap-1.5 whitespace-normal py-2 text-left leading-snug"
          >
            {action.value >= 0 ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {action.value > 0 ? "+" : ""}
            {action.value} - {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}


