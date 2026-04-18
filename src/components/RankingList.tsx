import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { Group, RankingItem } from "../types";
import { useUi } from "../hooks/useUi";
import { RankingCard } from "./RankingCard";

interface RankingListProps {
  title: string;
  items: RankingItem[];
  groups?: Group[];
  currentUserId?: string;
  showMeta?: boolean;
  itemHref?: (item: RankingItem) => string | undefined;
}

export function RankingList({ title, items, groups = [], currentUserId, showMeta = true, itemHref }: RankingListProps) {
  const { t } = useUi();
  const mapped = items.map((item) => {
    const group = groups.find((entry) => entry.id === item.groupId);
    return {
      ...item,
      groupId: group ? `${group.title} \u2022 ${group.time}` : item.groupId,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 sm:p-6">
        {mapped.length === 0 ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {t("ui.noData")}
          </p>
        ) : (
          mapped.map((item, index) => (
            <RankingCard
              key={item.studentId}
              item={item}
              rank={index + 1}
              currentUserId={currentUserId}
              showMeta={showMeta}
              href={itemHref?.(item)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

