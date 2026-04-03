import { ArrowRight, CalendarDays, Clock3, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { UserAvatar } from "../components/UserAvatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { getGlobalPlace, getGroupPlace } from "../lib/ranking";

export function StudentDashboardPage() {
  const { state, currentStudent } = useAppStore();
  const { t } = useUi();

  if (!currentStudent) return null;

  const group = state.groups.find((item) => item.id === currentStudent.groupId);
  const groupPlace = getGroupPlace(state, currentStudent.id, currentStudent.groupId);
  const globalPlace = getGlobalPlace(state, currentStudent.id);

  const daysLabel = group ? t(`days.${group.daysPattern}`) : "-";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("student.welcome", { name: currentStudent.fullName })}
        subtitle={t("student.subtitle")}
        action={<Badge variant="soft">{t("student.badge")}</Badge>}
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid gap-5 bg-gradient-to-r from-burgundy-900 to-burgundy-700 px-5 py-6 text-white sm:grid-cols-[auto_1fr] sm:items-center">
            <UserAvatar fullName={currentStudent.fullName} avatarUrl={currentStudent.avatarUrl} size="lg" />
            <div className="space-y-1">
              <p className="text-2xl font-semibold">{currentStudent.fullName}</p>
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

          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.points")}</p>
              <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-burgundy-300">{currentStudent.points.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeInGroup")}</p>
              <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-burgundy-300">#{groupPlace > 0 ? groupPlace : "-"}</p>
            </div>
            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeGlobal")}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-3xl font-bold text-burgundy-700 dark:text-burgundy-300">
                <Trophy className="h-6 w-6 text-burgundy-600 dark:text-burgundy-300" />
                #{globalPlace > 0 ? globalPlace : "-"}
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-base font-semibold text-charcoal dark:text-zinc-100">{t("tabs.group")}</p>
            <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">{t("student.groupSubtitle")}</p>
            <Link to="/student/group" className="mt-4 inline-block">
              <Button variant="secondary">
                {t("student.openGroup")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-base font-semibold text-charcoal dark:text-zinc-100">{t("tabs.global")}</p>
            <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">{t("student.globalSubtitle")}</p>
            <Link to="/student/top" className="mt-4 inline-block">
              <Button variant="secondary">
                {t("student.openTop")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
