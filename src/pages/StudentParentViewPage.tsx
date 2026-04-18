import { BarChart3, CalendarCheck2, ClipboardCheck, Lock, Mic2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { readSpeakingSnapshot } from "../lib/speakingSession";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);
}

function getWeekStart(date: Date): number {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const day = normalized.getDay() || 7;
  normalized.setDate(normalized.getDate() - day + 1);
  return normalized.getTime();
}

function extractDefaultPin(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.slice(-4);
}

export function StudentParentViewPage() {
  const { currentStudent } = useAppStore();
  const { showToast } = useToast();
  const { t } = useUi();
  const [pinInput, setPinInput] = useState("");

  const parentPinKey = currentStudent ? `parent-view-pin:${currentStudent.id}` : "";
  const parentSessionKey = currentStudent ? `parent-view-unlocked:${currentStudent.id}` : "";
  const storedPin = parentPinKey && typeof window !== "undefined" ? window.localStorage.getItem(parentPinKey) : null;
  const requiredPin = storedPin || (currentStudent ? extractDefaultPin(currentStudent.phone) : "");
  const defaultUnlocked = parentSessionKey && typeof window !== "undefined" ? window.sessionStorage.getItem(parentSessionKey) === "1" : false;
  const [unlocked, setUnlocked] = useState(defaultUnlocked);

  const snapshot = useMemo(() => {
    if (!currentStudent) return null;
    return readSpeakingSnapshot(currentStudent.id);
  }, [currentStudent]);

  const speakingGrowth = useMemo(() => {
    if (!snapshot) return 0;
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    const prevWeekStart = currentWeekStart - 7 * 24 * 60 * 60 * 1000;

    const currentWeekScores = snapshot.attempts
      .filter((item) => new Date(item.createdAt).getTime() >= currentWeekStart)
      .map((item) => item.score);
    const prevWeekScores = snapshot.attempts
      .filter((item) => {
        const timestamp = new Date(item.createdAt).getTime();
        return timestamp >= prevWeekStart && timestamp < currentWeekStart;
      })
      .map((item) => item.score);

    return average(currentWeekScores) - average(prevWeekScores);
  }, [snapshot]);

  const speakingAverage = useMemo(() => average(snapshot?.attempts.slice(0, 20).map((item) => item.score) ?? []), [snapshot]);

  function unlockView() {
    const typed = pinInput.trim();
    if (!typed) return;
    if (typed !== requiredPin) {
      showToast({ message: t("parent.unlockError"), tone: "error" });
      return;
    }
    setUnlocked(true);
    if (parentSessionKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(parentSessionKey, "1");
    }
    showToast({ message: t("parent.lockTitle"), tone: "success" });
  }

  if (!currentStudent) return null;

  if (!unlocked) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("parent.lockTitle")} subtitle={t("parent.lockSubtitle")} />

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Lock className="h-5 w-5 text-burgundy-700 dark:text-white" />
              {t("parent.lockTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parent-pin">{t("parent.pinLabel")}</Label>
              <Input
                id="parent-pin"
                value={pinInput}
                onChange={(event) => setPinInput(event.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder={t("parent.pinPlaceholder")}
                inputMode="numeric"
              />
            </div>
            <p className="text-xs text-charcoal/60 dark:text-zinc-400">{t("parent.defaultHint")}</p>
            <Button onClick={unlockView} className="w-full">
              {t("parent.unlock")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Parent View" subtitle="Attendance, homework, and speaking growth overview." />

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <CalendarCheck2 className="h-5 w-5 text-burgundy-700 dark:text-white" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-burgundy-700 dark:text-white">{currentStudent.progress?.attendance ?? 0}%</p>
            <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">Based on teacher updates.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-burgundy-700 dark:text-white" />
              Homework
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-burgundy-700 dark:text-white">{currentStudent.progress?.homework ?? 0}%</p>
            <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">Shows consistency with assignments.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Mic2 className="h-5 w-5 text-burgundy-700 dark:text-white" />
              Speaking Avg
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-burgundy-700 dark:text-white">{speakingAverage}</p>
            <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">Average based on recent speaking attempts.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-burgundy-700 dark:text-white" />
            Weekly Speaking Growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${speakingGrowth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {speakingGrowth >= 0 ? "+" : ""}
            {speakingGrowth}
          </p>
          <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">
            Comparison of this week vs previous week speaking score.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

