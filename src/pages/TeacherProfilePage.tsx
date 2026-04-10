import { Camera, Phone, Users } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { ProfileCustomizationCard } from "../components/ProfileCustomizationCard";
import { UserAvatar } from "../components/UserAvatar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";

export function TeacherProfilePage() {
  const { currentTeacher, state, updateAvatar } = useAppStore();
  const { t } = useUi();

  if (!currentTeacher) return null;

  const groups = state.groups.filter((group) => currentTeacher.groupIds.includes(group.id));

  return (
    <div className="space-y-6">
      <PageHeader title={t("profile.title")} subtitle={t("profile.teacherSubtitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar fullName={currentTeacher.fullName} avatarUrl={currentTeacher.avatarUrl} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-charcoal dark:text-zinc-100">{currentTeacher.fullName}</p>
              <p className="text-sm text-charcoal/60 dark:text-zinc-400">{t("profile.teacherRole")}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-burgundy-100 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <p className="inline-flex items-center gap-2 text-charcoal/70 dark:text-zinc-300">
              <Phone className="h-4 w-4 text-burgundy-600 dark:text-white" />
              {currentTeacher.phone}
            </p>
            <p className="inline-flex items-center gap-2 text-charcoal/70 dark:text-zinc-300">
              <Users className="h-4 w-4 text-burgundy-600 dark:text-white" />
              {t("profile.teacherGroups", { count: groups.length })}
            </p>
          </div>

          <label className="block">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const result = reader.result;
                  if (typeof result === "string") {
                    void updateAvatar(result);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            <Button asChild variant="secondary" className="w-full cursor-pointer">
              <span>
                <Camera className="mr-2 h-4 w-4" />
                {t("profile.changePhoto")}
              </span>
            </Button>
          </label>
        </CardContent>
      </Card>

      <ProfileCustomizationCard userId={currentTeacher.id} />
    </div>
  );
}


