import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { RankingList } from "../components/RankingList";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { getGlobalTop } from "../lib/ranking";

export function TeacherTopPage() {
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();
  const [studentSearch, setStudentSearch] = useState("");

  if (!currentTeacher) return null;

  const teacherGroupIds = new Set(currentTeacher.groupIds);
  const teacherStudents = state.students
    .filter((student) => teacherGroupIds.has(student.groupId))
    .sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));

  const globalTop = getGlobalTop(state, 20);
  const normalizedStudentSearch = studentSearch.trim().toLowerCase();

  const filteredGlobalTop = useMemo(
    () =>
      normalizedStudentSearch
        ? globalTop.filter((item) => item.fullName.toLowerCase().includes(normalizedStudentSearch))
        : globalTop,
    [globalTop, normalizedStudentSearch],
  );

  const filteredTeacherStudents = useMemo(
    () =>
      normalizedStudentSearch
        ? teacherStudents.filter((student) => student.fullName.toLowerCase().includes(normalizedStudentSearch))
        : teacherStudents,
    [teacherStudents, normalizedStudentSearch],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.teacherTop")}
        subtitle={t("teacher.topAll")}
        action={<Badge variant="soft">Top 20</Badge>}
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <Input
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder={t("search.studentByName")}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <RankingList
          title={t("teacher.topAll")}
          items={filteredGlobalTop}
          groups={state.groups}
          itemHref={(item) => `/teacher/student/${item.studentId}`}
        />

        <Card>
          <CardHeader>
            <CardTitle>{t("teacher.allMyStudents")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 sm:p-6">
            {filteredTeacherStudents.length === 0 ? (
              <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {t("ui.noData")}
              </p>
            ) : (
              filteredTeacherStudents.map((student) => {
                const group = state.groups.find((item) => item.id === student.groupId);
                return (
                  <Link key={student.id} to={`/teacher/student/${student.id}`}>
                    <article className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 transition hover:border-burgundy-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-burgundy-700">
                      <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{student.fullName}</p>
                      <p className="text-xs text-charcoal/55 dark:text-zinc-400">{group?.title ?? t("auth.group")}</p>
                      <p className="mt-1 text-sm font-bold text-burgundy-700 dark:text-white">{student.points.toFixed(2)}</p>
                    </article>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

