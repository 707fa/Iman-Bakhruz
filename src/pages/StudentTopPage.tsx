import { Trophy } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { RankingList } from "../components/RankingList";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { getGlobalPlace, getGlobalTop } from "../lib/ranking";

export function StudentTopPage() {
  const { state, currentStudent } = useAppStore();
  const { t } = useUi();

  if (!currentStudent) return null;

  const globalTop = getGlobalTop(state, 10);
  const globalPlace = getGlobalPlace(state, currentStudent.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tabs.global")}
        subtitle={t("student.globalSubtitle")}
        action={<Badge variant="soft">Top 10</Badge>}
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="inline-flex w-full flex-wrap items-center gap-2 rounded-2xl border border-burgundy-100 bg-slate-50 px-4 py-3 sm:w-auto dark:border-zinc-700 dark:bg-zinc-900">
            <Trophy className="h-5 w-5 text-burgundy-700 dark:text-burgundy-300" />
            <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">
              {t("student.placeGlobal")}: <span className="text-burgundy-700 dark:text-burgundy-300">#{globalPlace > 0 ? globalPlace : "-"}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <RankingList
        title={t("student.globalTop")}
        items={globalTop}
        groups={state.groups}
        currentUserId={currentStudent.id}
        showMeta={false}
        itemHref={(item) => `/student/profile/${item.studentId}`}
      />
    </div>
  );
}
