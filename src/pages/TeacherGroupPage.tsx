import { ChevronLeft, Clock3, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ScoreActions } from "../components/ScoreActions";
import { UserAvatar } from "../components/UserAvatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { getGroupTopLive } from "../lib/ranking";

export function TeacherGroupPage() {
  const { id } = useParams();
  const { state, currentTeacher, applyScore } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();

  if (!currentTeacher) return null;

  const group = state.groups.find((entry) => entry.id === id);
  const hasAccess = !!group && currentTeacher.groupIds.includes(group.id);

  const students = hasAccess
    ? state.students.filter((student) => student.groupId === group.id).sort((a, b) => b.points - a.points)
    : [];

  const top = hasAccess ? getGroupTopLive(state, group!.id, 10) : [];
  const daysLabel = group ? t(`days.${group.daysPattern}`) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/teacher">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("teacher.backToGroups")}
          </Button>
        </Link>
      </div>

      <PageHeader
        title={group ? t("teacher.groupTitle", { title: group.title }) : t("teacher.groupNotFound")}
        subtitle={group ? `${t("teacher.time", { time: group.time })} • ${daysLabel}` : t("teacher.checkRoute")}
        action={
          group ? (
            <Badge variant="soft">
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {group.time}
            </Badge>
          ) : null
        }
      />

      {group && !hasAccess ? (
        <Card>
          <CardContent className="p-6 text-sm text-rose-600">{t("teacher.noAccessGroup")}</CardContent>
        </Card>
      ) : null}

      {hasAccess ? (
        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="grid gap-3 sm:grid-cols-2">
            {students.map((student) => (
              <Card key={student.id}>
                <CardContent className="space-y-2.5 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <UserAvatar fullName={student.fullName} avatarUrl={student.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-charcoal dark:text-zinc-100">{student.fullName}</p>
                        <p className="truncate text-xs text-charcoal/55 dark:text-zinc-400">{student.phone}</p>
                      </div>
                    </div>
                    <Badge variant="soft">{student.points.toFixed(2)}</Badge>
                  </div>

                  <ScoreActions
                    onSelect={(action) => {
                      void (async () => {
                        const result = await applyScore(student.id, group.id, action);
                        showToast({
                          message: t(result.messageKey, result.messageParams),
                          tone: result.ok ? "success" : "error",
                        });
                      })();
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-4 w-4 text-burgundy-700 dark:text-burgundy-300" />
                {t("teacher.groupTopTitle")}
              </h3>
              <div className="space-y-2">
                {top.map((item, index) => (
                  <div
                    key={item.studentId}
                    className="flex items-center justify-between rounded-xl border border-burgundy-100 p-3 text-sm dark:border-zinc-700"
                  >
                    <span className="font-semibold text-charcoal dark:text-zinc-100">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`} {item.fullName}
                    </span>
                    <span className="font-bold text-burgundy-700 dark:text-burgundy-300">{item.points.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
