import { Activity, Flame, Gamepad2, Star, Trophy } from "lucide-react";
import { useUi } from "../hooks/useUi";
import type { ProgressSnapshot } from "../types";
import { Badge } from "./ui/badge";
import { StatusBadge } from "./StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ProgressOverviewCardProps {
  title: string;
  progress?: ProgressSnapshot;
}

const metricConfig: Array<{
  key: keyof Omit<ProgressSnapshot, "status" | "weeklyXp" | "level" | "streakDays" | "gameWins" | "gamesPlayed" | "gameBonusPoints">;
  label: string;
}> = [
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

function polarPoint(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
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
    gameWins: 0,
    gamesPlayed: 0,
    gameBonusPoints: 0,
  };

  const chartSize = 280;
  const center = chartSize / 2;
  const maxRadius = 96;
  const ringSteps = [20, 40, 60, 80, 100];
  const axisPoints = metricConfig.map((_, index) => {
    const angle = (360 / metricConfig.length) * index;
    const edge = polarPoint(center, center, maxRadius, angle);
    const label = polarPoint(center, center, maxRadius + 18, angle);
    return { angle, edge, label };
  });

  const shapePoints = metricConfig.map((metric, index) => {
    const ratio = Math.max(0, Math.min(100, safe[metric.key])) / 100;
    const angle = (360 / metricConfig.length) * index;
    return polarPoint(center, center, maxRadius * ratio, angle);
  });

  const polygonPath = shapePoints.map((point) => `${point.x},${point.y}`).join(" ");

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

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-burgundy-100 bg-burgundy-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="inline-flex items-center gap-1 text-xs text-charcoal/60 dark:text-zinc-400">
              <Gamepad2 className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
              Games
            </p>
            <p className="mt-1 text-lg font-semibold text-burgundy-700 dark:text-white">{safe.gamesPlayed ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-burgundy-100 bg-burgundy-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="inline-flex items-center gap-1 text-xs text-charcoal/60 dark:text-zinc-400">
              <Trophy className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
              Game wins
            </p>
            <p className="mt-1 text-lg font-semibold text-burgundy-700 dark:text-white">{safe.gameWins ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-burgundy-100 bg-burgundy-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="inline-flex items-center gap-1 text-xs text-charcoal/60 dark:text-zinc-400">
              <Star className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
              Game bonus
            </p>
            <p className="mt-1 text-lg font-semibold text-burgundy-700 dark:text-white">+{safe.gameBonusPoints ?? 0}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="rounded-3xl bg-burgundy-50/45 p-3 dark:bg-burgundy-900/20">
            <svg
              viewBox={`0 0 ${chartSize} ${chartSize}`}
              className="mx-auto h-[15.5rem] w-full max-w-[22rem]"
              role="img"
              aria-label="Student progress radar chart"
            >
              {ringSteps.map((step) => {
                const ringRadius = (maxRadius * step) / 100;
                const ringPoints = metricConfig
                  .map((_, index) => {
                    const angle = (360 / metricConfig.length) * index;
                    const point = polarPoint(center, center, ringRadius, angle);
                    return `${point.x},${point.y}`;
                  })
                  .join(" ");
                return (
                  <polygon
                    key={`ring-${step}`}
                    points={ringPoints}
                    fill="none"
                    className="stroke-burgundy-300/45 dark:stroke-burgundy-800/55"
                    strokeWidth="1"
                  />
                );
              })}

              {axisPoints.map((axis, index) => (
                <line
                  key={`axis-${metricConfig[index]?.key ?? index}`}
                  x1={center}
                  y1={center}
                  x2={axis.edge.x}
                  y2={axis.edge.y}
                  className="stroke-burgundy-300/45 dark:stroke-burgundy-800/55"
                  strokeWidth="1"
                />
              ))}

              <polygon points={polygonPath} className="fill-burgundy-500/20 stroke-burgundy-600 dark:fill-burgundy-500/25 dark:stroke-burgundy-400" strokeWidth="2.5" />

              {shapePoints.map((point, index) => (
                <circle
                  key={`point-${metricConfig[index]?.key ?? index}`}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  className="fill-burgundy-700 dark:fill-burgundy-300"
                />
              ))}

              {axisPoints.map((axis, index) => (
                <text
                  key={`label-${metricConfig[index]?.key ?? index}`}
                  x={axis.label.x}
                  y={axis.label.y}
                  className="fill-charcoal/70 text-[10px] font-semibold uppercase tracking-[0.08em] dark:fill-zinc-300"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {metricConfig[index].label}
                </text>
              ))}
            </svg>
          </div>

          <div className="space-y-2">
            {metricConfig.map((metric) => {
              const value = safe[metric.key];
              return (
                <div key={metric.key} className="rounded-2xl bg-white/80 p-2.5 ring-1 ring-zinc-200/70 dark:bg-zinc-900/70 dark:ring-zinc-700">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <p className="font-semibold text-charcoal/75 dark:text-zinc-200">{metric.label}</p>
                    <p className="font-semibold text-charcoal dark:text-zinc-100">{value}%</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-burgundy-100/70 dark:bg-zinc-800">
                    <div className={`h-1.5 rounded-full transition-all ${valueBar(value)}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
