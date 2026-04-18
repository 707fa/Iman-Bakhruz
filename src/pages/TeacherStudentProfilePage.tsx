import { ChevronLeft, MessageCircle, Save, ShieldCheck } from "lucide-react";
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
import { useUi } from "../hooks/useUi";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";

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
  const { t } = useUi();

  const [form, setForm] = useState<ProgressFormState>(emptyProgress);
  const [isSaving, setIsSaving] = useState(false);
  const [grantDays, setGrantDays] = useState(30);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);

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
    if (!token || !id || !/^\d+$/.test(id) || !hasAccess) return;

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
        // Keep local state fallback.
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
      showToast({ message: t("msg.serverUnavailable"), tone: "error" });
      return;
    }

    setIsSaving(true);
    try {
      await platformApi.updateStudentProgress(token, id, {
        ...form,
        status,
      });
      await refreshState();
      showToast({ message: t("msg.scoreUpdated"), tone: "success" });
    } catch {
      showToast({ message: t("msg.serverUnavailable"), tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGrantAccess() {
    const token = getApiToken();
    if (!token || !id || !/^\d+$/.test(id)) {
      showToast({ message: t("msg.serverUnavailable"), tone: "error" });
      return;
    }

    setIsGrantingAccess(true);
    try {
      const days = Math.max(1, Math.min(365, grantDays));
      await platformApi.grantStudentSubscription(token, id, days);
      await refreshState();
      showToast({ message: t("teacher.accessGranted", { days }), tone: "success" });
    } catch {
      showToast({ message: t("msg.serverUnavailable"), tone: "error" });
    } finally {
      setIsGrantingAccess(false);
    }
  }

  if (!currentTeacher) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/teacher/groups">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("teacher.backToGroups")}
          </Button>
        </Link>
      </div>

      {!student ? (
        <Card>
          <CardContent className="p-6 text-sm text-burgundy-700 dark:text-white">{t("profile.notFound")}</CardContent>
        </Card>
      ) : null}

      {student && !hasAccess ? (
        <Card>
          <CardContent className="p-6 text-sm text-burgundy-700 dark:text-white">{t("teacher.noAccessGroup")}</CardContent>
        </Card>
      ) : null}

      {student && hasAccess ? (
        <>
          <PageHeader
            title={student.fullName}
            subtitle={`${group?.title ?? t("profile.noGroup")} • ${group?.time ?? "-"}`}
            action={<StatusBadge status={status} />}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar fullName={student.fullName} avatarUrl={student.avatarUrl} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-charcoal dark:text-zinc-100">{student.fullName}</p>
                  <p className="text-sm text-charcoal/60 dark:text-zinc-400">{student.phone}</p>
                  <p className="mt-1 text-sm font-semibold text-burgundy-700 dark:text-white">
                    {student.points.toFixed(2)} {t("student.points")}
                  </p>
                </div>
              </div>

              <Link to={`/teacher/chat?user=${student.id}`}>
                <Button variant="secondary" className="w-full sm:w-auto">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t("chat.openFromProfile")}
                </Button>
              </Link>

              <details className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-charcoal dark:text-zinc-100">
                  <ShieldCheck className="h-4 w-4 text-burgundy-700 dark:text-white" />
                  {t("teacher.accessControlTitle")}
                </summary>
                <p className="mt-2 text-xs text-charcoal/65 dark:text-zinc-400">{t("teacher.accessControlDesc")}</p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="w-28">
                    <Label>{t("teacher.accessDays")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={grantDays}
                      onChange={(event) => setGrantDays(Math.max(1, Math.min(365, Number(event.target.value) || 1)))}
                    />
                  </div>
                  <Button onClick={() => void handleGrantAccess()} disabled={isGrantingAccess}>
                    {isGrantingAccess ? t("teacher.accessGranting") : t("teacher.accessGrant")}
                  </Button>
                </div>
              </details>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <ProgressOverviewCard
              title={t("profile.progressTitle")}
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
                <CardTitle>{t("profile.progressTitle")}</CardTitle>
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
                  {isSaving ? `${t("ui.save")}...` : t("ui.save")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}





