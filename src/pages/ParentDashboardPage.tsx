import { BarChart3, CalendarCheck2, ClipboardCheck, Mic2, UserRound } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
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

export function ParentDashboardPage() {
  const { currentParent, currentParentStudent, state } = useAppStore();

  const group = currentParentStudent ? state.groups.find((item) => item.id === currentParentStudent.groupId) : null;
  const snapshot = useMemo(() => {
    if (!currentParentStudent) return null;
    return readSpeakingSnapshot(currentParentStudent.id);
  }, [currentParentStudent]);

  const speakingAverage = useMemo(() => average(snapshot?.attempts.slice(0, 20).map((item) => item.score) ?? []), [snapshot]);

  const speakingGrowth = useMemo(() => {
    if (!snapshot) return 0;
    const currentWeekStart = getWeekStart(new Date());
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

  if (!currentParent || !currentParentStudent) {
    return (
      <div className="space-y-6">
        <PageHeader title="Parent Dashboard" subtitle="У этого родительского кабинета пока нет привязанного ребёнка." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Родительский кабинет: ${currentParent.fullName}`}
        subtitle={`Подключенный ребёнок: ${currentParentStudent.fullName}${group ? ` • ${group.title}` : ""}`}
      />

      <Card className="overflow-hidden border-burgundy-200/80 shadow-lift">
        <CardContent className="surface-grid grid gap-4 bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-700 px-4 py-5 text-white sm:grid-cols-3 sm:px-5 sm:py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/75">Ребёнок</p>
            <p className="mt-2 inline-flex items-center gap-2 text-xl font-semibold">
              <UserRound className="h-5 w-5" />
              {currentParentStudent.fullName}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/75">Группа</p>
            <p className="mt-2 text-xl font-semibold">{group?.title ?? "Без группы"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/75">Баллы</p>
            <p className="mt-2 text-xl font-semibold">{currentParentStudent.points.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <ProgressMetric icon={<CalendarCheck2 className="h-5 w-5 text-burgundy-700 dark:text-white" />} title="Attendance" value={`${currentParentStudent.progress?.attendance ?? 0}%`} description="На основе отметок преподавателя." />
        <ProgressMetric icon={<ClipboardCheck className="h-5 w-5 text-burgundy-700 dark:text-white" />} title="Homework" value={`${currentParentStudent.progress?.homework ?? 0}%`} description="Показывает регулярность выполнения заданий." />
        <ProgressMetric icon={<Mic2 className="h-5 w-5 text-burgundy-700 dark:text-white" />} title="Speaking Avg" value={speakingAverage} description="Средний speaking score по последним попыткам." />
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
          <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">Сравнение speaking результата этой недели с предыдущей.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressMetric({ icon, title, value, description }: { icon: ReactNode; title: string; value: string | number; description: string }) {
  return (
    <Card className="interactive-lift">
      <CardHeader className="pb-2">
        <CardTitle className="inline-flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-burgundy-700 dark:text-white">{value}</p>
        <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">{description}</p>
      </CardContent>
    </Card>
  );
}
