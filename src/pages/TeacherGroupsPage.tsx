import { useMemo } from "react";
import { GroupCard } from "../components/GroupCard";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";

export function TeacherGroupsPage() {
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();

  const teacherGroups = useMemo(
    () => state.groups.filter((group) => currentTeacher?.groupIds.includes(group.id)),
    [state.groups, currentTeacher?.groupIds],
  );

  if (!currentTeacher) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.teacherGroups")}
        subtitle={t("teacher.subtitle")}
        action={<Badge variant="soft">{t("teacher.groups")}: {teacherGroups.length}</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teacherGroups.map((group) => (
          <GroupCard key={group.id} group={group} students={state.students.filter((student) => student.groupId === group.id)} />
        ))}
      </div>
    </div>
  );
}
