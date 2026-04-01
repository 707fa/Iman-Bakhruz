import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { Group, RankingItem } from "../types";
import { RankingCard } from "./RankingCard";

interface RankingListProps {
  title: string;
  items: RankingItem[];
  groups?: Group[];
  currentUserId?: string;
}

export function RankingList({ title, items, groups = [], currentUserId }: RankingListProps) {
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
      <CardContent className="space-y-2">
        {mapped.map((item, index) => (
          <RankingCard key={item.studentId} item={item} rank={index + 1} currentUserId={currentUserId} />
        ))}
      </CardContent>
    </Card>
  );
}
