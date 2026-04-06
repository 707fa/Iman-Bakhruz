import { PageHeader } from "../components/PageHeader";
import { ProfileCard } from "../components/ProfileCard";
import { ProgressOverviewCard } from "../components/ProgressOverviewCard";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";

export function StudentProfilePage() {
  const { currentStudent, state, updateAvatar } = useAppStore();
  const { t } = useUi();

  if (!currentStudent) return null;

  const group = state.groups.find((item) => item.id === currentStudent.groupId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("profile.title")}
        subtitle={t("profile.studentSubtitle")}
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <ProfileCard student={currentStudent} group={group} onPhotoUpload={updateAvatar} />
        <ProgressOverviewCard title={t("profile.progressTitle")} progress={currentStudent.progress} />
      </div>
    </div>
  );
}
