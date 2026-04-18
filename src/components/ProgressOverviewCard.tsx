import { Activity, Flame, Star } from "lucide-react";
import { useUi } from "../hooks/useUi";
import type { ProgressSnapshot } from "../types";
import { Badge } from "./ui/badge";
import { StatusBadge } from "./StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ProgressOverviewCardProps {
  title: string;
  progress?: ProgressSnapshot;
}

const metricConfig: Array<{ key: keyof Omit<ProgressSnapshot, "status" | "weeklyXp" | "level" | "streakDays">; label: string }> = [
  { key: "grammar", label: "Grammar" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "homework", label: "Homework" },
  { key: "speaking", label: "Speaking" },
  { key: "attendance", label: "Attendance" },
];

function valueBar(value: number): string {
  if (value >= 75) return "bg-burgundy-700";
  if (value >= 45) return "bg-burgundy-500";
  return "bg-zinc-500";
}

export function ProgressOverviewCard({ title, progress }: ProgressOverviewCardProps) {
  const { t } = useUi();
  const safe = progress ?? {
    status: "yellow" as const,
    grammar: 0,
    vocabulary: 0,
    homework: 0,
    speaking: 0,
    attendance: 0,
    weeklyXp: 0,
    level: 1,
    streakDays: 0,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <StatusBadge status={safe.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          {safe.streakDays >= 5 ? (
            <Badge variant="positive">{t("progress.streakBadgeReady")}</Badge>
          ) : (
            <Badge variant="soft">{t("progress.streakBadgeGoal", { count: 5 - safe.streakDays })}</Badge>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="inline-flex items-center gap-1 text-xs text-charcoal/60 dark:text-zinc-400">
              <Activity className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
              Weekly XP
            </p>
            <p className="mt-1 text-lg font-semibold text-burgundy-700 dark:text-white">{safe.weeklyXp}</p>
          </div>
          <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="inline-flex items-center gap-1 text-xs text-charcoal/60 dark:text-zinc-400">
              <Star className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
              Level
            </p>
            <p className="mt-1 text-lg font-semibold text-burgundy-700 dark:text-white">{safe.level}</p>
          </div>
          <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="inline-flex items-center gap-1 text-xs text-charcoal/60 dark:text-zinc-400">
              <Flame className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
              Streak
            </p>
            <p className="mt-1 text-lg font-semibold text-burgundy-700 dark:text-white">{safe.streakDays}d</p>
          </div>
        </div>

        <div className="space-y-3">
          {metricConfig.map((metric) => {
            const value = safe[metric.key];
            return (
              <div key={metric.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-charcoal/80 dark:text-zinc-200">{metric.label}</p>
                  <p className="font-semibold text-charcoal dark:text-zinc-100">{value}%</p>
                </div>
                <div className="h-2 rounded-full bg-burgundy-100/70 dark:bg-zinc-800">
                  <div className={`h-2 rounded-full transition-all ${valueBar(value)}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


