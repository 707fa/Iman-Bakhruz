import { BarChart3, CalendarCheck2, ClipboardCheck, Mic2 } from "lucide-react";
import { useMemo } from "react";
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

export function StudentParentViewPage() {
  const { currentStudent } = useAppStore();

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parent View"
        subtitle="Ограниченный просмотр: посещаемость, задания и рост speaking score без лишних личных данных."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <CalendarCheck2 className="h-5 w-5 text-burgundy-700 dark:text-white" />
              Посещаемость
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-burgundy-700 dark:text-white">{currentStudent?.progress?.attendance ?? 0}%</p>
            <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">На основе обновлений преподавателя.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-burgundy-700 dark:text-white" />
              Выполненные задания
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-burgundy-700 dark:text-white">{currentStudent?.progress?.homework ?? 0}%</p>
            <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">Индикатор домашней дисциплины.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Mic2 className="h-5 w-5 text-burgundy-700 dark:text-white" />
              Средний Speaking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-burgundy-700 dark:text-white">{speakingAverage}</p>
            <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">По последним попыткам speaking.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-burgundy-700 dark:text-white" />
            Рост Speaking за неделю
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${speakingGrowth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {speakingGrowth >= 0 ? "+" : ""}
            {speakingGrowth}
          </p>
          <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">
            Сравнение текущей недели с предыдущей по speaking score.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

