import { ChevronLeft, Trophy, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ProgressOverviewCard } from "../components/ProgressOverviewCard";
import { UserAvatar } from "../components/UserAvatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { getGlobalPlace, getGroupPlace, getRankTitle } from "../lib/ranking";

export function StudentPublicProfilePage() {
  const { id } = useParams();
  const { state, currentStudent } = useAppStore();
  const { t } = useUi();

  if (!currentStudent) return null;

  const student = state.students.find((item) => item.id === id);
  const group = student ? state.groups.find((item) => item.id === student.groupId) : null;

  if (!student) {
    return (
      <div className="space-y-4">
        <Link to="/student/top">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("profile.backToTop")}
          </Button>
        </Link>
        <Card>
          <CardContent className="p-6 text-sm text-rose-600">{t("profile.notFound")}</CardContent>
        </Card>
      </div>
    );
  }

  const groupPlace = getGroupPlace(state, student.id, student.groupId);
  const globalPlace = getGlobalPlace(state, student.id);
  const rankTitle = getRankTitle(globalPlace);
  const isMe = student.id === currentStudent.id;

  return (
    <div className="space-y-6">
      <Link to="/student/top">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("profile.backToTop")}
        </Button>
      </Link>

      <PageHeader
        title={student.fullName}
        subtitle={t("profile.publicSubtitle")}
        action={<Badge variant="soft">{group?.title ?? t("profile.noGroup")}</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar fullName={student.fullName} avatarUrl={student.avatarUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-charcoal dark:text-zinc-100">{student.fullName}</p>
                <p className="text-sm text-charcoal/60 dark:text-zinc-400">{student.phone}</p>
                <p className="mt-1 text-sm font-semibold text-burgundy-700 dark:text-burgundy-300">
                  {student.points.toFixed(2)} {t("student.points")}
                </p>
                <p className="mt-2 inline-flex rounded-full border border-burgundy-200 bg-burgundy-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-900/30 dark:text-burgundy-200">
                  {rankTitle}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeInGroup")}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-2xl font-bold text-burgundy-700 dark:text-burgundy-300">
                  <Users className="h-4 w-4" />
                  #{groupPlace > 0 ? groupPlace : "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeGlobal")}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-2xl font-bold text-burgundy-700 dark:text-burgundy-300">
                  <Trophy className="h-4 w-4" />
                  #{globalPlace > 0 ? globalPlace : "-"}
                </p>
              </div>
            </div>

            {isMe ? (
              <Link to="/profile">
                <Button variant="secondary" className="w-full">
                  {t("profile.openMine")}
                </Button>
              </Link>
            ) : (
              <Link to={`/student/chat?user=${student.id}`}>
                <Button variant="secondary" className="w-full">
                  {t("chat.openFromProfile")}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <ProgressOverviewCard title={t("profile.progressTitle")} progress={student.progress} />
      </div>
    </div>
  );
}
