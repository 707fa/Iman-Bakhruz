import { CheckCircle2, Clock3, FileText, Loader2, Mic, Send, Sparkles, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { DATA_PROVIDER_MODE } from "../lib/env";
import { autoGradeHomework } from "../services/api/speakingApi";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import type { HomeworkTask } from "../types";

export function StudentHomeworkPage() {
  const { state, currentStudent } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();
  const token = getApiToken();
  const canUseApi = DATA_PROVIDER_MODE === "api" && Boolean(token);

  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [speakingTasks, setSpeakingTasks] = useState<HomeworkTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [autoGrading, setAutoGrading] = useState(false);
  const [autoGradeResult, setAutoGradeResult] = useState<{ score: number; feedback: string; mistakes: Array<{ original: string; corrected: string; reason: string }> } | null>(null);

  if (!currentStudent) return null;

  const group = state.groups.find((item) => item.id === currentStudent.groupId);

  useEffect(() => {
    if (!canUseApi || !token) {
      setTasks([]);
      setSpeakingTasks([]);
      return;
    }

    let disposed = false;

    const loadTasks = async () => {
      setLoading(true);
      try {
        const [hwTasks, spkTasks] = await Promise.all([
          platformApi.getStudentHomeworkTasks(token),
          platformApi.getStudentSpeakingTasks(token),
        ]);
        if (!disposed) {
          setTasks(hwTasks);
          setSpeakingTasks(spkTasks);
          if (hwTasks.length > 0 && !selectedTaskId) {
            setSelectedTaskId(hwTasks[0].id);
          }
        }
      } catch {
        if (!disposed) {
          setTasks([]);
          setSpeakingTasks([]);
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void loadTasks();
    return () => { disposed = true; };
  }, [canUseApi, token]);

  const selectedTask = useMemo(
    () => [...tasks, ...speakingTasks].find((task) => task.id === selectedTaskId) ?? null,
    [tasks, speakingTasks, selectedTaskId],
  );

  const now = Date.now();
  const pendingTasks = tasks.filter((task) => {
    if (task.mySubmission) return false;
    return true;
  });
  const overdueTasks = pendingTasks.filter((task) => {
    if (!task.dueAt) return false;
    return Date.parse(task.dueAt) < now;
  });

  async function handleSubmit() {
    if (!token || !selectedTaskId) return;
    const answer = answerText.trim();
    if (answer.length < 5) {
      showToast({ tone: "error", message: "Напишите ответ (минимум 5 символов)." });
      return;
    }

    setSubmitting(true);
    try {
      const submission = await platformApi.submitStudentHomework(token, selectedTaskId, answer);
      setTasks((prev) =>
        prev.map((task) => (task.id === selectedTaskId ? { ...task, mySubmission: submission } : task)),
      );
      setAnswerText("");
      showToast({ tone: "success", message: "Ответ отправлен." });
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAutoGrade() {
    if (!selectedTask) return;
    const answer = answerText.trim();
    if (answer.length < 5) {
      showToast({ tone: "error", message: "Напишите ответ для проверки." });
      return;
    }

    setAutoGrading(true);
    setAutoGradeResult(null);
    try {
      const questions = selectedTask.description
        .split(/\n/)
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean);
      const result = await autoGradeHomework(answer, questions, group?.title ?? "pre-intermediate");
      setAutoGradeResult(result);
    } catch {
      showToast({ tone: "error", message: "Не удалось проверить автоматически." });
    } finally {
      setAutoGrading(false);
    }
  }

  function taskStatusBadge(task: HomeworkTask) {
    if (task.mySubmission) {
      if (task.mySubmission.status === "reviewed") {
        return <Badge variant="positive">Reviewed{task.mySubmission.score !== undefined ? ` — ${task.mySubmission.score}` : ""}</Badge>;
      }
      return <Badge variant="soft">Submitted</Badge>;
    }
    if (task.dueAt && Date.parse(task.dueAt) < now) {
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/45 dark:text-red-200">Overdue</Badge>;
    }
    return <Badge variant="soft">Pending</Badge>;
  }

  const taskTypeIcon = (type?: string) => {
    if (type === "speaking") return Mic;
    return FileText;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework"
        subtitle="Submit assignments and track your progress"
        action={
          <div className="flex gap-2">
            {overdueTasks.length > 0 ? (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/45 dark:text-red-200">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {overdueTasks.length} overdue
              </Badge>
            ) : null}
            <Badge variant="soft">{pendingTasks.length} pending</Badge>
          </div>
        }
      />

      {!canUseApi ? (
        <Card>
          <CardContent className="p-6 text-sm text-charcoal/70 dark:text-zinc-300">
            Homework requires API mode. Connect to the platform to see your assignments.
          </CardContent>
        </Card>
      ) : null}

      {canUseApi && loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-burgundy-700 dark:text-white" />
        </div>
      ) : null}

      {canUseApi && !loading ? (
        <Tabs defaultValue="writing">
          <TabsList className="mb-4">
            <TabsTrigger value="writing">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Writing ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="speaking">
              <Mic className="mr-1.5 h-3.5 w-3.5" />
              Speaking ({speakingTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="writing">
            <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    No homework assigned yet.
                  </p>
                ) : (
                  tasks.map((task) => {
                    const Icon = taskTypeIcon(task.taskType);
                    const isActive = selectedTaskId === task.id;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setAutoGradeResult(null);
                        }}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                          isActive
                            ? "border-burgundy-300 bg-burgundy-50 dark:border-burgundy-700 dark:bg-burgundy-900/30"
                            : "border-burgundy-100 bg-white hover:border-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-charcoal dark:text-zinc-100">
                            <Icon className="h-3.5 w-3.5" />
                            <span className="truncate">{task.title}</span>
                          </span>
                          {taskStatusBadge(task)}
                        </div>
                        {task.dueAt ? (
                          <p className={`mt-1 text-xs ${Date.parse(task.dueAt) < now && !task.mySubmission ? "text-red-600 dark:text-red-400" : "text-charcoal/60 dark:text-zinc-400"}`}>
                            <Clock3 className="mr-1 inline h-3 w-3" />
                            {new Date(task.dueAt).toLocaleString()}
                          </p>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>

              <div>
                {!selectedTask ? (
                  <Card>
                    <CardContent className="p-6 text-sm text-charcoal/70 dark:text-zinc-300">
                      Select a task to view details and submit your answer.
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      <div>
                        <h3 className="text-lg font-semibold text-charcoal dark:text-zinc-100">{selectedTask.title}</h3>
                        {selectedTask.dueAt ? (
                          <p className={`mt-1 text-sm ${Date.parse(selectedTask.dueAt) < now && !selectedTask.mySubmission ? "text-red-600 dark:text-red-400 font-semibold" : "text-charcoal/60 dark:text-zinc-400"}`}>
                            Deadline: {new Date(selectedTask.dueAt).toLocaleString()}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-xl border border-burgundy-100 bg-white p-3 text-sm text-charcoal/80 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {selectedTask.description}
                      </div>

                      {selectedTask.mySubmission ? (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-900/20">
                            <p className="inline-flex items-center gap-2 text-sm font-semibold text-green-800 dark:text-green-200">
                              <CheckCircle2 className="h-4 w-4" />
                              Submitted on {new Date(selectedTask.mySubmission.createdAt).toLocaleString()}
                            </p>
                            <p className="mt-2 text-sm text-charcoal/80 dark:text-zinc-300">{selectedTask.mySubmission.answerText}</p>
                          </div>

                          {selectedTask.mySubmission.status === "reviewed" ? (
                            <div className="rounded-xl border border-burgundy-200 bg-burgundy-50 p-3 dark:border-burgundy-800 dark:bg-burgundy-900/30">
                              {selectedTask.mySubmission.score !== undefined ? (
                                <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">Score: {selectedTask.mySubmission.score}</p>
                              ) : null}
                              {selectedTask.mySubmission.teacherComment ? (
                                <p className="mt-1 text-sm text-charcoal/70 dark:text-zinc-300">{selectedTask.mySubmission.teacherComment}</p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-sm text-charcoal/60 dark:text-zinc-400">Waiting for teacher review...</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Your Answer</label>
                            <textarea
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              rows={8}
                              className="w-full resize-y rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-base text-charcoal outline-none transition focus:border-burgundy-300 focus:ring-2 focus:ring-burgundy-100 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-burgundy-700 dark:focus:ring-burgundy-900/40"
                              placeholder="Write your answer here..."
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => void handleSubmit()} disabled={submitting || answerText.trim().length < 5}>
                              {submitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 h-4 w-4" />
                                  Submit
                                </>
                              )}
                            </Button>
                            <Button variant="secondary" onClick={() => void handleAutoGrade()} disabled={autoGrading || answerText.trim().length < 5}>
                              {autoGrading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Checking...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  Auto-Check
                                </>
                              )}
                            </Button>
                          </div>

                          {autoGradeResult ? (
                            <div className="rounded-xl border border-burgundy-200 bg-burgundy-50 p-3 dark:border-burgundy-800 dark:bg-burgundy-900/30">
                              <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">
                                AI Score: {autoGradeResult.score}/100
                              </p>
                              <p className="mt-1 text-sm text-charcoal/70 dark:text-zinc-300">{autoGradeResult.feedback}</p>
                              {autoGradeResult.mistakes.length > 0 ? (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">Mistakes:</p>
                                  {autoGradeResult.mistakes.map((m, i) => (
                                    <p key={i} className="text-sm text-charcoal/80 dark:text-zinc-300">
                                      <span className="text-red-600 dark:text-red-400 line-through">{m.original}</span>
                                      {" → "}
                                      <span className="text-green-700 dark:text-green-400">{m.corrected}</span>
                                      <span className="text-charcoal/50 dark:text-zinc-500"> ({m.reason})</span>
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="speaking">
            {speakingTasks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-charcoal/70 dark:text-zinc-300">
                  No speaking tasks assigned yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {speakingTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 font-semibold text-charcoal dark:text-zinc-100">
                          <Mic className="h-4 w-4 text-burgundy-700 dark:text-white" />
                          {task.speakingTopic || task.title}
                        </span>
                        {taskStatusBadge(task)}
                      </div>
                      {task.dueAt ? (
                        <p className="mt-1 text-xs text-charcoal/60 dark:text-zinc-400">
                          Deadline: {new Date(task.dueAt).toLocaleString()}
                        </p>
                      ) : null}
                      {task.speakingQuestions && task.speakingQuestions.length > 0 ? (
                        <div className="mt-3 space-y-1">
                          {task.speakingQuestions.map((q, i) => (
                            <p key={i} className="text-sm text-charcoal/80 dark:text-zinc-300">
                              {i + 1}. {q}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3">
                        <Link to="/student/speaking">
                          <Button size="sm" variant="secondary">
                            Go to Speaking Practice
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
