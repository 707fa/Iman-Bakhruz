import { CalendarDays, Camera, Phone, Users } from "lucide-react";
import { useUi } from "../hooks/useUi";
import type { Group, Student } from "../types";
import { UserAvatar } from "./UserAvatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ProfileCardProps {
  student: Student;
  group?: Group;
  onPhotoUpload: (imageUrl: string) => void | Promise<void>;
}

export function ProfileCard({ student, group, onPhotoUpload }: ProfileCardProps) {
  const { t } = useUi();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar fullName={student.fullName} avatarUrl={student.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-charcoal dark:text-zinc-100">{student.fullName}</p>
            <p className="text-sm text-charcoal/60 dark:text-zinc-400">{t("profile.studentRole")}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-burgundy-100 bg-slate-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <p className="inline-flex items-center gap-2 text-charcoal/70 dark:text-zinc-300">
            <Phone className="h-4 w-4 text-burgundy-600 dark:text-burgundy-300" />
            {student.phone}
          </p>
          <p className="inline-flex items-center gap-2 text-charcoal/70 dark:text-zinc-300">
            <Users className="h-4 w-4 text-burgundy-600 dark:text-burgundy-300" />
            <span className="break-words">{group ? `${group.title} • ${group.time}` : t("profile.noGroup")}</span>
          </p>
          {group ? (
            <p className="inline-flex items-center gap-2 text-charcoal/70 dark:text-zinc-300">
              <CalendarDays className="h-4 w-4 text-burgundy-600 dark:text-burgundy-300" />
              {t(`days.${group.daysPattern}`)}
            </p>
          ) : null}
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
                  void onPhotoUpload(result);
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
  );
}
