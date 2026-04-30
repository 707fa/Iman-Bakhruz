import { useMemo } from "react";
import { GroupCard } from "../components/GroupCard";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { useAppStore } from "../hooks/useAppStore";
import { getTeacherAccessibleGroups } from "../lib/teacherGroups";
import { useUi } from "../hooks/useUi";

export function TeacherGroupsPage() {
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();

  const teacherGroups = useMemo(
    () => (currentTeacher ? getTeacherAccessibleGroups(state, currentTeacher) : []),
    [state, currentTeacher],
  );

  if (!currentTeacher) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.teacherGroups")}
        subtitle={t("teacher.subtitle")}
        action={<Badge variant="soft">{t("teacher.groups")}: {teacherGroups.length}</Badge>}
      />

      {teacherGroups.length === 0 ? (
        <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {t("ui.noData")}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teacherGroups.map((group) => (
            <GroupCard key={group.id} group={group} students={state.students.filter((student) => student.groupId === group.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
