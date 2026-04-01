import { PageHeader } from "../components/PageHeader";
import { ProfileCard } from "../components/ProfileCard";
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
      <ProfileCard student={currentStudent} group={group} onPhotoUpload={updateAvatar} />
    </div>
  );
}
