import { CalendarDays, Clock3, Send, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { UserAvatar } from "../components/UserAvatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { DATA_PROVIDER_MODE } from "../lib/env";
import { getGroupPlace } from "../lib/ranking";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import type { AiChatMessage, HomeworkTask } from "../types";

type AiReviewMode = "strict" | "friendly";

interface AiReviewIssue {
  original: string;
  why: string;
  fix: string;
  native: string;
}

interface AiHomeworkReview {
  score: number;
  summary: string;
  correctedText: string;
  issues: AiReviewIssue[];
  mode: AiReviewMode;
}

function localeToFeedbackLanguage(locale: "ru" | "uz" | "en"): string {
  if (locale === "uz") return "Uzbek";
  if (locale === "en") return "English";
  return "Russian";
}

function parseJsonObject<T>(raw: string): T | null {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;

  const jsonText = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return null;
  }
}

function getLastAssistantText(messages: AiChatMessage[]): string {
  return (
    [...messages]
      .reverse()
      .find((item) => item.role === "assistant" && item.text.trim().length > 0)
      ?.text?.trim() ?? ""
  );
}

function normalizeReview(rawText: string, mode: AiReviewMode): AiHomeworkReview | null {
  const payload = parseJsonObject<Record<string, unknown>>(rawText);
  if (!payload) return null;

  const rawIssues = Array.isArray(payload.issues) ? payload.issues : [];
  const issues: AiReviewIssue[] = rawIssues
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        original: String(row.original ?? "").trim(),
        why: String(row.why ?? "").trim(),
        fix: String(row.fix ?? "").trim(),
        native: String(row.native ?? "").trim(),
      };
    })
    .filter((item): item is AiReviewIssue => item !== null)
    .slice(0, 8);

  const score = Number(payload.score ?? 0);
  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
    summary: String(payload.summary ?? "").trim(),
    correctedText: String(payload.correctedText ?? "").trim(),
    issues,
    mode,
  };
}

function buildReviewPrompt(task: HomeworkTask, answer: string, mode: AiReviewMode, feedbackLanguage: string): string {
  const strictLine =
    mode === "strict"
      ? "Mode: strict IELTS examiner. Be strict, pinpoint every grammar and style issue."
      : "Mode: friendly coach. Keep tone supportive, focus on practical fixes.";

  return [
    "Ignore previous chat context.",
    "You are an English writing checker for homework.",
    strictLine,
    "Analyze student's answer and return only JSON.",
    'JSON schema: {"score":0-100,"summary":"...","correctedText":"...","issues":[{"original":"...","why":"...","fix":"...","native":"..."}]}.',
    "issues must explain why the mistake happens and how a native speaker would phrase it.",
    `Feedback language: ${feedbackLanguage}.`,
    `Homework title: ${task.title}`,
    `Homework description: ${task.description || "-"}`,
    `Student answer: ${answer}`,
  ].join("\n");
}

