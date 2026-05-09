import { useMemo } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { getAchievementDefinitions, readEarnedAchievements } from "../lib/achievements";
import type { AchievementCategory, EarnedAchievement } from "../types";

interface AchievementDisplayProps {
  studentId: string;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  streak: "Streak",
  speaking: "Speaking",
  homework: "Homework",
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  games: "Games",
  listening: "Listening",
  special: "Special",
};

export function AchievementDisplay({ studentId, compact = false }: AchievementDisplayProps) {
  const definitions = useMemo(() => getAchievementDefinitions(), []);
  const earned = useMemo(() => readEarnedAchievements(studentId), [studentId]);
  const earnedMap = useMemo(() => {
    const map = new Map<string, EarnedAchievement>();
    for (const e of earned) {
      map.set(e.achievementId, e);
    }
    return map;
  }, [earned]);

  const earnedCount = earned.length;
  const totalCount = definitions.length;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {earned.map((e) => {
          const def = definitions.find((d) => d.id === e.achievementId);
          if (!def) return null;
          return (
            <span
              key={e.id}
              title={`${def.titleEn}: ${def.descriptionEn}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-burgundy-100 bg-white text-lg dark:border-zinc-700 dark:bg-zinc-900"
            >
              {def.icon}
            </span>
          );
        })}
        {earnedCount === 0 ? (
          <p className="text-sm text-charcoal/50 dark:text-zinc-500">No achievements yet</p>
        ) : null}
      </div>
    );
  }

  const categories = [...new Set(definitions.map((d) => d.category))] as AchievementCategory[];

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-charcoal dark:text-zinc-100">Achievements</h3>
          <Badge variant="soft">{earnedCount}/{totalCount}</Badge>
        </div>

        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-burgundy-600 to-burgundy-700 transition-all"
            style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
          />
        </div>

        <div className="space-y-4">
          {categories.map((cat) => {
            const catDefs = definitions.filter((d) => d.category === cat);
            return (
              <div key={cat}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/55 dark:text-zinc-400">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {catDefs.map((def) => {
                    const earnedRec = earnedMap.get(def.id);
                    const isEarned = Boolean(earnedRec);
                    return (
                      <div
                        key={def.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                          isEarned
                            ? "border-burgundy-200 bg-burgundy-50 dark:border-burgundy-800 dark:bg-burgundy-900/20"
                            : "border-zinc-100 bg-white opacity-50 dark:border-zinc-800 dark:bg-zinc-900"
                        }`}
                      >
                        <span className="text-2xl">{def.icon}</span>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${isEarned ? "text-charcoal dark:text-zinc-100" : "text-charcoal/40 dark:text-zinc-500"}`}>
                            {def.titleEn}
                          </p>
                          <p className={`text-xs ${isEarned ? "text-charcoal/60 dark:text-zinc-400" : "text-charcoal/30 dark:text-zinc-600"}`}>
                            {def.descriptionEn}
                          </p>
                          {isEarned && earnedRec ? (
                            <p className="text-[10px] text-charcoal/40 dark:text-zinc-500">
                              Earned {new Date(earnedRec.earnedAt).toLocaleDateString()}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
