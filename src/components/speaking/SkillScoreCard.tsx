import { cn } from "../../lib/utils";

interface SkillScoreCardProps {
  label: string;
  score: number;
}

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function barTone(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export function SkillScoreCard({ label, score }: SkillScoreCardProps) {
  const width = Math.min(Math.max(score, 0), 100);

  return (
    <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{label}</p>
        <p className={cn("text-xl font-bold", scoreTone(score))}>{score}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800">
        <div className={cn("h-full rounded-full transition-all duration-500", barTone(score))} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
