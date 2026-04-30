import { BookOpenCheck, ChevronLeft, Clock3, Crown, Mic, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ScoreActions } from "../components/ScoreActions";
import { StatusBadge } from "../components/StatusBadge";
import { UserAvatar } from "../components/UserAvatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { DATA_PROVIDER_MODE } from "../lib/env";
import { hasTeacherGroupAccess } from "../lib/teacherGroups";
import { getGroupTop } from "../lib/ranking";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import type { HomeworkSubmission, HomeworkTask } from "../types";

interface ReviewDraft {
  teacherComment: string;
  score: string;
  status: "submitted" | "reviewed";
}

function crownClass(rank: number): string {
  if (rank === 1) return "text-amber-500";
  if (rank === 2) return "text-slate-400";
  if (rank === 3) return "text-orange-500";
  return "text-charcoal/50 dark:text-zinc-400";
}

export function TeacherGroupPage() {
  const { id } = useParams();
  const { state, currentTeacher, applyScore } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();
  const token = getApiToken();
  const canUseApi = DATA_PROVIDER_MODE === "api" && Boolean(token);

  const [homeworkTasks, setHomeworkTasks] = useState<HomeworkTask[]>([]);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [creatingHomework, setCreatingHomework] = useState(false);
  const [homeworkTitle, setHomeworkTitle] = useState("");
  const [homeworkDescription, setHomeworkDescription] = useState("");
  const [homeworkDueAt, setHomeworkDueAt] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [taskSubmissions, setTaskSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});
  const [savingSubmissionId, setSavingSubmissionId] = useState<string | null>(null);

  const [speakingTasks, setSpeakingTasks] = useState<HomeworkTask[]>([]);
  const [loadingSpeaking, setLoadingSpeaking] = useState(false);
  const [creatingSpeaking, setCreatingSpeaking] = useState(false);
  const [speakingTitle, setSpeakingTitle] = useState("");
  const [speakingTopic, setSpeakingTopic] = useState("");
  const [speakingQuestionsText, setSpeakingQuestionsText] = useState("");
  const [speakingDueAt, setSpeakingDueAt] = useState("");

  if (!currentTeacher) return null;

  const group = state.groups.find((entry) => entry.id === id);
  const hasAccess = !!group && hasTeacherGroupAccess(state, currentTeacher, group.id);

  const students = hasAccess
    ? state.students.filter((student) => student.groupId === group.id).sort((a, b) => b.points - a.points)
    : [];

  const top = hasAccess ? getGroupTop(state, group!.id, 10) : [];
  const normalizedStudentSearch = studentSearch.trim().toLowerCase();
  const filteredStudents = normalizedStudentSearch
    ? students.filter((student) => student.fullName.toLowerCase().includes(normalizedStudentSearch))
    : students;
  const filteredTop = normalizedStudentSearch
    ? top.filter((item) => item.fullName.toLowerCase().includes(normalizedStudentSearch))
    : top;
  const daysLabel = group ? t(`days.${group.daysPattern}`) : "";

  const selectedTask = useMemo(
    () => homeworkTasks.find((task) => task.id === selectedTaskId) ?? null,
    [homeworkTasks, selectedTaskId],
  );

  useEffect(() => {
    if (!hasAccess || !canUseApi || !token || !group) {
      setHomeworkTasks([]);
      return;
    }

    let disposed = false;

    const loadHomework = async () => {
      setLoadingHomework(true);
      try {
        const tasks = await platformApi.getTeacherHomeworkTasks(token, group.id);
        if (!disposed) {
          setHomeworkTasks(tasks);
          if (tasks.length > 0 && !selectedTaskId) {
            setSelectedTaskId(tasks[0].id);
          }
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

    void loadHomework();

    return () => {
      disposed = true;
    };
  }, [hasAccess, canUseApi, token, group, selectedTaskId]);

  useEffect(() => {
    if (!hasAccess || !canUseApi || !token || !group) {
      setSpeakingTasks([]);
      return;
    }

    let disposed = false;

    const loadSpeaking = async () => {
      setLoadingSpeaking(true);
      try {
        const tasks = await platformApi.getTeacherSpeakingTasks(token, group.id);
        if (!disposed) {
          setSpeakingTasks(tasks);
        }
      } catch {
        if (!disposed) {
          setSpeakingTasks([]);
        }
      } finally {
        if (!disposed) {
          setLoadingSpeaking(false);
        }
      }
    };

    void loadSpeaking();

    return () => {
      disposed = true;
    };
  }, [hasAccess, canUseApi, token, group]);

  useEffect(() => {
    if (!selectedTaskId || !canUseApi || !token) {
      setTaskSubmissions([]);
      return;
    }

    let disposed = false;

    const loadSubmissions = async () => {
      setLoadingSubmissions(true);
      try {
        const payload = await platformApi.getTeacherHomeworkSubmissions(token, selectedTaskId);
        if (!disposed) {
          setTaskSubmissions(payload.submissions);
          const nextDrafts: Record<string, ReviewDraft> = {};
          payload.submissions.forEach((submission) => {
            nextDrafts[submission.id] = {
              teacherComment: submission.teacherComment ?? "",
              score: submission.score !== undefined ? String(submission.score) : "",
              status: submission.status,
            };
          });
          setReviewDrafts(nextDrafts);
        }
      } catch {
        if (!disposed) {
          setTaskSubmissions([]);
        }
      } finally {
        if (!disposed) {
          setLoadingSubmissions(false);
        }
      }
    };

    void loadSubmissions();

    return () => {
      disposed = true;
    };
  }, [selectedTaskId, canUseApi, token]);

  async function handleCreateHomework() {
    if (!group || !token) return;
    const title = homeworkTitle.trim();
    if (title.length < 3) {
      showToast({ tone: "error", message: "Название задания слишком короткое." });
      return;
    }

    setCreatingHomework(true);
    try {
      const task = await platformApi.createTeacherHomeworkTask(token, {
        groupId: group.id,
        title,
        description: homeworkDescription.trim(),
        dueAt: homeworkDueAt ? new Date(homeworkDueAt).toISOString() : undefined,
      });

      setHomeworkTasks((prev) => [task, ...prev]);
      setSelectedTaskId(task.id);
      setHomeworkTitle("");
      setHomeworkDescription("");
      setHomeworkDueAt("");
      showToast({ tone: "success", message: "Задание создано." });
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setCreatingHomework(false);
    }
  }

  async function handleCreateSpeakingTask() {
    if (!group || !token) return;
    const title = speakingTitle.trim();
    if (title.length < 3) {
      showToast({ tone: "error", message: "Название speaking-задания слишком короткое." });
      return;
    }

    const rawQuestions = speakingQuestionsText
      .split(/\r?\n|;/g)
      .map((item) => item.trim())
      .filter(Boolean);
    const speakingQuestions = [...new Set(rawQuestions)].slice(0, 20);

    if (speakingQuestions.length === 0) {
      showToast({ tone: "error", message: "Добавьте минимум 1 speaking-вопрос." });
      return;
    }

    setCreatingSpeaking(true);
    try {
      const task = await platformApi.createTeacherSpeakingTask(token, {
        groupId: group.id,
        title,
        description: "",
        speakingTopic: speakingTopic.trim() || title,
        speakingLevel: group.title.toLowerCase(),
        speakingQuestions,
        dueAt: speakingDueAt ? new Date(speakingDueAt).toISOString() : undefined,
      });

      setSpeakingTasks((prev) => [task, ...prev]);
      setSpeakingTitle("");
      setSpeakingTopic("");
      setSpeakingQuestionsText("");
      setSpeakingDueAt("");
      showToast({ tone: "success", message: "Speaking-задание создано." });
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setCreatingSpeaking(false);
    }
  }

  async function handleSaveReview(submissionId: string) {
    if (!token) return;
    const draft = reviewDrafts[submissionId];
    if (!draft) return;

    setSavingSubmissionId(submissionId);
    try {
      const next = await platformApi.reviewHomeworkSubmission(token, submissionId, {
        status: draft.status,
        teacherComment: draft.teacherComment,
        score: draft.score.trim() ? Number(draft.score) : null,
      });

      setTaskSubmissions((prev) => prev.map((item) => (item.id === submissionId ? next : item)));
      showToast({ tone: "success", message: "Проверка сохранена." });
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setSavingSubmissionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/teacher/groups">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("teacher.backToGroups")}
          </Button>
        </Link>
      </div>

      <PageHeader
        title={group ? t("teacher.groupTitle", { title: group.title }) : t("teacher.groupNotFound")}
        subtitle={group ? `${t("teacher.time", { time: group.time })} • ${daysLabel}` : t("teacher.checkRoute")}
        action={
          group ? (
            <Badge variant="soft">
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {group.time}
            </Badge>
          ) : null
        }
      />

      {group && !hasAccess ? (
        <Card>
          <CardContent className="p-6 text-sm text-burgundy-700 dark:text-white">{t("teacher.noAccessGroup")}</CardContent>
        </Card>
      ) : null}

      {hasAccess ? (
        <>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <Input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder={t("search.studentByName")}
              />
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="grid gap-3 md:grid-cols-2">
              {filteredStudents.map((student) => (
                <Card key={student.id}>
                  <CardContent className="space-y-2.5 p-3 sm:p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar fullName={student.fullName} avatarUrl={student.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-charcoal dark:text-zinc-100">{student.fullName}</p>
                          <p className="truncate text-xs text-charcoal/55 dark:text-zinc-400">{student.phone}</p>
                        </div>
                      </div>
                      <Badge variant="soft">{student.points.toFixed(2)}</Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge status={student.statusBadge} />
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          to={`/teacher/student/${student.id}`}
                          className="text-xs font-semibold text-burgundy-700 transition hover:text-burgundy-600 dark:text-white dark:hover:text-white"
                        >
                          {t("menu.profile")}
                        </Link>
                      </div>
                    </div>

                    <ScoreActions
                      onSelect={(action) => {
                        void (async () => {
                          const result = await applyScore(student.id, group.id, action);
                          showToast({
                            message: t(result.messageKey, result.messageParams),
                            tone: result.ok ? "success" : "error",
                          });
                        })();
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
              {filteredStudents.length === 0 ? (
                <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 md:col-span-2">
                  {t("ui.noData")}
                </p>
              ) : null}
            </section>

            <Card>
              <CardContent className="p-4 sm:p-5">
                <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="h-4 w-4 text-burgundy-700 dark:text-white" />
                  {t("teacher.groupTopTitle")}
                </h3>
                <div className="space-y-2">
                  {filteredTop.map((item, index) => (
                    <div
                      key={item.studentId}
                      className="flex items-center justify-between rounded-xl border border-burgundy-100 p-3 text-sm dark:border-zinc-700"
                    >
                      <span className="inline-flex items-center gap-2 font-semibold text-charcoal dark:text-zinc-100">
                        {index < 3 ? <Crown className={`h-4 w-4 ${crownClass(index + 1)}`} /> : null}
                        <span className="text-xs text-charcoal/65 dark:text-zinc-300">#{index + 1}</span>
                        <span>{item.fullName}</span>
                      </span>
                      <span className="font-bold text-burgundy-700 dark:text-white">{item.points.toFixed(2)}</span>
                    </div>
                  ))}
                  {filteredTop.length === 0 ? (
                    <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {t("ui.noData")}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
                <Mic className="h-4 w-4 text-burgundy-700 dark:text-white" />
                Speaking задания урока
              </h3>

              {!canUseApi ? (
                <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  Speaking задания доступны в API режиме.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 rounded-2xl border border-burgundy-100 p-4 dark:border-zinc-700 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Название</label>
                      <Input
                        value={speakingTitle}
                        onChange={(event) => setSpeakingTitle(event.target.value)}
                        placeholder="Например: Speaking Task - Was/Were"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Тема урока</label>
                      <Input
                        value={speakingTopic}
                        onChange={(event) => setSpeakingTopic(event.target.value)}
                        placeholder="Например: Was/Were"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Вопросы (каждый с новой строки)</label>
                      <textarea
                        value={speakingQuestionsText}
                        onChange={(event) => setSpeakingQuestionsText(event.target.value)}
                        rows={6}
                        className="w-full resize-y rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-base text-charcoal outline-none transition focus:border-burgundy-300 focus:ring-2 focus:ring-burgundy-100 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-burgundy-700 dark:focus:ring-burgundy-900/40"
                        placeholder={"1) What were you doing yesterday evening?\n2) Tell me about your last weekend."}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Дедлайн</label>
                      <Input type="datetime-local" value={speakingDueAt} onChange={(event) => setSpeakingDueAt(event.target.value)} />
                    </div>

                    <div className="flex items-end">
                      <Button onClick={() => void handleCreateSpeakingTask()} disabled={creatingSpeaking || speakingTitle.trim().length < 3}>
                        {creatingSpeaking ? "Создаем..." : "Создать speaking"}
                      </Button>
                    </div>
                  </div>

                  {loadingSpeaking ? (
                    <p className="text-sm text-charcoal/60 dark:text-zinc-400">Загрузка speaking заданий...</p>
                  ) : speakingTasks.length === 0 ? (
                    <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      Speaking задания пока не созданы.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {speakingTasks.map((task) => (
                        <div key={task.id} className="rounded-xl border border-burgundy-100 p-3 dark:border-zinc-700">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-charcoal dark:text-zinc-100">{task.speakingTopic || task.title}</p>
                            <Badge variant="soft">{(task.speakingQuestions ?? []).length} вопросов</Badge>
                          </div>
                          <p className="mt-1 text-xs text-charcoal/60 dark:text-zinc-400">
                            {task.dueAt ? `дедлайн: ${new Date(task.dueAt).toLocaleString()}` : "без дедлайна"}
                          </p>
                          {task.speakingQuestions && task.speakingQuestions.length > 0 ? (
                            <div className="mt-2 rounded-lg border border-burgundy-100 bg-white px-3 py-2 text-xs text-charcoal/80 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                              <p className="mb-1 inline-flex items-center gap-1 font-semibold">
                                <BookOpenCheck className="h-3.5 w-3.5 text-burgundy-700 dark:text-white" />
                                Вопросы:
                              </p>
                              <ul className="space-y-1">
                                {task.speakingQuestions.slice(0, 3).map((question, index) => (
                                  <li key={`${task.id}-${index}`}>• {question}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <h3 className="text-lg font-semibold text-charcoal dark:text-zinc-100">Домашние задания группы</h3>

              {!canUseApi ? (
                <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  Домашние задания доступны в API режиме.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 rounded-2xl border border-burgundy-100 p-4 dark:border-zinc-700 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Название задания</label>
                      <Input value={homeworkTitle} onChange={(event) => setHomeworkTitle(event.target.value)} placeholder="Например: Unit 3 Writing" />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Описание</label>
                      <textarea
                        value={homeworkDescription}
                        onChange={(event) => setHomeworkDescription(event.target.value)}
                        rows={3}
                        className="w-full resize-y rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-base text-charcoal outline-none transition focus:border-burgundy-300 focus:ring-2 focus:ring-burgundy-100 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-burgundy-700 dark:focus:ring-burgundy-900/40"
                        placeholder="Что нужно сделать ученикам..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Дедлайн</label>
                      <Input type="datetime-local" value={homeworkDueAt} onChange={(event) => setHomeworkDueAt(event.target.value)} />
                    </div>

                    <div className="flex items-end">
                      <Button onClick={() => void handleCreateHomework()} disabled={creatingHomework || homeworkTitle.trim().length < 3}>
                        {creatingHomework ? "Создаем..." : "Создать задание"}
                      </Button>
                    </div>
                  </div>

                  {loadingHomework ? (
                    <p className="text-sm text-charcoal/60 dark:text-zinc-400">Загрузка заданий...</p>
                  ) : homeworkTasks.length === 0 ? (
                    <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      В этой группе пока нет заданий.
                    </p>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="space-y-2">
                        {homeworkTasks.map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => setSelectedTaskId(task.id)}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                              selectedTaskId === task.id
                                ? "border-burgundy-300 bg-burgundy-50 dark:border-burgundy-700 dark:bg-burgundy-900/30"
                                : "border-burgundy-100 bg-white hover:border-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900"
                            }`}
                          >
                            <p className="font-semibold text-charcoal dark:text-zinc-100">{task.title}</p>
                            <p className="mt-1 text-xs text-charcoal/60 dark:text-zinc-400">
                              {task.dueAt ? `дедлайн: ${new Date(task.dueAt).toLocaleString()}` : "без дедлайна"}
                            </p>
                          </button>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">Сдачи учеников</h4>
                        {loadingSubmissions ? (
                          <p className="text-sm text-charcoal/60 dark:text-zinc-400">Загрузка сдач...</p>
                        ) : !selectedTask ? (
                          <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            Выберите задание слева.
                          </p>
                        ) : taskSubmissions.length === 0 ? (
                          <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            Пока никто не сдал это задание.
                          </p>
                        ) : (
                          taskSubmissions.map((submission) => {
                            const draft = reviewDrafts[submission.id] ?? {
                              teacherComment: "",
                              score: "",
                              status: "submitted" as const,
                            };
                            return (
                              <div key={submission.id} className="space-y-2 rounded-xl border border-burgundy-100 p-3 dark:border-zinc-700">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{submission.studentName}</p>
                                  <Badge variant={submission.status === "reviewed" ? "positive" : "default"}>
                                    {submission.status === "reviewed" ? "Проверено" : "Ожидает"}
                                  </Badge>
                                </div>
                                <p className="rounded-lg bg-white px-3 py-2 text-sm text-charcoal dark:bg-zinc-900 dark:text-zinc-200">{submission.answerText}</p>

                                <div className="grid gap-2 lg:grid-cols-[1fr_140px_150px_auto]">
                                  <Input
                                    value={draft.teacherComment}
                                    onChange={(event) =>
                                      setReviewDrafts((prev) => ({
                                        ...prev,
                                        [submission.id]: { ...draft, teacherComment: event.target.value },
                                      }))
                                    }
                                    placeholder="Комментарий"
                                  />
                                  <Input
                                    value={draft.score}
                                    onChange={(event) =>
                                      setReviewDrafts((prev) => ({
                                        ...prev,
                                        [submission.id]: { ...draft, score: event.target.value },
                                      }))
                                    }
                                    placeholder="Оценка"
                                  />
                                  <select
                                    value={draft.status}
                                    onChange={(event) =>
                                      setReviewDrafts((prev) => ({
                                        ...prev,
                                        [submission.id]: {
                                          ...draft,
                                          status: event.target.value === "reviewed" ? "reviewed" : "submitted",
                                        },
                                      }))
                                    }
                                    className="h-10 rounded-xl border border-burgundy-100 bg-white px-3 text-sm text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                  >
                                    <option value="submitted">Ожидает</option>
                                    <option value="reviewed">Проверено</option>
                                  </select>
                                  <Button
                                    onClick={() => void handleSaveReview(submission.id)}
                                    disabled={savingSubmissionId === submission.id}
                                  >
                                    Сохранить
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}








