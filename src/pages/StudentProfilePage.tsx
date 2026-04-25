import { useEffect, useState } from "react";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import { PageHeader } from "../components/PageHeader";
import { ProfileCard } from "../components/ProfileCard";
import { ProgressOverviewCard } from "../components/ProgressOverviewCard";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import type { ProgressSnapshot } from "../types";

export function StudentProfilePage() {
  const { currentStudent, state, updateAvatar, refreshState, isApiMode } = useAppStore();
  const { t } = useUi();
  const [liveProgress, setLiveProgress] = useState<ProgressSnapshot | undefined>(undefined);

  useEffect(() => {
    if (!isApiMode) return;
    void refreshState();
  }, [isApiMode, refreshState]);

  useEffect(() => {
    if (!isApiMode) {
      setLiveProgress(undefined);
      return;
    }
    const token = getApiToken();
    if (!token) return;

    let disposed = false;
    void platformApi
      .getMyProgress(token)
      .then((progress) => {
        if (disposed) return;
        setLiveProgress({
          status: progress.status,
          grammar: progress.grammar,
          vocabulary: progress.vocabulary,
          homework: progress.homework,
          speaking: progress.speaking,
          attendance: progress.attendance,
          weeklyXp: progress.weeklyXp,
          level: progress.level,
          streakDays: progress.streakDays,
        });
      })
      .catch(() => {
        if (disposed) return;
        setLiveProgress(undefined);
      });

    return () => {
      disposed = true;
    };
  }, [isApiMode, currentStudent?.id]);

  if (!currentStudent) return null;

  const group = state.groups.find((item) => item.id === currentStudent.groupId);

  return (
    <div className="space-y-6">
      <PageHeader title={t("profile.title")} subtitle={t("profile.studentSubtitle")} />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <ProfileCard student={currentStudent} group={group} onPhotoUpload={updateAvatar} />
        <ProgressOverviewCard title={t("profile.progressTitle")} progress={liveProgress ?? currentStudent.progress} />
      </div>
    </div>
  );
}
