import { useEffect, useMemo, useState } from "react";
import { GroupCard } from "../components/GroupCard";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";

export function TeacherGroupsPage() {
  const { state, currentTeacher, renameGroup } = useAppStore();
  const { showToast } = useToast();
  const { t } = useUi();
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);

  const teacherGroups = useMemo(
    () => state.groups.filter((group) => currentTeacher?.groupIds.includes(group.id)),
    [state.groups, currentTeacher?.groupIds],
  );

  useEffect(() => {
    setTitleDrafts((prev) => {
      const next: Record<string, string> = {};
      teacherGroups.forEach((group) => {
        next[group.id] = prev[group.id] ?? group.title;
      });
      return next;
    });
  }, [teacherGroups]);

  if (!currentTeacher) return null;

  async function handleRename(groupId: string) {
    if (savingGroupId) return;
    const nextTitle = (titleDrafts[groupId] ?? "").trim();
    setSavingGroupId(groupId);
    try {
      const result = await renameGroup(groupId, nextTitle);
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
          {teacherGroups.map((group) => {
            const draft = titleDrafts[group.id] ?? group.title;
            const isSaving = savingGroupId === group.id;
            const isSame = draft.trim() === group.title;
            const invalid = draft.trim().length < 2;

            return (
              <div key={group.id} className="space-y-3">
                <GroupCard group={group} students={state.students.filter((student) => student.groupId === group.id)} />

                <Card>
                  <CardContent className="space-y-3 p-4">
                    <label className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">
                      {t("teacher.renameGroupLabel")}
                    </label>
                    <Input
                      value={draft}
                      onChange={(event) =>
                        setTitleDrafts((prev) => ({
                          ...prev,
                          [group.id]: event.target.value,
                        }))
                      }
                      placeholder={t("teacher.renameGroupPlaceholder")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !isSaving && !invalid && !isSame) {
                          event.preventDefault();
                          void handleRename(group.id);
                        }
                      }}
                    />
                    <Button
                      className="w-full"
                      onClick={() => void handleRename(group.id)}
                      disabled={isSaving || invalid || isSame}
                    >
                      {isSaving ? t("teacher.renaming") : t("teacher.renameGroupSave")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