export function StudentGroupPage() {
  const { state, currentStudent } = useAppStore();
  const { t, locale } = useUi();
  const { showToast } = useToast();
  const token = getApiToken();
  const canUseApi = DATA_PROVIDER_MODE === "api" && Boolean(token);

  const [homeworkTasks, setHomeworkTasks] = useState<HomeworkTask[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  const [aiModes, setAiModes] = useState<Record<string, AiReviewMode>>({});
  const [aiCheckingTaskId, setAiCheckingTaskId] = useState<string | null>(null);
  const [aiReviews, setAiReviews] = useState<Record<string, AiHomeworkReview>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [mobileSection, setMobileSection] = useState<"overview" | "homework">("overview");

  if (!currentStudent) return null;

  const group = state.groups.find((item) => item.id === currentStudent.groupId);
  const groupPlace = getGroupPlace(state, currentStudent.id, currentStudent.groupId);
  const daysLabel = group ? t(`days.${group.daysPattern}`) : "-";

  const groupHomework = useMemo(
    () => homeworkTasks.filter((task) => task.groupId === currentStudent.groupId),
    [homeworkTasks, currentStudent.groupId],
  );

  const classmates = useMemo(
    () => state.students.filter((s) => s.groupId === currentStudent.groupId && s.id !== currentStudent.id),
    [state.students, currentStudent.groupId, currentStudent.id],
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

  async function handleAiCheck(task: HomeworkTask) {
    if (!token) return;

    const draftValue = answers[task.id] ?? "";
    const existingValue = groupHomework.find((entry) => entry.id === task.id)?.mySubmission?.answerText ?? "";
    const answer = (draftValue || existingValue).trim();
    if (!answer) {
      showToast({ tone: "error", message: t("homework.emptyAnswer") });
      return;
    }

    const mode = aiModes[task.id] ?? "friendly";
    const feedbackLanguage = localeToFeedbackLanguage(locale);

    setAiCheckingTaskId(task.id);
    setAiErrors((prev) => ({ ...prev, [task.id]: "" }));

    try {
      const prompt = buildReviewPrompt(task, answer, mode, feedbackLanguage);
      const messages = await platformApi.sendAiMessage(token, { text: prompt });
      const assistantText = getLastAssistantText(messages);
      if (!assistantText) {
        setAiErrors((prev) => ({ ...prev, [task.id]: t("homework.aiUnavailable") }));
        return;
      }

      const normalized = normalizeReview(assistantText, mode);
      if (!normalized) {
        setAiErrors((prev) => ({ ...prev, [task.id]: t("homework.aiParseError") }));
        return;
      }

      setAiReviews((prev) => ({ ...prev, [task.id]: normalized }));
      setAiErrors((prev) => ({ ...prev, [task.id]: "" }));
    } catch {
      setAiErrors((prev) => ({ ...prev, [task.id]: t("homework.aiUnavailable") }));
    } finally {
      setAiCheckingTaskId(null);
    }
  }

  const overviewSection = (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("auth.group")}</p>
            <p className="mt-2 text-lg font-semibold text-charcoal dark:text-zinc-100">{group?.title ?? t("student.noGroup")}</p>
          </div>

          <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("auth.time")}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
              <Clock3 className="h-4 w-4 text-burgundy-700 dark:text-white" />
              {group?.time ?? "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("auth.days")}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
              <CalendarDays className="h-4 w-4 text-burgundy-700 dark:text-white" />
              {daysLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("student.placeInGroup")}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-burgundy-700 dark:text-white">
              <Users className="h-4 w-4" />
              #{groupPlace > 0 ? groupPlace : "-"}
            </p>
          </div>
        </div>

        {classmates.length > 0 && (
          <div className="rounded-2xl border border-burgundy-100 bg-white p-4 sm:p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-charcoal/55 dark:text-zinc-400">Одноклассники ({classmates.length})</p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {classmates.map((student) => (
                <div key={student.id} className="flex items-center gap-3 rounded-xl border border-burgundy-50 p-2.5 transition hover:border-burgundy-100 dark:border-zinc-800 dark:hover:border-zinc-700">
                  <UserAvatar fullName={student.fullName} avatarUrl={student.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-charcoal dark:text-zinc-200">{student.fullName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const homeworkSection = (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-charcoal dark:text-zinc-100">Домашние задания</h3>
          <Badge variant="soft">{groupHomework.length}</Badge>
        </div>

        {!canUseApi ? (
          <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Домашние задания доступны в API режиме.
          </p>
        ) : loadingHomework ? (
          <p className="text-sm text-charcoal/60 dark:text-zinc-400">Загрузка заданий...</p>
        ) : groupHomework.length === 0 ? (
          <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Пока нет заданий от учителя.
          </p>
        ) : (
          <div className="space-y-3">
            {groupHomework.map((task) => {
              const fieldValue = answers[task.id] ?? task.mySubmission?.answerText ?? "";
              const aiMode = aiModes[task.id] ?? "friendly";
              const aiReview = aiReviews[task.id];
              const aiError = aiErrors[task.id];
              const checkingNow = aiCheckingTaskId === task.id;

              return (
                <div key={task.id} className="space-y-3 rounded-2xl border border-burgundy-100 p-4 dark:border-zinc-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{task.title}</p>
                    {task.dueAt ? <Badge variant="soft">дедлайн: {new Date(task.dueAt).toLocaleString()}</Badge> : null}
                  </div>

                  {task.description ? <p className="text-sm text-charcoal/70 dark:text-zinc-300">{task.description}</p> : null}

                  {task.mySubmission ? (
                    <div className="space-y-1 rounded-xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-sm dark:border-burgundy-800 dark:bg-burgundy-950/30">
                      <p className="font-semibold text-burgundy-700 dark:text-white">
                        Сдано: {task.mySubmission.status === "reviewed" ? "проверено" : "ожидает проверки"}
                      </p>
                      {task.mySubmission.teacherComment ? (
                        <p className="text-charcoal/75 dark:text-zinc-300">Комментарий учителя: {task.mySubmission.teacherComment}</p>
                      ) : null}
                      {typeof task.mySubmission.score === "number" ? (
                        <p className="font-semibold text-burgundy-700 dark:text-white">Оценка: {task.mySubmission.score.toFixed(2)}</p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <textarea
                      value={fieldValue}
                      onChange={(event) => setAnswers((prev) => ({ ...prev, [task.id]: event.target.value }))}
                      rows={3}
                      className="w-full resize-y rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-base text-charcoal outline-none transition focus:border-burgundy-300 focus:ring-2 focus:ring-burgundy-100 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-burgundy-700 dark:focus:ring-burgundy-900/40"
                      placeholder="Напишите ответ на задание..."
                    />

                    <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
                      <Select
                        value={aiMode}
                        onValueChange={(value) =>
                          setAiModes((prev) => ({
                            ...prev,
                            [task.id]: value === "strict" ? "strict" : "friendly",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("homework.aiModeLabel")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">{t("homework.aiModeFriendly")}</SelectItem>
                          <SelectItem value="strict">{t("homework.aiModeStrict")}</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handleAiCheck(task)}
                        disabled={checkingNow || !fieldValue.trim()}
                        className="justify-start"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {checkingNow ? t("homework.aiChecking") : t("homework.aiCheck")}
                      </Button>
                    </div>

                    <Button
                      onClick={() => void handleSubmitHomework(task.id)}
                      disabled={submittingTaskId === task.id || !fieldValue.trim()}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {task.mySubmission ? "Обновить ответ" : "Сдать задание"}
                    </Button>
                  </div>

                  {aiError ? (
                    <p className="rounded-xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-sm text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-950/30 dark:text-white">
                      {aiError}
                    </p>
                  ) : null}

                  {aiReview ? (
                    <div className="space-y-3 rounded-xl border border-burgundy-200 bg-white p-3 dark:border-burgundy-800 dark:bg-zinc-950">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="soft">{aiReview.mode === "strict" ? t("homework.aiModeStrict") : t("homework.aiModeFriendly")}</Badge>
                        <p className="text-sm font-semibold text-burgundy-700 dark:text-white">{t("homework.aiScore")}: {aiReview.score}/100</p>
                      </div>

                      {aiReview.summary ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55 dark:text-zinc-400">{t("homework.aiSummary")}</p>
                          <p className="mt-1 text-sm text-charcoal dark:text-zinc-100">{aiReview.summary}</p>
                        </div>
                      ) : null}

                      {aiReview.correctedText ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55 dark:text-zinc-400">{t("homework.aiCorrected")}</p>
                          <p className="mt-1 rounded-lg border border-burgundy-100 bg-burgundy-50 px-3 py-2 text-sm text-charcoal dark:border-burgundy-900/50 dark:bg-burgundy-950/30 dark:text-zinc-100">
                            {aiReview.correctedText}
                          </p>
                        </div>
                      ) : null}

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55 dark:text-zinc-400">{t("homework.aiIssues")}</p>
                        {aiReview.issues.length === 0 ? (
                          <p className="mt-1 text-sm text-charcoal/75 dark:text-zinc-300">{t("homework.aiNoIssues")}</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {aiReview.issues.map((issue, index) => (
                              <div key={`${task.id}-issue-${index}`} className="rounded-lg border border-burgundy-100 px-3 py-2 dark:border-zinc-700">
                                <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{t("homework.aiIssueOriginal")}: {issue.original || "-"}</p>
                                <p className="mt-1 text-xs text-charcoal/70 dark:text-zinc-300">{t("homework.aiIssueWhy")}: {issue.why || "-"}</p>
                                <p className="mt-1 text-xs text-charcoal/70 dark:text-zinc-300">{t("homework.aiIssueFix")}: {issue.fix || "-"}</p>
                                <p className="mt-1 text-xs text-burgundy-700 dark:text-white">{t("homework.aiIssueNative")}: {issue.native || "-"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tabs.group")}
        subtitle={t("student.groupSubtitle")}
        action={<Badge variant="soft">{group?.title ?? t("student.noGroup")}</Badge>}
      />

      <div className="lg:hidden">
        <Tabs value={mobileSection} onValueChange={(value) => setMobileSection(value as "overview" | "homework")}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1">
            <TabsTrigger className="px-2 py-2 text-xs" value="overview">Группа</TabsTrigger>
            <TabsTrigger className="px-2 py-2 text-xs" value="homework">Домашка</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">{overviewSection}</TabsContent>
          <TabsContent value="homework">{homeworkSection}</TabsContent>
        </Tabs>
      </div>

      <div className="hidden space-y-6 lg:block">
        {overviewSection}
        {homeworkSection}
      </div>
    </div>
  );
}
