import { BookOpenCheck, ClipboardList, Trophy, Users2 } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { GrammarTopicsCard } from "../components/GrammarTopicsCard";
import { GroupCard } from "../components/GroupCard";
import { ImanAiChatCard } from "../components/ImanAiChatCard";
import { PageHeader } from "../components/PageHeader";
import { RankingList } from "../components/RankingList";
import { SupportTicketsCard } from "../components/SupportTicketsCard";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { getGlobalTop } from "../lib/ranking";

export function TeacherDashboardPage() {
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();

  const teacherGroups = useMemo(
    () => state.groups.filter((group) => currentTeacher?.groupIds.includes(group.id)),
    [state.groups, currentTeacher?.groupIds],
  );

  if (!currentTeacher) return null;

  const teacherGroupIds = new Set(teacherGroups.map((group) => group.id));
  const teacherStudents = state.students
    .filter((student) => teacherGroupIds.has(student.groupId))
    .sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));

  const studentsCount = teacherStudents.length;
  const ratingsCount = state.ratingLogs.filter((log) => log.teacherId === currentTeacher.id).length;
  const globalTop = getGlobalTop(state, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("teacher.title", { name: currentTeacher.fullName })}
        subtitle={t("teacher.subtitle")}
        action={<Badge variant="soft">{t("teacher.badge")}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <BookOpenCheck className="h-4 w-4 text-burgundy-600 dark:text-burgundy-300" />
              {t("teacher.groups")}
            </p>
            <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-burgundy-300">{teacherGroups.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <Users2 className="h-4 w-4 text-burgundy-600 dark:text-burgundy-300" />
              {t("teacher.myStudents")}
            </p>
            <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-burgundy-300">{studentsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
              <ClipboardList className="h-4 w-4 text-burgundy-600 dark:text-burgundy-300" />
              {t("teacher.ratingsSet")}
            </p>
            <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-burgundy-300">{ratingsCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teacherGroups.map((group) => (
          <GroupCard key={group.id} group={group} students={state.students.filter((student) => student.groupId === group.id)} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <RankingList title={t("teacher.topAll")} items={globalTop} groups={state.groups} />

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Trophy className="h-5 w-5 text-burgundy-700 dark:text-burgundy-300" />
              {t("teacher.groupTopTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="rounded-2xl border border-burgundy-100 bg-slate-50 px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {t("teacher.groupTopHint")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("teacher.allMyStudents")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {teacherStudents.map((student) => {
            const group = state.groups.find((item) => item.id === student.groupId);
            return (
              <Link key={student.id} to={`/teacher/student/${student.id}`}>
                <article className="rounded-2xl border border-burgundy-100 bg-slate-50 px-4 py-3 transition hover:border-burgundy-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-burgundy-700">
                  <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{student.fullName}</p>
                  <p className="text-xs text-charcoal/55 dark:text-zinc-400">{group?.title ?? t("auth.group")}</p>
                  <p className="mt-2 text-sm font-bold text-burgundy-700 dark:text-burgundy-300">{student.points.toFixed(2)}</p>
                </article>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <GrammarTopicsCard role="teacher" />
        <SupportTicketsCard role="teacher" />
      </div>

      <ImanAiChatCard title="Iman AI Assistant" />
    </div>
  );
}
