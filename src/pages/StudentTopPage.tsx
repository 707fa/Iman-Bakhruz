import { Trophy, Users } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { RankingList } from "../components/RankingList";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { getGlobalPlace, getGlobalTop, getGroupPlace, getGroupTop } from "../lib/ranking";

type TopScope = "global" | "group";

export function StudentTopPage() {
  const { state, currentStudent } = useAppStore();
  const { t } = useUi();
  const [scope, setScope] = useState<TopScope>("global");

  if (!currentStudent) return null;

  const globalTop = getGlobalTop(state, 10);
  const globalPlace = getGlobalPlace(state, currentStudent.id);
  const groupTop = getGroupTop(state, currentStudent.groupId, 10);
  const groupPlace = getGroupPlace(state, currentStudent.id, currentStudent.groupId);
  const group = state.groups.find((item) => item.id === currentStudent.groupId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tabs.global")}
        subtitle="Общий топ и топ вашей группы в одном месте."
        action={<Badge variant="soft">Top 10</Badge>}
      />

      <Tabs value={scope} onValueChange={(value) => setScope(value as TopScope)}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:w-fit">
          <TabsTrigger value="global">Общий топ</TabsTrigger>
          <TabsTrigger value="group">Топ группы</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="inline-flex w-full flex-wrap items-center gap-2 rounded-2xl border border-burgundy-100 bg-white px-4 py-3 sm:w-auto dark:border-zinc-700 dark:bg-zinc-900">
                <Trophy className="h-5 w-5 text-burgundy-700 dark:text-white" />
                <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">
                  {t("student.placeGlobal")}: <span className="text-burgundy-700 dark:text-white">#{globalPlace > 0 ? globalPlace : "-"}</span>
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
        </TabsContent>

        <TabsContent value="group" className="space-y-6">
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="inline-flex w-full flex-wrap items-center gap-2 rounded-2xl border border-burgundy-100 bg-white px-4 py-3 sm:w-auto dark:border-zinc-700 dark:bg-zinc-900">
                <Users className="h-5 w-5 text-burgundy-700 dark:text-white" />
                <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">
                  {group?.title ?? t("student.noGroup")}:{" "}
                  <span className="text-burgundy-700 dark:text-white">#{groupPlace > 0 ? groupPlace : "-"}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <RankingList
            title={t("student.myGroupTop")}
            items={groupTop}
            groups={state.groups}
            currentUserId={currentStudent.id}
            showMeta={false}
            itemHref={(item) => `/student/profile/${item.studentId}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
