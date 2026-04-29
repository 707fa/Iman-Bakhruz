import { useMemo, useState } from "react";
import { GroupCard } from "../components/GroupCard";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { useAppStore } from "../hooks/useAppStore";
import { getTeacherAccessibleGroups } from "../lib/teacherGroups";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";

export function TeacherGroupsPage() {
  const { state, currentTeacher, renameGroup } = useAppStore();
  const { showToast } = useToast();
  const { t } = useUi();
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);

  const teacherGroups = useMemo(
    () => (currentTeacher ? getTeacherAccessibleGroups(state, currentTeacher) : []),
    [state, currentTeacher],
  );



  if (!currentTeacher) return null;

  async function handleRename(groupId: string, nextTitle: string) {
    if (savingGroupId || !nextTitle.trim() || nextTitle.trim().length < 2) return;
    setSavingGroupId(groupId);
    try {
      const result = await renameGroup(groupId, nextTitle.trim());
      showToast({
        tone: result.ok ? "success" : "error",
        message: t(result.messageKey, result.messageParams),
      });
    } finally {
      setSavingGroupId(null);
    }
  }

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
            <GroupCard
              key={group.id}
              group={group}
              students={state.students.filter((student) => student.groupId === group.id)}
              isSaving={savingGroupId === group.id}
              onRename={(nextTitle) => void handleRename(group.id, nextTitle)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
