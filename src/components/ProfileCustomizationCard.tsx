import { Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const STORAGE_KEY = "result-profile-customization-v1";

interface ProfileCustomizationData {
  nickname: string;
  bio: string;
  goalLevel: string;
  favoriteMovie: string;
}

interface ProfileCustomizationCardProps {
  userId: string;
}

function readStorage(): Record<string, ProfileCustomizationData> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ProfileCustomizationData>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(value: Record<string, ProfileCustomizationData>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

const emptyCustomization: ProfileCustomizationData = {
  nickname: "",
  bio: "",
  goalLevel: "",
  favoriteMovie: "",
};

export function ProfileCustomizationCard({ userId }: ProfileCustomizationCardProps) {
  const { showToast } = useToast();
  const { t } = useUi();
  const [form, setForm] = useState<ProfileCustomizationData>(emptyCustomization);

  useEffect(() => {
    const all = readStorage();
    setForm(all[userId] ?? emptyCustomization);
  }, [userId]);

  const filledCount = useMemo(
    () => [form.nickname, form.bio, form.goalLevel, form.favoriteMovie].filter((item) => item.trim().length > 0).length,
    [form],
  );

  function save() {
    const all = readStorage();
    all[userId] = form;
    writeStorage(all);
    showToast({ tone: "success", message: t("profile.customSaved") });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-burgundy-700 dark:text-white" />
          {t("profile.customizationTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <p className="text-sm text-charcoal/65 dark:text-zinc-400">{t("profile.customFilled", { count: filledCount })}</p>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("profile.nickname")}</Label>
            <Input
              value={form.nickname}
              onChange={(event) => setForm((prev) => ({ ...prev, nickname: event.target.value }))}
              placeholder={t("profile.nicknamePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("profile.goalLevel")}</Label>
            <Input
              value={form.goalLevel}
              onChange={(event) => setForm((prev) => ({ ...prev, goalLevel: event.target.value }))}
              placeholder={t("profile.goalLevelPlaceholder")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("profile.bio")}</Label>
          <textarea
            value={form.bio}
            onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
            rows={3}
            className="w-full resize-y rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-base text-charcoal outline-none transition focus:border-burgundy-300 focus:ring-2 focus:ring-burgundy-100 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-burgundy-700 dark:focus:ring-burgundy-900/40"
            placeholder={t("profile.bioPlaceholder")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("profile.favoriteMovie")}</Label>
          <Input
            value={form.favoriteMovie}
            onChange={(event) => setForm((prev) => ({ ...prev, favoriteMovie: event.target.value }))}
            placeholder={t("profile.favoriteMoviePlaceholder")}
          />
        </div>

        <Button onClick={save} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          {t("profile.saveChanges")}
        </Button>
      </CardContent>
    </Card>
  );
}
