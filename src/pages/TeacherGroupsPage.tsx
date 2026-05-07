import { ArrowRight, CalendarDays, Clock3, Search, Trophy, Users2 } from "lucide-react";
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
import type { GroupDaysPattern } from "../types";

type DayFilter = "all" | GroupDaysPattern;

function isGroupToday(daysPattern: GroupDaysPattern): boolean {
  const day = new Date().getDay();
  if (daysPattern === "mwf") return day === 1 || day === 3 || day === 5;
  return day === 2 || day === 4 || day === 6;
}

function sortTime(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function TeacherGroupsPage() {
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();
  const [query, setQuery] = useState("");
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");

  const teacherGroups = useMemo(
    () =>
      (currentTeacher ? getTeacherAccessibleGroups(state, currentTeacher) : []).sort(
        (a, b) => sortTime(a.time) - sortTime(b.time) || a.title.localeCompare(b.title),
      ),
    [state, currentTeacher],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const groupRows = useMemo(
    () =>
      teacherGroups
        .map((group) => {
          const students = state.students
            .filter((student) => student.groupId === group.id && student.isActive !== false && student.isImanStudent !== false)
            .sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));
          const leader = students[0] ?? null;
          const today = isGroupToday(group.daysPattern);
          return { group, students, leader, today };
        })
        .filter(({ group, students }) => {
          if (dayFilter !== "all" && group.daysPattern !== dayFilter) return false;
          if (!normalizedQuery) return true;
          return (
            group.title.toLowerCase().includes(normalizedQuery) ||
            group.time.toLowerCase().includes(normalizedQuery) ||
            t(`days.${group.daysPattern}`).toLowerCase().includes(normalizedQuery) ||
            students.some((student) => student.fullName.toLowerCase().includes(normalizedQuery))
          );
        }),
    [dayFilter, normalizedQuery, state.students, t, teacherGroups],
  );

  const studentsTotal = groupRows.reduce((sum, row) => sum + row.students.length, 0);
  const groupsToday = teacherGroups.filter((group) => isGroupToday(group.daysPattern)).length;

  if (!currentTeacher) return null;

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t("nav.teacherGroups")}
        subtitle={t("teacher.subtitle")}
        action={<Badge variant="soft">{teacherGroups.length}</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/55 dark:text-zinc-400">
              <CalendarDays className="h-4 w-4 text-burgundy-700 dark:text-white" />
              {t("teacher.groups")}
            </p>
            <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{groupRows.length}</p>
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
              {t("teacher.groupsTodayTitle")}
            </p>
            <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{groupsToday}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-charcoal/40 dark:text-zinc-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`${t("search.studentByName")} / group / time`}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-3 rounded-xl border border-burgundy-100 bg-burgundy-50 p-1 dark:border-zinc-800 dark:bg-zinc-950 sm:w-[18rem]">
            {(["all", "mwf", "tts"] as DayFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDayFilter(item)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  dayFilter === item
                    ? "bg-white text-burgundy-700 shadow-soft dark:bg-zinc-800 dark:text-white"
                    : "text-charcoal/60 hover:text-burgundy-700 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                {item === "all" ? "All" : t(`days.${item}`)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {groupRows.length === 0 ? (
        <p className="rounded-xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {t("ui.noData")}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-burgundy-100 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
          {groupRows.map(({ group, students, leader, today }, index) => (
            <Link
              key={group.id}
              to={`/teacher/group/${group.id}`}
              className={`grid gap-3 px-4 py-4 transition hover:bg-burgundy-50 dark:hover:bg-zinc-900 md:grid-cols-[1.15fr_0.55fr_0.9fr_auto] md:items-center ${
                index > 0 ? "border-t border-burgundy-100 dark:border-zinc-800" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-bold text-charcoal dark:text-zinc-100">{group.title}</h3>
                  {today ? <Badge variant="default">Today</Badge> : null}
                </div>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-charcoal/60 dark:text-zinc-400">
                  <Clock3 className="h-4 w-4" />
                  {group.time} · {t(`days.${group.daysPattern}`)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-charcoal/70 dark:text-zinc-300">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-burgundy-50 px-2.5 py-1 font-semibold dark:bg-zinc-900">
                  <Users2 className="h-4 w-4" />
                  {students.length}
                </span>
              </div>

              <div className="min-w-0 text-sm text-charcoal/70 dark:text-zinc-300">
                {leader ? (
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <Trophy className="h-4 w-4 shrink-0 text-burgundy-700 dark:text-white" />
                    <span className="truncate">
                      {leader.fullName}: {leader.points.toFixed(2)}
                    </span>
                  </span>
                ) : (
                  <span className="text-charcoal/45 dark:text-zinc-500">{t("ui.noData")}</span>
                )}
              </div>

              <Button asChild className="w-full justify-between md:w-40">
                <span>
                  {t("teacher.openGroup")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
