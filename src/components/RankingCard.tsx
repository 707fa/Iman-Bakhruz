import { Crown } from "lucide-react";
import { Link } from "react-router-dom";
import type { RankingItem } from "../types";
import { getRankTitle } from "../lib/ranking";
import { cn } from "../lib/utils";
import { UserAvatar } from "./UserAvatar";

interface RankingCardProps {
  item: RankingItem;
  rank: number;
  currentUserId?: string;
  showMeta?: boolean;
  href?: string;
}

function medal(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return `${rank}.`;
}

function statusDot(status?: "red" | "yellow" | "green"): string {
  if (status === "green") return "bg-emerald-500";
  if (status === "red") return "bg-rose-500";
  return "bg-amber-500";
}

export function RankingCard({ item, rank, currentUserId, showMeta = true, href }: RankingCardProps) {
  const isCurrent = item.studentId === currentUserId;
  const isTop3 = rank <= 3;
  const content = (
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

      <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <span className={`hidden h-2.5 w-2.5 rounded-full sm:inline-flex ${statusDot(item.statusBadge)}`} />
        {isTop3 ? <Crown className="h-4 w-4 text-burgundy-600" /> : null}
        <span className="rounded-full border border-burgundy-200 bg-burgundy-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-900/30 dark:text-burgundy-200 sm:text-[10px]">
          {getRankTitle(rank)}
        </span>
        <span className="text-sm font-bold text-burgundy-700">{item.points.toFixed(2)}</span>
      </div>
    </article>
  );

  if (!href) return content;

  return (
    <Link to={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-400">
      {content}
    </Link>
  );
}
