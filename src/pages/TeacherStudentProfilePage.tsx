import { ChevronLeft, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ProgressOverviewCard } from "../components/ProgressOverviewCard";
import { StatusBadge } from "../components/StatusBadge";
import { UserAvatar } from "../components/UserAvatar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { getApiToken } from "../services/tokenStorage";
import { platformApi } from "../services/api/platformApi";

interface ProgressFormState {
  grammar: number;
  vocabulary: number;
  homework: number;
  speaking: number;
  attendance: number;
  weeklyXp: number;
  level: number;
  streakDays: number;
}

const emptyProgress: ProgressFormState = {
  grammar: 0,
  vocabulary: 0,
  homework: 0,
  speaking: 0,
  attendance: 0,
  weeklyXp: 0,
  level: 1,
  streakDays: 0,
};

function toStatus(progress: ProgressFormState): "red" | "yellow" | "green" {
  const average = (progress.grammar + progress.vocabulary + progress.homework + progress.speaking + progress.attendance) / 5;
  if (average >= 75) return "green";
  if (average >= 45) return "yellow";
  return "red";
}

export function TeacherStudentProfilePage() {
  const { id } = useParams();
  const { state, currentTeacher, refreshState } = useAppStore();
  const { showToast } = useToast();

  const [form, setForm] = useState<ProgressFormState>(emptyProgress);
  const [isSaving, setIsSaving] = useState(false);

  const student = state.students.find((item) => item.id === id);
  const hasAccess = Boolean(student && currentTeacher?.groupIds.includes(student.groupId));
  const group = student ? state.groups.find((entry) => entry.id === student.groupId) : null;

  useEffect(() => {
    if (!student) return;
    setForm({
      grammar: student.progress?.grammar ?? 0,
      vocabulary: student.progress?.vocabulary ?? 0,
      homework: student.progress?.homework ?? 0,
      speaking: student.progress?.speaking ?? 0,
      attendance: student.progress?.attendance ?? 0,
      weeklyXp: student.progress?.weeklyXp ?? 0,
      level: student.progress?.level ?? 1,
      streakDays: student.progress?.streakDays ?? 0,
    });
  }, [student?.id]);

  useEffect(() => {
    const token = getApiToken();
    if (!token || !id || !/^\d+$/.test(id)) return;
    if (!hasAccess) return;

    let disposed = false;
    const load = async () => {
      try {
        const profile = await platformApi.getStudentProgress(token, id);
        if (disposed) return;
        setForm({
          grammar: profile.grammar,
          vocabulary: profile.vocabulary,
          homework: profile.homework,
          speaking: profile.speaking,
          attendance: profile.attendance,
          weeklyXp: profile.weeklyXp,
          level: profile.level,
          streakDays: profile.streakDays,
        });
      } catch {
        // Fallback to already loaded store data.
      }
    };
    void load();
    return () => {
      disposed = true;
    };
  }, [id, hasAccess]);

  const status = useMemo(() => toStatus(form), [form]);

  function updateMetric<K extends keyof ProgressFormState>(key: K, value: number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const token = getApiToken();
    if (!token || !id || !/^\d+$/.test(id)) {
      showToast({ message: "Progress sync requires API backend", tone: "error" });
      return;
    }

    setIsSaving(true);
    try {
      await platformApi.updateStudentProgress(token, id, {
        ...form,
        status,
      });
      await refreshState();
      showToast({ message: "Student progress updated", tone: "success" });
    } catch {
      showToast({ message: "Failed to update progress", tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  if (!currentTeacher) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/teacher">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {!student ? (
        <Card>
          <CardContent className="p-6 text-sm text-rose-600">Student not found</CardContent>
        </Card>
      ) : null}

      {student && !hasAccess ? (
        <Card>
          <CardContent className="p-6 text-sm text-rose-600">You do not have access to this student.</CardContent>
        </Card>
      ) : null}

      {student && hasAccess ? (
        <>
          <PageHeader
            title={student.fullName}
            subtitle={`${group?.title ?? "Group"} • ${group?.time ?? "-"}`}
            action={<StatusBadge status={status} />}
          />

          <Card>
            <CardHeader>
              <CardTitle>Student Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <UserAvatar fullName={student.fullName} avatarUrl={student.avatarUrl} size="lg" />
                <div>
                  <p className="text-lg font-semibold text-charcoal dark:text-zinc-100">{student.fullName}</p>
                  <p className="text-sm text-charcoal/60 dark:text-zinc-400">{student.phone}</p>
                  <p className="mt-1 text-sm font-semibold text-burgundy-700 dark:text-burgundy-300">{student.points.toFixed(2)} points</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <ProgressOverviewCard
              title="Current Progress"
              progress={{
                status,
                grammar: form.grammar,
                vocabulary: form.vocabulary,
                homework: form.homework,
                speaking: form.speaking,
                attendance: form.attendance,
                weeklyXp: form.weeklyXp,
                level: form.level,
                streakDays: form.streakDays,
              }}
            />

            <Card>
              <CardHeader>
                <CardTitle>Edit Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Grammar (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.grammar}
                      onChange={(event) => updateMetric("grammar", Number(event.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vocabulary (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.vocabulary}
                      onChange={(event) => updateMetric("vocabulary", Number(event.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Homework (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.homework}
                      onChange={(event) => updateMetric("homework", Number(event.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Speaking (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.speaking}
                      onChange={(event) => updateMetric("speaking", Number(event.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Attendance (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.attendance}
                      onChange={(event) => updateMetric("attendance", Number(event.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Weekly XP</Label>
                    <Input type="number" min={0} value={form.weeklyXp} onChange={(event) => updateMetric("weeklyXp", Number(event.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Level</Label>
                    <Input type="number" min={1} value={form.level} onChange={(event) => updateMetric("level", Math.max(1, Number(event.target.value)))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Streak Days</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.streakDays}
                      onChange={(event) => updateMetric("streakDays", Math.max(0, Number(event.target.value)))}
                    />
                  </div>
                </div>

                <Button onClick={() => void handleSave()} disabled={isSaving} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Progress"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
