import { ArrowRight, CalendarDays, Clock3, Mic, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { TeacherSpotlightCard } from "../components/TeacherSpotlightCard";
import { UserAvatar } from "../components/UserAvatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { getGlobalPlace, getGroupPlace, getRankTitle } from "../lib/ranking";

export function StudentDashboardPage() {
  const { state, currentStudent } = useAppStore();
  const { t } = useUi();

  if (!currentStudent) return null;

  const group = state.groups.find((item) => item.id === currentStudent.groupId);
  const groupPlace = getGroupPlace(state, currentStudent.id, currentStudent.groupId);
  const globalPlace = getGlobalPlace(state, currentStudent.id);
  const globalRankTitle = getRankTitle(globalPlace);
  const daysLabel = group ? t(`days.${group.daysPattern}`) : "-";
  const teacher = group ? state.teachers.find((item) => item.id === group.teacherId) : undefined;

  return (
    <div className="space-y-7">
      <PageHeader
        title={t("student.welcome", { name: currentStudent.fullName })}
        subtitle={t("student.subtitle")}
        action={<Badge variant="soft">{t("student.badge")}</Badge>}
      />

      <Card className="overflow-hidden border-burgundy-200/80 shadow-lift">
        <CardContent className="p-0">
          <div className="grid gap-4 bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-700 px-4 py-5 text-white sm:grid-cols-[auto_1fr] sm:items-center sm:px-5 sm:py-6">
            <UserAvatar fullName={currentStudent.fullName} avatarUrl={currentStudent.avatarUrl} size="lg" />
            <div className="space-y-1">
              <p className="break-words text-lg font-semibold sm:text-2xl">{currentStudent.fullName}</p>
              <p className="inline-flex items-center gap-2 text-sm text-white/80">
                <Users className="h-4 w-4" />
                {group?.title ?? t("student.noGroup")}
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-white/80">
                <Clock3 className="h-4 w-4" />
                {group?.time ?? "-"}
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-white/80">
                <CalendarDays className="h-4 w-4" />
                {daysLabel}
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
            <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.points")}</p>
              <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-white">{currentStudent.points.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeInGroup")}</p>
              <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-white">#{groupPlace > 0 ? groupPlace : "-"}</p>
            </div>
            <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeGlobal")}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-3xl font-bold text-burgundy-700 dark:text-white">
                <Trophy className="h-6 w-6 text-burgundy-600 dark:text-white" />
                #{globalPlace > 0 ? globalPlace : "-"}
              </p>
              <p className="mt-2 inline-flex rounded-full border border-burgundy-200 bg-burgundy-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-900/30 dark:text-white">
                {globalRankTitle}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="h-full">
          <CardContent className="p-5">
            <p className="text-base font-semibold text-charcoal dark:text-zinc-100">{t("tabs.group")}</p>
            <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">{t("student.groupSubtitle")}</p>
            <Link to="/student/group" className="mt-4 block">
              <Button variant="secondary" className="w-full justify-between">
                {t("student.openGroup")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="p-5">
            <p className="text-base font-semibold text-charcoal dark:text-zinc-100">{t("tabs.global")}</p>
            <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">{t("student.globalSubtitle")}</p>
            <Link to="/student/top" className="mt-4 block">
              <Button variant="secondary" className="w-full justify-between">
                {t("student.openTop")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="p-5">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-charcoal dark:text-zinc-100">
              <Mic className="h-4 w-4 text-burgundy-700 dark:text-white" />
              {t("nav.speaking")}
            </p>
            <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">{t("speaking.subtitle")}</p>
            <Link to="/student/speaking" className="mt-4 block">
              <Button variant="secondary" className="w-full justify-between">
                {t("speaking.openPractice")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {teacher ? <TeacherSpotlightCard teacherId={teacher.id} /> : null}
    </div>
  );
}
