import { CalendarDays, Clock3, Send, Sparkles, Users, Search, GraduationCap } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";

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
  const { state, currentStudent, applyAiScore } = useAppStore();
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
    () => state.students.filter((s) => s.groupId === currentStudent.groupId && s.id !== currentStudent.id).sort((a, b) => b.points - a.points),
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
      
      // AI automated scoring
      if (normalized.score >= 70) {
        const points = normalized.score / 10;
        await applyAiScore(points);
        showToast({ tone: "success", message: `AI evaluated your work! +${points.toFixed(1)} points.` });
      }
    } catch {
      setAiErrors((prev) => ({ ...prev, [task.id]: t("homework.aiUnavailable") }));
    } finally {
      setAiCheckingTaskId(null);
    }
  }

  const overviewSection = (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-burgundy-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <CardContent className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/40 dark:text-zinc-500">{t("auth.group")}</p>
            <div className="mt-2 flex items-center gap-3">
               <div className="rounded-xl bg-burgundy-50 p-2 dark:bg-burgundy-900/30">
                  <GraduationCap className="h-5 w-5 text-burgundy-700 dark:text-burgundy-200" />
               </div>
               <p className="text-lg font-bold text-charcoal dark:text-zinc-100">{group?.title ?? t("student.noGroup")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-burgundy-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <CardContent className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/40 dark:text-zinc-500">{t("auth.time")}</p>
            <div className="mt-2 flex items-center gap-3">
               <div className="rounded-xl bg-burgundy-50 p-2 dark:bg-burgundy-900/30">
                  <Clock3 className="h-5 w-5 text-burgundy-700 dark:text-burgundy-200" />
               </div>
               <p className="text-lg font-bold text-charcoal dark:text-zinc-100">{group?.time ?? "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-burgundy-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <CardContent className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/40 dark:text-zinc-500">{t("auth.days")}</p>
            <div className="mt-2 flex items-center gap-3">
               <div className="rounded-xl bg-burgundy-50 p-2 dark:bg-burgundy-900/30">
                  <CalendarDays className="h-5 w-5 text-burgundy-700 dark:text-burgundy-200" />
               </div>
               <p className="text-lg font-bold text-charcoal dark:text-zinc-100">{daysLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-burgundy-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <CardContent className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/40 dark:text-zinc-500">{t("student.placeInGroup")}</p>
            <div className="mt-2 flex items-center gap-3">
               <div className="rounded-xl bg-burgundy-50 p-2 dark:bg-burgundy-900/30">
                  <Users className="h-5 w-5 text-burgundy-700 dark:text-burgundy-200" />
               </div>
               <p className="text-lg font-bold text-burgundy-700 dark:text-burgundy-200">#{groupPlace > 0 ? groupPlace : "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-bold text-charcoal dark:text-white">Our Class</h3>
           <Badge variant="soft" className="rounded-lg">{classmates.length} classmates</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
           <AnimatePresence>
             {classmates.map((student, idx) => (
               <motion.div
                 key={student.id}
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: idx * 0.03 }}
               >
                 <Card className="group relative overflow-hidden border-burgundy-100/50 bg-white transition-all hover:border-burgundy-200 hover:shadow-xl hover:shadow-burgundy-900/5 dark:border-zinc-800/50 dark:bg-zinc-900">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                       <UserAvatar fullName={student.fullName} avatarUrl={student.avatarUrl} size="lg" className="ring-4 ring-burgundy-50 transition-transform group-hover:scale-105 dark:ring-zinc-800" />
                       <p className="mt-4 truncate w-full text-sm font-bold text-charcoal dark:text-zinc-100">{student.fullName}</p>
                       <div className="mt-2 flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-burgundy-500 animate-pulse" />
                          <p className="text-xs font-bold text-burgundy-700 dark:text-burgundy-200">{student.points.toFixed(1)} XP</p>
                       </div>
                    </CardContent>
                 </Card>
               </motion.div>
             ))}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );

  const homeworkSection = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-charcoal dark:text-white">Homework</h3>
        <Badge variant="soft" className="rounded-lg">{groupHomework.length} tasks</Badge>
      </div>

      {!canUseApi ? (
        <Card className="border-burgundy-100 bg-burgundy-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
          <CardContent className="p-6 text-sm text-center text-charcoal/50 dark:text-zinc-400">
            Homework practice is available in API mode.
          </CardContent>
        </Card>
      ) : loadingHomework ? (
        <div className="flex items-center justify-center py-20">
           <Loader2 className="h-8 w-8 animate-spin text-burgundy-700" />
        </div>
      ) : groupHomework.length === 0 ? (
        <p className="text-center py-10 text-sm text-charcoal/50 dark:text-zinc-500">No tasks from teacher yet.</p>
      ) : (
        <div className="space-y-4">
          {groupHomework.map((task) => {
            const fieldValue = answers[task.id] ?? task.mySubmission?.answerText ?? "";
            const aiMode = aiModes[task.id] ?? "friendly";
            const aiReview = aiReviews[task.id];
            const aiError = aiErrors[task.id];
            const checkingNow = aiCheckingTaskId === task.id;

            return (
              <Card key={task.id} className="border-burgundy-100/50 bg-white overflow-hidden dark:border-zinc-800/50 dark:bg-zinc-900">
                <CardContent className="p-0">
                   <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-charcoal dark:text-white">{task.title}</h4>
                          {task.dueAt && (
                            <p className="text-xs text-charcoal/40 dark:text-zinc-500 mt-1">
                              Deadline: {new Date(task.dueAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {task.mySubmission && (
                           <Badge variant={task.mySubmission.status === "reviewed" ? "positive" : "default"} className="h-7">
                              {task.mySubmission.status === "reviewed" ? "Checked" : "Pending"}
                           </Badge>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-sm text-charcoal/60 leading-relaxed dark:text-zinc-400">
                          {task.description}
                        </p>
                      )}

                      <div className="space-y-4 pt-2">
                        <textarea
                          value={fieldValue}
                          onChange={(event) => setAnswers((prev) => ({ ...prev, [task.id]: event.target.value }))}
                          rows={4}
                          className="w-full resize-none rounded-2xl border border-burgundy-100 bg-burgundy-50/30 p-4 text-sm outline-none transition focus:ring-2 focus:ring-burgundy-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:focus:ring-zinc-700"
                          placeholder="Your answer here..."
                        />

                        <div className="flex flex-wrap items-center gap-3">
                          <Select
                            value={aiMode}
                            onValueChange={(value) => setAiModes((prev) => ({ ...prev, [task.id]: value as any }))}
                          >
                            <SelectTrigger className="w-[180px] rounded-xl border-burgundy-100 dark:border-zinc-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="friendly" className="rounded-lg">Friendly Coach</SelectItem>
                              <SelectItem value="strict" className="rounded-lg">IELTS Examiner</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="secondary"
                            onClick={() => void handleAiCheck(task)}
                            disabled={checkingNow || !fieldValue.trim()}
                            className="rounded-xl"
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {checkingNow ? "Analyzing..." : "AI Review"}
                          </Button>

                          <Button
                            onClick={() => void handleSubmitHomework(task.id)}
                            disabled={submittingTaskId === task.id || !fieldValue.trim()}
                            className="rounded-xl ml-auto"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {task.mySubmission ? "Update" : "Submit"}
                          </Button>
                        </div>
                      </div>

                      {aiError && (
                         <div className="rounded-xl bg-burgundy-50 p-4 text-xs font-medium text-burgundy-700 dark:bg-burgundy-900/20 dark:text-burgundy-200">
                            {aiError}
                         </div>
                      )}

                      {aiReview && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 rounded-2xl border border-burgundy-100 bg-white p-5 shadow-inner dark:border-zinc-800 dark:bg-zinc-950"
                        >
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <Sparkles className="h-4 w-4 text-burgundy-700 dark:text-burgundy-200" />
                                 <p className="text-sm font-bold text-charcoal dark:text-white">AI Verdict</p>
                              </div>
                              <p className="text-lg font-black text-burgundy-700 dark:text-burgundy-200">{aiReview.score}/100</p>
                           </div>

                           {aiReview.summary && (
                             <p className="text-sm italic text-charcoal/70 dark:text-zinc-400">"{aiReview.summary}"</p>
                           )}

                           {aiReview.issues.length > 0 && (
                             <div className="space-y-3 pt-2">
                               {aiReview.issues.map((issue, idx) => (
                                 <div key={idx} className="rounded-xl bg-burgundy-50/50 p-3 text-xs dark:bg-zinc-900/50">
                                    <p className="font-bold text-burgundy-700 dark:text-burgundy-200">Original: {issue.original}</p>
                                    <p className="mt-1 text-charcoal/60 dark:text-zinc-400">Correction: {issue.fix}</p>
                                 </div>
                               ))}
                             </div>
                           )}
                        </motion.div>
                      )}
                   </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={t("tabs.group")}
        subtitle={t("student.groupSubtitle")}
        action={<Badge variant="soft" className="h-8 rounded-lg">{group?.title ?? t("student.noGroup")}</Badge>}
      />

      <div className="lg:hidden">
        <Tabs value={mobileSection} onValueChange={(value) => setMobileSection(value as any)}>
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-burgundy-50 p-1 dark:bg-zinc-800">
            <TabsTrigger className="rounded-xl text-sm font-bold" value="overview">Group</TabsTrigger>
            <TabsTrigger className="rounded-xl text-sm font-bold" value="homework">Homework</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">{overviewSection}</TabsContent>
          <TabsContent value="homework" className="mt-6">{homeworkSection}</TabsContent>
        </Tabs>
      </div>

      <div className="hidden space-y-12 lg:block">
        {overviewSection}
        <div className="h-px bg-burgundy-100/50 dark:bg-zinc-800/50" />
        {homeworkSection}
      </div>
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    className={className}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  </motion.div>
);
