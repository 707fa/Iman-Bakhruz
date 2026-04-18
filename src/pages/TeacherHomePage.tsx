import { BookOpenCheck, Clock3, Phone, ShieldCheck, Sparkles, Users2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { TeacherSpotlightCard } from "../components/TeacherSpotlightCard";
import { UserAvatar } from "../components/UserAvatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";

export function TeacherHomePage() {
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();

  if (!currentTeacher) return null;

  const groups = state.groups.filter((group) => currentTeacher.groupIds.includes(group.id));
  const groupIds = new Set(groups.map((group) => group.id));
  const studentsCount = state.students.filter((student) => groupIds.has(student.groupId)).length;
  const ratingsCount = state.ratingLogs.filter((log) => log.teacherId === currentTeacher.id).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("teacher.homeTitle", { name: currentTeacher.fullName })}
        subtitle={t("teacher.homeSubtitle")}
        action={<Badge>{t("teacher.homeBadge")}</Badge>}
      />

      <Card className="overflow-hidden border-burgundy-200/80 shadow-lift">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5">
          <UserAvatar fullName={currentTeacher.fullName} avatarUrl={currentTeacher.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-charcoal dark:text-white">{currentTeacher.fullName}</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-charcoal/70 dark:text-zinc-300">
              <Phone className="h-4 w-4 text-charcoal dark:text-white" />
              {currentTeacher.phone}
            </p>
            <p className="mt-3 text-sm text-charcoal/70 dark:text-zinc-300">{t("teacher.homeAboutText1")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <BookOpenCheck className="h-4 w-4 text-charcoal dark:text-white" />
              {t("teacher.groups")}
            </p>
            <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{groups.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <Users2 className="h-4 w-4 text-charcoal dark:text-white" />
              {t("teacher.myStudents")}
            </p>
            <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{studentsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-charcoal dark:text-white" />
              {t("teacher.ratingsSet")}
            </p>
            <p className="mt-2 text-3xl font-bold text-charcoal dark:text-white">{ratingsCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <TeacherSpotlightCard teacherId={currentTeacher.id} />

        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-charcoal dark:text-white">
              <Clock3 className="h-4 w-4 text-charcoal dark:text-white" />
              {t("nav.teacherGroups")}
            </p>
            {groups.length === 0 ? (
              <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {t("ui.noData")}
              </p>
            ) : (
              <div className="space-y-2">
                {groups.slice(0, 6).map((group) => (
                  <Link
                    key={group.id}
                    to={`/teacher/group/${group.id}`}
                    className="flex items-center justify-between rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm transition hover:border-burgundy-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
                  >
                    <span className="truncate font-semibold text-charcoal dark:text-white">{group.title}</span>
                    <span className="ml-2 shrink-0 text-charcoal/65 dark:text-zinc-400">{group.time}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <p className="inline-flex items-center gap-2 text-base font-semibold text-charcoal dark:text-white">
            <Sparkles className="h-4 w-4 text-charcoal dark:text-white" />
            {t("teacher.quickActions")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link to="/teacher/dashboard">
              <Button variant="secondary" className="w-full justify-between">
                {t("teacher.managePanel")}
              </Button>
            </Link>
            <Link to="/teacher/groups">
              <Button variant="secondary" className="w-full justify-between">
                {t("nav.teacherGroups")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

