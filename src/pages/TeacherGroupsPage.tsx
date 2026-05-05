import { BookOpenCheck, Clock3, Search, Trophy, Users2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAppStore } from "../hooks/useAppStore";
import { getTeacherAccessibleGroups } from "../lib/teacherGroups";
import { useUi } from "../hooks/useUi";

function isGroupToday(daysPattern: "mwf" | "tts"): boolean {
  const day = new Date().getDay();
  if (daysPattern === "mwf") return day === 1 || day === 3 || day === 5;
  return day === 2 || day === 4 || day === 6;
}

export function TeacherGroupsPage() {
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();
  const [query, setQuery] = useState("");

  const teacherGroups = useMemo(
    () => (currentTeacher ? getTeacherAccessibleGroups(state, currentTeacher) : []),
    [state, currentTeacher],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const groupRows = useMemo(
    () =>
      teacherGroups
        .map((group) => {
          const students = state.students
            .filter((student) => student.groupId === group.id && student.isActive !== false && student.isImanStudent !== false)
            .sort((a, b) => b.points - a.points);
          const leader = students[0] ?? null;
          return { group, students, leader };
        })
        .filter(({ group, students }) => {
          if (!normalizedQuery) return true;
          return (
            group.title.toLowerCase().includes(normalizedQuery) ||
            group.time.toLowerCase().includes(normalizedQuery) ||
            students.some((student) => student.fullName.toLowerCase().includes(normalizedQuery))
          );
        }),
    [normalizedQuery, state.students, teacherGroups],
  );
  const studentsTotal = groupRows.reduce((sum, row) => sum + row.students.length, 0);
  const groupsToday = teacherGroups.filter((group) => isGroupToday(group.daysPattern)).length;

  if (!currentTeacher) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.teacherGroups")}
        subtitle={t("teacher.subtitle")}
        action={<Badge variant="soft">{t("teacher.groups")}: {teacherGroups.length}</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/55 dark:text-zinc-400">
              <BookOpenCheck className="h-4 w-4 text-burgundy-700 dark:text-white" />
              {t("teacher.groups")}
            </p>
            <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{teacherGroups.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/55 dark:text-zinc-400">
              <Users2 className="h-4 w-4 text-burgundy-700 dark:text-white" />
              {t("teacher.myStudents")}
            </p>
            <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{studentsTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/55 dark:text-zinc-400">
              <Clock3 className="h-4 w-4 text-burgundy-700 dark:text-white" />
              Today
            </p>
            <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{groupsToday}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-charcoal/40 dark:text-zinc-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`${t("search.studentByName")} / group / time`}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {groupRows.length === 0 ? (
        <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {t("ui.noData")}
        </p>
      ) : (
        <div className="space-y-3">
          {groupRows.map(({ group, students, leader }) => (
            <Card key={group.id}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-bold text-charcoal dark:text-zinc-100">{group.title}</h3>
                    <Badge variant="soft">{group.time}</Badge>
                    <Badge variant="default">{t(`days.${group.daysPattern}`)}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-charcoal/65 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Users2 className="h-4 w-4 text-burgundy-700 dark:text-white" />
                      {t("teacher.studentsCount", { count: students.length })}
                    </span>
                    {leader ? (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Trophy className="h-4 w-4 text-burgundy-700 dark:text-white" />
                        <span className="truncate">{leader.fullName}: {leader.points.toFixed(2)}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
                <Link to={`/teacher/group/${group.id}`} className="md:w-44">
                  <Button className="w-full justify-between">{t("teacher.openGroup")}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
