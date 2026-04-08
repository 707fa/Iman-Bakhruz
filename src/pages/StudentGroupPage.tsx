import { CalendarDays, Clock3, Send, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { RankingList } from "../components/RankingList";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { DATA_PROVIDER_MODE } from "../lib/env";
import { getGroupPlace, getGroupTop } from "../lib/ranking";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import type { HomeworkTask } from "../types";

export function StudentGroupPage() {
  const { state, currentStudent } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();
  const token = getApiToken();
  const canUseApi = DATA_PROVIDER_MODE === "api" && Boolean(token);

  const [homeworkTasks, setHomeworkTasks] = useState<HomeworkTask[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  if (!currentStudent) return null;

  const group = state.groups.find((item) => item.id === currentStudent.groupId);
  const groupTop = getGroupTop(state, currentStudent.groupId, 10);
  const groupPlace = getGroupPlace(state, currentStudent.id, currentStudent.groupId);
  const daysLabel = group ? t(`days.${group.daysPattern}`) : "-";

  const groupHomework = useMemo(
    () => homeworkTasks.filter((task) => task.groupId === currentStudent.groupId),
    [homeworkTasks, currentStudent.groupId],
  );

  useEffect(() => {
    if (!canUseApi || !token) {
      setHomeworkTasks([]);
      return;
    }

    let disposed = false;

    const loadTasks = async () => {
      setLoadingHomework(true);
      try {
        const tasks = await platformApi.getStudentHomeworkTasks(token);
        if (!disposed) {
          setHomeworkTasks(tasks);
        }
      } catch {
        if (!disposed) {
          setHomeworkTasks([]);
        }
      } finally {
        if (!disposed) {
          setLoadingHomework(false);
        }
      }
    };

    void loadTasks();
    return () => {
      disposed = true;
    };
  }, [canUseApi, token]);

  async function handleSubmitHomework(taskId: string) {
    if (!token) return;

    const draftValue = answers[taskId] ?? "";
    const existingValue = groupHomework.find((task) => task.id === taskId)?.mySubmission?.answerText ?? "";
    const answer = (draftValue || existingValue).trim();
    if (!answer) return;

    setSubmittingTaskId(taskId);
    try {
      const submission = await platformApi.submitStudentHomework(token, taskId, answer);
      setHomeworkTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                mySubmission: submission,
              }
            : task,
        ),
      );
      showToast({ tone: "success", message: "Домашка отправлена учителю." });
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setSubmittingTaskId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tabs.group")}
        subtitle={t("student.groupSubtitle")}
        action={<Badge variant="soft">{group?.title ?? t("student.noGroup")}</Badge>}
      />

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("auth.group")}</p>
              <p className="mt-2 text-lg font-semibold text-charcoal dark:text-zinc-100">{group?.title ?? t("student.noGroup")}</p>
            </div>

            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("auth.time")}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
                <Clock3 className="h-4 w-4 text-burgundy-700 dark:text-burgundy-300" />
                {group?.time ?? "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("auth.days")}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
                <CalendarDays className="h-4 w-4 text-burgundy-700 dark:text-burgundy-300" />
                {daysLabel}
              </p>
            </div>

            <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeInGroup")}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-burgundy-700 dark:text-burgundy-300">
                <Users className="h-4 w-4" />
                #{groupPlace > 0 ? groupPlace : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-charcoal dark:text-zinc-100">Домашние задания</h3>
            <Badge variant="soft">{groupHomework.length}</Badge>
          </div>

          {!canUseApi ? (
            <p className="rounded-xl border border-burgundy-100 bg-slate-50 px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              Домашние задания доступны в API режиме.
            </p>
          ) : loadingHomework ? (
            <p className="text-sm text-charcoal/60 dark:text-zinc-400">Загрузка заданий...</p>
          ) : groupHomework.length === 0 ? (
            <p className="rounded-xl border border-burgundy-100 bg-slate-50 px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              Пока нет заданий от учителя.
            </p>
          ) : (
            <div className="space-y-3">
              {groupHomework.map((task) => {
                const fieldValue = answers[task.id] ?? task.mySubmission?.answerText ?? "";
                return (
                  <div key={task.id} className="space-y-3 rounded-2xl border border-burgundy-100 p-4 dark:border-zinc-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{task.title}</p>
                      {task.dueAt ? <Badge variant="soft">дедлайн: {new Date(task.dueAt).toLocaleString()}</Badge> : null}
                    </div>

                    {task.description ? <p className="text-sm text-charcoal/70 dark:text-zinc-300">{task.description}</p> : null}

                    {task.mySubmission ? (
                      <div className="space-y-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                          Сдано: {task.mySubmission.status === "reviewed" ? "проверено" : "ожидает проверки"}
                        </p>
                        {task.mySubmission.teacherComment ? (
                          <p className="text-charcoal/75 dark:text-zinc-300">Комментарий учителя: {task.mySubmission.teacherComment}</p>
                        ) : null}
                        {typeof task.mySubmission.score === "number" ? (
                          <p className="font-semibold text-burgundy-700 dark:text-burgundy-300">Оценка: {task.mySubmission.score.toFixed(2)}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <textarea
                        value={fieldValue}
                        onChange={(event) => setAnswers((prev) => ({ ...prev, [task.id]: event.target.value }))}
                        rows={3}
                        className="w-full resize-y rounded-xl border border-burgundy-100 bg-slate-50 px-3 py-2 text-base text-charcoal outline-none transition focus:border-burgundy-300 focus:ring-2 focus:ring-burgundy-100 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-burgundy-700 dark:focus:ring-burgundy-900/40"
                        placeholder="Напишите ответ на задание..."
                      />
                      <Button
                        onClick={() => void handleSubmitHomework(task.id)}
                        disabled={submittingTaskId === task.id || !fieldValue.trim()}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {task.mySubmission ? "Обновить ответ" : "Сдать задание"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <RankingList
        title={t("student.myGroupTop")}
        items={groupTop}
        groups={state.groups}
        currentUserId={currentStudent.id}
        showMeta={false}
        itemHref={(item) => `/student/profile/${item.studentId}`}
      />
    </div>
  );
}

