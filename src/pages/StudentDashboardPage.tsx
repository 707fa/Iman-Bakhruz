import { CalendarDays, Clock3, Sparkles, Trophy, Users } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { TeacherSpotlightCard } from "../components/TeacherSpotlightCard";
import { UserAvatar } from "../components/UserAvatar";
import { Badge } from "../components/ui/badge";
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
        action={
          <Badge className="w-full justify-center rounded-full bg-burgundy-700 px-4 py-1.5 text-white sm:w-auto">
            {t("student.badge")}
          </Badge>
        }
      />

      <Card className="overflow-hidden border-burgundy-200/70 bg-[radial-gradient(circle_at_top_right,rgba(111,0,0,0.12),transparent_44%),linear-gradient(180deg,#ffffff,#faf7f7)] shadow-lift dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(111,0,0,0.2),transparent_44%),linear-gradient(180deg,#121214,#09090b)]">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 rounded-2xl border border-burgundy-200/80 bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-[#6f0000] p-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <UserAvatar fullName={currentStudent.fullName} avatarUrl={currentStudent.avatarUrl} size="lg" />
              <div>
                <p className="break-words text-xl font-bold sm:text-3xl">{currentStudent.fullName}</p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm text-white/85">
                  <Users className="h-4 w-4" />
                  {group?.title ?? t("student.noGroup")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-auto">
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold">
                <p className="text-white/70">{t("app.scheduleTime")}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold">
                  <Clock3 className="h-4 w-4" />
                  {group?.time ?? "-"}
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold">
                <p className="text-white/70">{t("auth.days")}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold">
                  <CalendarDays className="h-4 w-4" />
                  {daysLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-burgundy-100/80 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.points")}</p>
              <p className="mt-2 text-4xl font-black leading-none text-burgundy-700 dark:text-white">{currentStudent.points.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-burgundy-100/80 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeInGroup")}</p>
              <p className="mt-2 text-4xl font-black leading-none text-burgundy-700 dark:text-white">#{groupPlace > 0 ? groupPlace : "-"}</p>
            </div>
            <div className="rounded-2xl border border-burgundy-100/80 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeGlobal")}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-4xl font-black leading-none text-burgundy-700 dark:text-white">
                <Trophy className="h-7 w-7 text-burgundy-600 dark:text-white" />
                #{globalPlace > 0 ? globalPlace : "-"}
              </p>
              <span className="mt-3 inline-flex items-center rounded-full border border-burgundy-200 bg-burgundy-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-900/30 dark:text-white">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {globalRankTitle}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {teacher ? <TeacherSpotlightCard teacherId={teacher.id} /> : null}
    </div>
  );
}
