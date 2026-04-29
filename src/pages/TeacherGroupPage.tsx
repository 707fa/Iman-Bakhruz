import { BookOpenCheck, ChevronLeft, Clock3, Crown, Loader2, Mic, Sparkles, UserX, Search, GraduationCap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
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
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../components/ui/select";

const PREDEFINED_LEVELS = [
  "Beginner",
  "Elementary",
  "Pre-Intermediate",
  "Intermediate",
  "Upper-Intermediate",
  "Advanced",
  "IELTS 5.5",
  "IELTS 6.0",
  "IELTS 6.5",
  "IELTS 7.0+",
  "CEFR B1",
  "CEFR B2",
  "Kids Level 1",
  "Kids Level 2",
];

interface ReviewDraft {
  teacherComment: string;
  score: string;
  status: "submitted" | "reviewed";
}

function crownClass(rank: number): string {
  if (rank === 1) return "text-amber-500 shadow-amber-500/20";
  if (rank === 2) return "text-slate-400 shadow-slate-400/20";
  if (rank === 3) return "text-orange-500 shadow-orange-500/20";
  return "text-charcoal/50 dark:text-zinc-400";
}

export function TeacherGroupPage() {
  const { id } = useParams();
  const { state, currentTeacher, disableStudent, renameGroup } = useAppStore();
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

  const [renamingGroup, setRenamingGroup] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);

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

  async function handleRename(nextTitle: string) {
    if (!group || renamingGroup) return;
    setRenamingGroup(true);
    try {
      const result = await renameGroup(group.id, nextTitle);
      showToast({
        tone: result.ok ? "success" : "error",
        message: t(result.messageKey, result.messageParams),
      });
    } finally {
      setRenamingGroup(false);
    }
  }

  async function handleDisableStudent(studentId: string) {
    if (!window.confirm(t("teacher.disableConfirm"))) return;

    setDeletingStudentId(studentId);
    try {
      const result = await disableStudent(studentId);
      showToast({
        message: t(result.messageKey, result.messageParams),
        tone: result.ok ? "success" : "error",
      });
    } finally {
      setDeletingStudentId(null);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <Link to="/teacher/groups">
          <Button variant="ghost" size="sm" className="h-10 rounded-xl px-2 hover:bg-burgundy-50 dark:hover:bg-zinc-800">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <PageHeader
          title={group ? t("teacher.groupTitle", { title: group.title }) : t("teacher.groupNotFound")}
          subtitle={group ? `${t("teacher.time", { time: group.time })} • ${daysLabel}` : t("teacher.checkRoute")}
          className="flex-1"
        />
      </div>

      {group && !hasAccess ? (
        <Card className="border-burgundy-100 bg-burgundy-50 dark:border-zinc-800 dark:bg-zinc-900/50">
          <CardContent className="p-6 text-sm text-burgundy-700 dark:text-burgundy-200">{t("teacher.noAccessGroup")}</CardContent>
        </Card>
      ) : null}

      {hasAccess && group && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <Card className="border-burgundy-100/50 bg-white/70 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-900/70">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                  <div className="flex flex-1 items-center gap-3">
                     <div className="rounded-xl bg-burgundy-50 p-2.5 dark:bg-burgundy-900/30">
                        <GraduationCap className="h-5 w-5 text-burgundy-700 dark:text-burgundy-200" />
                     </div>
                     <div className="flex-1">
                        <p className="text-xs font-medium text-charcoal/40 dark:text-zinc-500">{t("teacher.renameGroupLabel")}</p>
                        <Select onValueChange={handleRename} disabled={renamingGroup}>
                          <SelectTrigger className="mt-0.5 h-auto border-none bg-transparent p-0 text-base font-bold shadow-none ring-0 focus:ring-0 dark:bg-transparent">
                            {group.title}
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-burgundy-100 dark:border-zinc-800">
                            {PREDEFINED_LEVELS.map((level) => (
                              <SelectItem key={level} value={level} className="rounded-lg">
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3 border-l border-burgundy-100/50 pl-4 dark:border-zinc-800/50">
                    <Search className="h-4 w-4 text-charcoal/30 dark:text-zinc-500" />
                    <Input
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      placeholder={t("search.studentByName")}
                      className="h-9 border-none bg-transparent p-0 text-sm shadow-none ring-0 focus:ring-0 dark:bg-transparent"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {filteredStudents.map((student, idx) => (
                    <motion.div
                      key={student.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="group border-burgundy-100/50 bg-white transition-all hover:border-burgundy-200 hover:shadow-lg hover:shadow-burgundy-900/5 dark:border-zinc-800/50 dark:bg-zinc-900">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar fullName={student.fullName} avatarUrl={student.avatarUrl} size="md" />
                              <div className="min-w-0">
                                <p className="truncate text-base font-bold text-charcoal dark:text-zinc-100">{student.fullName}</p>
                                <p className="truncate text-xs text-charcoal/40 dark:text-zinc-500">{student.phone}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                               <Badge variant="soft" className="h-7 rounded-lg bg-burgundy-50 px-2 text-sm font-bold text-burgundy-700 dark:bg-burgundy-900/30 dark:text-burgundy-200">
                                 {student.points.toFixed(1)}
                               </Badge>
                               <StatusBadge status={student.statusBadge} />
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-burgundy-100/50 pt-3 dark:border-zinc-800/50">
                            <Link
                              to={`/teacher/student/${student.id}`}
                              className="text-xs font-bold uppercase tracking-wider text-burgundy-700 transition hover:text-burgundy-600 dark:text-burgundy-200"
                            >
                              {t("menu.profile")}
                            </Link>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDisableStudent(student.id)}
                              disabled={deletingStudentId === student.id}
                              className="h-8 w-8 rounded-lg text-burgundy-700/40 transition hover:bg-burgundy-50 hover:text-burgundy-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                            >
                              {deletingStudentId === student.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-4 w-4" />}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-burgundy-200 bg-white/30 py-10 dark:border-zinc-800 dark:bg-zinc-950/30 sm:col-span-2">
                    <p className="text-sm text-charcoal/50 dark:text-zinc-400">{t("ui.noData")}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <Card className="border-burgundy-100/50 bg-white/70 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-900/70">
                <CardContent className="p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-charcoal dark:text-white">
                    <Sparkles className="h-5 w-5 text-burgundy-700 dark:text-burgundy-200" />
                    {t("teacher.groupTopTitle")}
                  </h3>
                  <div className="space-y-3">
                    {filteredTop.map((item, index) => (
                      <motion.div
                        key={item.studentId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between rounded-2xl border border-burgundy-100/50 bg-white/50 p-3.5 dark:border-zinc-800/50 dark:bg-zinc-950/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center">
                            {index < 3 ? (
                              <Crown className={`h-5 w-5 fill-current ${crownClass(index + 1)}`} />
                            ) : (
                              <span className="text-xs font-bold text-charcoal/30 dark:text-zinc-600">#{index + 1}</span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-charcoal dark:text-zinc-200">{item.fullName}</span>
                        </div>
                        <span className="text-sm font-bold text-burgundy-700 dark:text-burgundy-200">{item.points.toFixed(1)}</span>
                      </motion.div>
                    ))}
                    {filteredTop.length === 0 ? (
                      <p className="text-center text-sm text-charcoal/50 dark:text-zinc-500 py-4">
                        {t("ui.noData")}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {/* Speaking Tasks Section */}
              <Card className="border-burgundy-100/50 bg-white/70 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-900/70">
                <CardContent className="p-5 space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-charcoal dark:text-white">
                    <Mic className="h-5 w-5 text-burgundy-700 dark:text-burgundy-200" />
                    Speaking
                  </h3>

                  <div className="space-y-3">
                    <Input
                      value={speakingTitle}
                      onChange={(event) => setSpeakingTitle(event.target.value)}
                      placeholder="Title (e.g. Unit 3 Discussion)"
                      className="rounded-xl border-burgundy-100 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/50"
                    />
                    <textarea
                      value={speakingQuestionsText}
                      onChange={(event) => setSpeakingQuestionsText(event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-burgundy-100 bg-white/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-burgundy-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:focus:ring-zinc-700"
                      placeholder="Questions (one per line)..."
                    />
                    <Button 
                      className="w-full rounded-xl bg-burgundy-700 hover:bg-burgundy-800 dark:bg-white dark:text-burgundy-900"
                      onClick={() => void handleCreateSpeakingTask()} 
                      disabled={creatingSpeaking || speakingTitle.trim().length < 3}
                    >
                      {creatingSpeaking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Homework Section */}
          <Card className="border-burgundy-100/50 bg-white/70 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-900/70">
            <CardContent className="p-5 sm:p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-charcoal dark:text-white">Homework Submissions</h3>
                <Badge variant="soft" className="rounded-lg">{homeworkTasks.length} tasks</Badge>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
                <div className="space-y-2">
                  {homeworkTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        selectedTaskId === task.id
                          ? "border-burgundy-200 bg-burgundy-50 shadow-sm dark:border-burgundy-800 dark:bg-burgundy-900/20"
                          : "border-burgundy-100/50 bg-white/50 hover:bg-white dark:border-zinc-800/50 dark:bg-zinc-950/50"
                      }`}
                    >
                      <p className="font-bold text-charcoal dark:text-zinc-100">{task.title}</p>
                      <p className="mt-1 text-xs text-charcoal/40 dark:text-zinc-500">
                        {task.dueAt ? `Due: ${new Date(task.dueAt).toLocaleDateString()}` : "No deadline"}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {loadingSubmissions ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-burgundy-700" />
                    </div>
                  ) : selectedTask ? (
                    <div className="space-y-4">
                      {taskSubmissions.map((submission) => {
                        const draft = reviewDrafts[submission.id] ?? { teacherComment: "", score: "", status: "submitted" };
                        return (
                          <div key={submission.id} className="rounded-2xl border border-burgundy-100/50 bg-white p-5 dark:border-zinc-800/50 dark:bg-zinc-900">
                            <div className="flex items-center justify-between gap-4 mb-4">
                              <p className="font-bold text-charcoal dark:text-white">{submission.studentName}</p>
                              <Badge variant={submission.status === "reviewed" ? "positive" : "default"}>
                                {submission.status === "reviewed" ? "Reviewed" : "Pending"}
                              </Badge>
                            </div>
                            <p className="mb-4 rounded-xl bg-burgundy-50/50 p-4 text-sm text-charcoal/80 dark:bg-zinc-950 dark:text-zinc-300">
                              {submission.answerText}
                            </p>
                            
                            <div className="grid gap-3 sm:grid-cols-[1fr_100px_140px_auto]">
                              <Input
                                value={draft.teacherComment}
                                onChange={(e) => setReviewDrafts(p => ({...p, [submission.id]: {...draft, teacherComment: e.target.value}}))}
                                placeholder="Comment"
                                className="rounded-xl"
                              />
                              <Input
                                value={draft.score}
                                onChange={(e) => setReviewDrafts(p => ({...p, [submission.id]: {...draft, score: e.target.value}}))}
                                placeholder="Score"
                                className="rounded-xl"
                              />
                              <select
                                value={draft.status}
                                onChange={(e) => setReviewDrafts(p => ({...p, [submission.id]: {...draft, status: e.target.value as any}}))}
                                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                              >
                                <option value="submitted">Pending</option>
                                <option value="reviewed">Reviewed</option>
                              </select>
                              <Button 
                                onClick={() => void handleSaveReview(submission.id)}
                                disabled={savingSubmissionId === submission.id}
                                className="rounded-xl"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {taskSubmissions.length === 0 && (
                        <p className="text-center py-10 text-sm text-charcoal/50 dark:text-zinc-500">No submissions yet.</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-burgundy-200 bg-white/30 py-20 dark:border-zinc-800 dark:bg-zinc-950/30">
                      <p className="text-sm text-charcoal/50 dark:text-zinc-400">Select a task to view submissions</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
