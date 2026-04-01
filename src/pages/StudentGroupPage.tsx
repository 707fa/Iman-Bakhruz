import { CalendarDays, Clock3, Users } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { RankingList } from "../components/RankingList";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { getGroupPlace, getGroupTop } from "../lib/ranking";
import { getClassStartTime, getPrimaryRecalcDayPatternKey, isTodayRecalcBeforeClass } from "../lib/schedule";

export function StudentGroupPage() {
  const { state, currentStudent } = useAppStore();
  const { t } = useUi();

  if (!currentStudent) return null;

  const group = state.groups.find((item) => item.id === currentStudent.groupId);
  const groupTop = getGroupTop(state, currentStudent.groupId, 10);
  const groupPlace = getGroupPlace(state, currentStudent.id, currentStudent.groupId);

  const daysLabel = group ? t(`days.${group.daysPattern}`) : "-";
  const recalcDay = group ? t(getPrimaryRecalcDayPatternKey(group.daysPattern)) : "";
  const classStart = group ? getClassStartTime(group.time) : "";
  const recalcHint = group
    ? isTodayRecalcBeforeClass(group)
      ? t("rating.recalcToday", { time: classStart })
      : t("rating.recalcRule", { day: recalcDay, time: classStart })
    : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tabs.group")}
        subtitle={t("student.groupSubtitle")}
        action={<Badge variant="soft">{group?.title ?? t("student.noGroup")}</Badge>}
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("auth.group")}</p>
              <p className="mt-2 text-lg font-semibold text-charcoal dark:text-zinc-100">{group?.title ?? t("student.noGroup")}</p>
            </div>

            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("auth.time")}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
                <Clock3 className="h-4 w-4 text-burgundy-700 dark:text-burgundy-300" />
                {group?.time ?? "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("auth.days")}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
                <CalendarDays className="h-4 w-4 text-burgundy-700 dark:text-burgundy-300" />
                {daysLabel}
              </p>
            </div>

            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeInGroup")}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-burgundy-700 dark:text-burgundy-300">
                <Users className="h-4 w-4" />
                #{groupPlace > 0 ? groupPlace : "-"}
              </p>
            </div>
          </div>

          {group ? (
            <p className="rounded-2xl border border-burgundy-100 bg-slate-50 px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {recalcHint}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <RankingList title={t("student.myGroupTop")} items={groupTop} groups={state.groups} currentUserId={currentStudent.id} />
    </div>
  );
}
