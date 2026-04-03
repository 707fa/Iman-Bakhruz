import { Crown } from "lucide-react";
import type { RankingItem } from "../types";
import { cn } from "../lib/utils";
import { UserAvatar } from "./UserAvatar";

interface RankingCardProps {
  item: RankingItem;
  rank: number;
  currentUserId?: string;
  showMeta?: boolean;
}

function medal(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return `${rank}.`;
}

export function RankingCard({ item, rank, currentUserId, showMeta = true }: RankingCardProps) {
  const isCurrent = item.studentId === currentUserId;
  const isTop3 = rank <= 3;

  return (
    <article
      className={cn(
        "flex items-center justify-between rounded-2xl border px-4 py-3 transition-all",
        isCurrent
          ? "border-burgundy-300 bg-burgundy-50/80 shadow-soft dark:border-burgundy-700 dark:bg-burgundy-900/35"
          : "border-burgundy-100 bg-white hover:border-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-burgundy-700",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-8 text-center text-sm font-semibold text-charcoal/70 dark:text-zinc-300">{medal(rank)}</span>
        <UserAvatar fullName={item.fullName} avatarUrl={item.avatarUrl} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-charcoal dark:text-zinc-100">{item.fullName}</p>
          {showMeta ? <p className="truncate text-xs text-charcoal/55 dark:text-zinc-400">{item.groupId}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isTop3 ? <Crown className="h-4 w-4 text-burgundy-600" /> : null}
        <span className="text-sm font-bold text-burgundy-700">{item.points.toFixed(2)}</span>
      </div>
    </article>
  );
}
