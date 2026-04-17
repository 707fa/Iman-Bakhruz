import {
  Bell,
  BookOpenCheck,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Languages,
  Mic,
  RefreshCw,
  Sparkles,
  Trophy,
  Volume2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { getSpeakingQuestionsForLevel } from "../data/speakingQuestions";
import {
  appendSpeakingAttempt,
  chooseNextDailyQuestion,
  ensureWeeklyQuestionSet,
  getDailyRemainingCount,
  getWeakMistakes,
  getWeeklyCurrentQuestion,
  getWeeklyRemainingCount,
  markReminderShown,
  markWeeklyExamStarted,
  readSpeakingSnapshot,
  resetWeeklyExam,
  writeSpeakingSnapshot,
} from "../lib/speakingSession";
import { normalizeStudentLevelFromGroupTitle, resolveAiFeedbackLanguage } from "../lib/studentLevel";
import type { HomeworkTask, SpeakingAnalysisResult, SpeakingQuestion, SpeakingSessionSnapshot } from "../types";
import { checkSpeakingAnswer, mapSpeakingApiErrorToMessage } from "../services/api/speakingApi";
import { getApiToken } from "../services/tokenStorage";
import { platformApi } from "../services/api/platformApi";

type SpeakingMode = "daily" | "weekly_exam";
type SpeakingStatus = "idle" | "listening" | "processing" | "success" | "error";

const DAILY_TARGET = 20;
const WEEKLY_TARGET = 10;
const MIN_WORDS = 4;
const MIN_SECONDS = 3;
const SATURDAY = 6;

function wordsCount(text: string): number {
  return text
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function toClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function averageScore(items: number[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((acc, value) => acc + value, 0);
  return Math.round(total / items.length);
}

function normalizeTeacherSpeakingQuestions(tasks: HomeworkTask[], level: SpeakingQuestion["level"]): SpeakingQuestion[] {
  const result: SpeakingQuestion[] = [];
  for (const task of tasks) {
    const topic = task.speakingTopic || task.title;
    const list = Array.isArray(task.speakingQuestions) ? task.speakingQuestions : [];
    list.forEach((prompt, index) => {
      const text = String(prompt || "").trim();
      if (!text) return;
      result.push({
        id: `t-${task.id}-${index + 1}`,
        level,
        topic,
        prompt: text,
      });
    });
  }
  return result;
}

function buildMergedQuestionPool(teacherQuestions: SpeakingQuestion[], levelQuestions: SpeakingQuestion[]): SpeakingQuestion[] {
  const merged: SpeakingQuestion[] = [];
  const seen = new Set<string>();
  const source = [...teacherQuestions, ...levelQuestions];

  for (const item of source) {
    const promptKey = item.prompt.trim().toLowerCase();
    if (!promptKey || seen.has(promptKey)) continue;
    seen.add(promptKey);
    merged.push(item);
  }

  return merged;
}

function chooseTeacherDailyQuestion(
  teacherQuestions: SpeakingQuestion[],
  snapshot: SpeakingSessionSnapshot,
): SpeakingQuestion | null {
  if (teacherQuestions.length === 0) return null;

  const completed = new Set(snapshot.daily.completedQuestionIds);
  const remaining = teacherQuestions.filter((item) => !completed.has(item.id));
  if (remaining.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * remaining.length);
  return remaining[randomIndex] ?? remaining[0] ?? null;
}

export function StudentSpeakingPage() {
  const { state, currentStudent } = useAppStore();
  const { t, locale } = useUi();
  const { showToast } = useToast();

  const token = getApiToken();
  const userId = currentStudent?.id ?? "";
  const currentGroup = currentStudent ? state.groups.find((item) => item.id === currentStudent.groupId) : null;
  const level = normalizeStudentLevelFromGroupTitle(currentGroup?.title);
  const language = resolveAiFeedbackLanguage(level, locale);
  const levelQuestions = useMemo(() => getSpeakingQuestionsForLevel(level), [level]);

  const [teacherSpeakingTasks, setTeacherSpeakingTasks] = useState<HomeworkTask[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const teacherQuestions = useMemo(() => normalizeTeacherSpeakingQuestions(teacherSpeakingTasks, level), [teacherSpeakingTasks, level]);
  const questionPool = useMemo(() => buildMergedQuestionPool(teacherQuestions, levelQuestions), [teacherQuestions, levelQuestions]);
  const seedKey = `${userId}:${currentGroup?.id || "group"}:${level}`;

  const [snapshot, setSnapshot] = useState<SpeakingSessionSnapshot>(() =>
    userId ? readSpeakingSnapshot(userId) : readSpeakingSnapshot("guest"),
  );
  const [question, setQuestion] = useState<SpeakingQuestion | null>(null);
  const [status, setStatus] = useState<SpeakingStatus>("idle");
  const [result, setResult] = useState<SpeakingAnalysisResult | null>(null);
  const [manualTranscript, setManualTranscript] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [, setErrorMessage] = useState<string | null>(null);
  const [showExamPrompt, setShowExamPrompt] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted",
  );

  const speech = useSpeechRecognition({ lang: "en-US" });

  useEffect(() => {
    if (!token || !currentStudent || !currentGroup) {
      setTeacherSpeakingTasks([]);
      return;
    }

    let disposed = false;
    setTaskLoading(true);
    setTaskError(null);

    void platformApi
      .getStudentSpeakingTasks(token)
      .then((tasks) => {
        if (disposed) return;
        setTeacherSpeakingTasks(tasks.filter((task) => task.groupId === currentGroup.id));
      })
      .catch(() => {
        if (disposed) return;
        setTeacherSpeakingTasks([]);
        setTaskError("Teacher speaking tasks are temporarily unavailable.");
      })
      .finally(() => {
        if (!disposed) setTaskLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [token, currentStudent, currentGroup?.id]);

  useEffect(() => {
    const key = userId || "guest";
    const current = readSpeakingSnapshot(key);
    const withWeekly = ensureWeeklyQuestionSet(current, questionPool, WEEKLY_TARGET, seedKey);
    setSnapshot(withWeekly);
    setResult(null);
    setErrorMessage(null);
  }, [userId, seedKey, questionPool]);

  useEffect(() => {
    if (!userId) return;
    writeSpeakingSnapshot(userId, snapshot);
  }, [snapshot, userId]);

  const today = new Date();
  const isSaturday = today.getDay() === SATURDAY;
  const effectiveDailyTarget = Math.min(DAILY_TARGET, Math.max(1, questionPool.length));
  const dailyRemaining = getDailyRemainingCount(snapshot, effectiveDailyTarget);
  const weeklyRemaining = getWeeklyRemainingCount(snapshot, WEEKLY_TARGET);
  const examUnlocked = isSaturday && dailyRemaining <= 0;
  const weeklyExamActive = examUnlocked && Boolean(snapshot.weeklyExam.started) && weeklyRemaining > 0;
  const mode: SpeakingMode = weeklyExamActive ? "weekly_exam" : "daily";

  useEffect(() => {
    const fallbackQuestion = questionPool[0] ?? null;

    if (mode === "weekly_exam") {
      const withWeekly = ensureWeeklyQuestionSet(snapshot, questionPool, WEEKLY_TARGET, seedKey);
      if (withWeekly !== snapshot) {
        setSnapshot(withWeekly);
      }
      const weeklyQuestion = getWeeklyCurrentQuestion(questionPool, withWeekly);
      setQuestion(weeklyQuestion ?? fallbackQuestion);
      return;
    }

    const teacherPriorityQuestion = chooseTeacherDailyQuestion(teacherQuestions, snapshot);
    if (teacherPriorityQuestion) {
      setQuestion(teacherPriorityQuestion);
      return;
    }

    const nextQuestion = chooseNextDailyQuestion(questionPool, snapshot);
    setQuestion(nextQuestion ?? fallbackQuestion);
  }, [mode, snapshot, questionPool, seedKey, teacherQuestions]);

  useEffect(() => {
    if (!speech.listening) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [speech.listening]);

  useEffect(() => {
    if (!speech.transcript) return;
    setManualTranscript(speech.transcript);
  }, [speech.transcript]);

  useEffect(() => {
    if (speech.listening) {
      setStatus("listening");
    } else if (status === "listening") {
      setStatus("idle");
    }
  }, [speech.listening, status]);

  useEffect(() => {
    if (!speech.error) return;
    setStatus("idle");
    if (speech.error.toLowerCase().includes("permission denied")) {
      setErrorMessage(t("speaking.error.microphoneDenied"));
      showToast({ message: t("speaking.error.microphoneDenied"), tone: "error" });
      return;
    }
    setErrorMessage(speech.error);
    showToast({ message: speech.error, tone: "error" });
  }, [showToast, speech.error, t]);

  useEffect(() => {
    if (!examUnlocked || weeklyRemaining <= 0) {
      setShowExamPrompt(false);
      return;
    }

    if (snapshot.weeklyExam.started) {
      setShowExamPrompt(false);
      return;
    }

    setShowExamPrompt(true);
  }, [examUnlocked, weeklyRemaining, snapshot.weeklyExam.started]);

  const latestAttempts = snapshot.attempts.slice(0, 6);
  const statusLabel = t(`speaking.status.${status}`);
  const recentAverage = averageScore(latestAttempts.map((item) => item.score));
  const weakMistakes = getWeakMistakes(snapshot, level, 5);
  const weeklyAttempts = snapshot.attempts.filter((item) => item.mode === "weekly_exam");
  const weeklyAverage = averageScore(weeklyAttempts.slice(0, WEEKLY_TARGET).map((item) => item.score));
  const topicProgress = useMemo(() => {
    return teacherSpeakingTasks.map((task) => {
      const topic = (task.speakingTopic || task.title || "").trim() || "Topic";
      const attempts = snapshot.attempts.filter((item) => String(item.topic || "").trim() === topic).length;
      return { topic, attempts };
    });
  }, [teacherSpeakingTasks, snapshot.attempts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      if (snapshot.daily.reminderShownDateKey === snapshot.daily.dateKey) return;
      if (dailyRemaining <= 0 || dailyRemaining > Math.min(7, effectiveDailyTarget)) return;

      try {
        new Notification("Iman Speaking Reminder", {
        body: `Today you still have ${dailyRemaining} of ${effectiveDailyTarget} speaking tasks left.`,
      });
      setSnapshot((prev) => markReminderShown(prev));
      } catch {
        // ignored
      }
  }, [dailyRemaining, snapshot.daily.dateKey, snapshot.daily.reminderShownDateKey, effectiveDailyTarget]);

  function askNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    void Notification.requestPermission().then((permission) => {
      const granted = permission === "granted";
      setNotificationEnabled(granted);
      if (!granted) {
        setErrorMessage("Notifications were not enabled. You can still use in-app reminders.");
        showToast({ message: "Notifications were not enabled. You can still use in-app reminders.", tone: "info" });
      }
    });
  }

  function listenQuestion() {
    if (!question) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setErrorMessage(t("speaking.listenUnavailable"));
      showToast({ message: t("speaking.listenUnavailable"), tone: "error" });
      return;
    }
    const utterance = new SpeechSynthesisUtterance(question.prompt);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function startRecording() {
    setErrorMessage(null);
    setStatus("idle");
    setRecordingSeconds(0);
    setResult(null);
    speech.reset();
    setManualTranscript("");

    if (!speech.supported) {
      setStatus("idle");
      setErrorMessage(t("speaking.error.unavailable"));
      showToast({ message: t("speaking.error.unavailable"), tone: "error" });
      return;
    }

    const started = speech.start();
    if (!started) {
      setStatus("error");
      return;
    }

    setStatus("listening");
  }

  function stopRecording() {
    speech.stop();
  }

  function resetAttempt() {
    speech.reset();
    setStatus("idle");
    setErrorMessage(null);
    setResult(null);
    setRecordingSeconds(0);
    setManualTranscript("");
  }

  function startWeeklyExam() {
    setSnapshot((prev) => {
      const withSet = ensureWeeklyQuestionSet(prev, questionPool, WEEKLY_TARGET, seedKey);
      return markWeeklyExamStarted(withSet);
    });
    setShowExamPrompt(false);
    resetAttempt();
  }

  function moveToNextQuestion() {
    resetAttempt();
    if (mode === "weekly_exam") {
      const withWeekly = ensureWeeklyQuestionSet(snapshot, questionPool, WEEKLY_TARGET, seedKey);
      const nextWeeklyQuestion = getWeeklyCurrentQuestion(questionPool, withWeekly);
      setQuestion(nextWeeklyQuestion ?? questionPool[0] ?? null);
      return;
    }

    const teacherPriorityQuestion = chooseTeacherDailyQuestion(teacherQuestions, snapshot);
    if (teacherPriorityQuestion) {
      setQuestion(teacherPriorityQuestion);
      return;
    }

    const nextDailyQuestion = chooseNextDailyQuestion(questionPool, snapshot);
    setQuestion(nextDailyQuestion ?? questionPool[0] ?? null);
  }

  async function analyzeAnswer() {
    if (!question) return;
    if (status === "processing") return;

    const transcript = manualTranscript.trim();
    if (!transcript) {
      setStatus("idle");
      const message = t("speaking.error.emptyTranscript");
      setErrorMessage(message);
      showToast({ message, tone: "error" });
      return;
    }

    if (wordsCount(transcript) < MIN_WORDS) {
      setStatus("idle");
      const message = `Minimum ${MIN_WORDS} words required.`;
      setErrorMessage(message);
      showToast({ message, tone: "error" });
      return;
    }

    if (recordingSeconds < MIN_SECONDS) {
      setStatus("idle");
      const message = `Record at least ${MIN_SECONDS} seconds to submit answer.`;
      setErrorMessage(message);
      showToast({ message, tone: "error" });
      return;
    }

    setStatus("processing");
    setErrorMessage(null);

    try {
      const analysis = await checkSpeakingAnswer({
        question: question.prompt,
        transcript,
        level,
        language,
        groupTitle: currentGroup?.title,
        groupTime: currentGroup?.time,
        mode,
      });

      setResult(analysis);
      setStatus("success");

      setSnapshot((prev) =>
        appendSpeakingAttempt(prev, {
          question,
          transcript,
          durationSec: recordingSeconds,
          mode,
          analysis,
        }),
      );
    } catch (error) {
      setStatus("idle");
      const message = mapSpeakingApiErrorToMessage(error);
      setErrorMessage(message);
      showToast({ message, tone: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("speaking.title")}
        subtitle={t("speaking.subtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-burgundy-700 text-white">
              <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
              Saturday Exam Auto
            </Badge>
            <Badge variant="positive">Level: {level.toUpperCase()}</Badge>
          </div>
        }
      />

      {examUnlocked && !snapshot.weeklyExam.started && weeklyRemaining > 0 ? (
        <Card className="border-burgundy-300 bg-burgundy-50/60 dark:border-burgundy-700 dark:bg-burgundy-900/20">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm font-semibold text-burgundy-800 dark:text-burgundy-100">
              Daily speaking is completed. Weekly exam is available now.
            </p>
            <Button onClick={startWeeklyExam}>
              <Trophy className="mr-2 h-4 w-4" />
              Start exam
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {mode === "weekly_exam" ? (
        <Card className="border-emerald-300 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-900/20">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-200">
            Weekly exam mode is active. Complete all {WEEKLY_TARGET} exam questions today.
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
        {/* Main Content Column (Left on Desktop, Top on Mobile) */}
        <div className="flex w-full flex-col gap-6 lg:col-span-7 xl:col-span-8">
          
          {/* Question Card */}
          <Card className="rounded-3xl">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-burgundy-700 text-white">{t("speaking.question")}</Badge>
                <Badge variant="positive">{mode === "weekly_exam" ? "WEEKLY EXAM" : "DAILY"}</Badge>
                <Badge variant="positive">{question?.topic || "-"}</Badge>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-charcoal dark:text-zinc-100 leading-tight">{question?.prompt || "No question"}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={listenQuestion} className="w-full sm:w-auto h-11">
                  <Volume2 className="mr-2 h-4 w-4" />
                  {t("speaking.listenQuestion")}
                </Button>
                {teacherQuestions.length > 0 ? (
                  <Badge className="bg-white text-charcoal ring-1 ring-burgundy-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700">
                    <BookOpenCheck className="mr-1 inline h-3.5 w-3.5" />
                    Teacher topic mode
                  </Badge>
                ) : null}
              </div>
              {taskLoading ? <p className="text-xs text-charcoal/60 dark:text-zinc-400">Loading teacher speaking topics...</p> : null}
              {taskError ? <p className="text-xs text-burgundy-700 dark:text-burgundy-200">{taskError}</p> : null}
            </CardContent>
          </Card>

          {/* Recording Card */}
          <Card className="rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="inline-flex items-center gap-2">
                <Mic className="h-5 w-5 text-burgundy-700 dark:text-white" />
                {t("speaking.recording")}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="positive">{statusLabel}</Badge>
                <Badge variant="positive">{t("speaking.timer")}: {toClock(recordingSeconds)}</Badge>
                {!notificationEnabled && typeof window !== "undefined" && "Notification" in window ? (
                  <Button size="sm" variant="secondary" onClick={askNotificationPermission}>
                    <Bell className="mr-2 h-3.5 w-3.5" />
                    Enable reminders
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!speech.supported ? (
                <p className="rounded-xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-sm text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-white">
                  {t("speaking.unsupported")}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button size="lg" onClick={startRecording} disabled={status === "processing" || speech.listening} className="h-14 text-base shadow-lg">
                  <Mic className="mr-2 h-5 w-5" />
                  {t("speaking.startRecording")}
                </Button>
                <Button size="lg" variant="secondary" onClick={stopRecording} disabled={!speech.listening} className="h-14 text-base">
                  <Clock3 className="mr-2 h-5 w-5" />
                  {t("speaking.stopRecording")}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/65 dark:text-zinc-400">
                  {t("speaking.transcript")}
                </p>
                <textarea
                  value={manualTranscript}
                  onChange={(event) => setManualTranscript(event.target.value)}
                  rows={4}
                  className="w-full resize-y rounded-2xl border border-burgundy-100 bg-white p-3 text-sm text-charcoal outline-none transition focus:border-burgundy-300 focus:ring-2 focus:ring-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-700"
                  placeholder={t("speaking.transcriptPlaceholder")}
                />
              </div>

              {speech.interimTranscript ? (
                <p className="text-xs text-charcoal/65 dark:text-zinc-400">
                  {t("speaking.interim")}: {speech.interimTranscript}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <Button onClick={() => void analyzeAnswer()} disabled={status === "processing"} className="h-12 w-full">
                  {status === "processing" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {t("speaking.analyze")}
                </Button>
                <Button variant="secondary" onClick={resetAttempt} className="h-12 w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("speaking.retry")}
                </Button>
                <Button variant="secondary" onClick={moveToNextQuestion} className="h-12 w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("speaking.nextQuestion")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card className="rounded-3xl">
            <CardHeader><CardTitle>{t("speaking.results")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!result ? (
                <p className="text-sm text-charcoal/65 dark:text-zinc-400">{t("speaking.emptyResult")}</p>
              ) : (
                <>
                  <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"><p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.overall")}</p><p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{result.score}</p></div>
                    <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"><p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.grammar")}</p><p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{result.grammarScore}</p></div>
                    <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"><p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.fluency")}</p><p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{result.fluencyScore}</p></div>
                    <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"><p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.vocabulary")}</p><p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{result.vocabularyScore}</p></div>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="font-semibold text-charcoal dark:text-zinc-100"><Brain className="mr-2 inline h-4 w-4 text-burgundy-700 dark:text-white" />{t("speaking.feedback")}</p>
                    <p className="text-sm text-charcoal/75 dark:text-zinc-300">{result.feedback || "-"}</p>
                    <p className="text-xs text-charcoal/60 dark:text-zinc-400"><Languages className="mr-1 inline h-3.5 w-3.5" />{t("speaking.levelEstimate")}: {result.levelEstimate || level}</p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"><p className="font-semibold text-charcoal dark:text-zinc-100">{t("speaking.corrected")}</p><p className="mt-2 text-sm text-charcoal/75 dark:text-zinc-300">{result.correctedAnswer || "-"}</p></div>
                    <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"><p className="font-semibold text-charcoal dark:text-zinc-100">{t("speaking.modelAnswer")}</p><p className="mt-2 text-sm text-charcoal/75 dark:text-zinc-300">{result.modelAnswer || "-"}</p></div>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="font-semibold text-charcoal dark:text-zinc-100">{t("speaking.mistakes")}</p>
                    {result.mistakes.length === 0 ? (
                      <p className="text-sm text-charcoal/65 dark:text-zinc-400">{t("speaking.noMistakes")}</p>
                    ) : (
                      <div className="space-y-2">
                        {result.mistakes.map((item, index) => (
                          <div key={`${item.original}-${index}`} className="rounded-xl border border-burgundy-100 px-3 py-2 dark:border-zinc-700">
                            <p className="text-xs text-charcoal/60 dark:text-zinc-400">Original: {item.original || "-"}</p>
                            <p className="text-sm text-burgundy-700 dark:text-white">Fix: {item.corrected || "-"}</p>
                            <p className="text-xs text-charcoal/70 dark:text-zinc-300">Why: {item.reason || "-"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Sidebar Column (Right on Desktop, Below on Mobile) */}
        <div className="flex w-full flex-col gap-6 lg:col-span-5 xl:col-span-4">
          <Card className="rounded-3xl">
            <CardContent className="grid grid-cols-2 gap-3 p-4">
              <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-[10px] uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">Today</p>
                <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{dailyRemaining}</p>
                <p className="mt-1 text-[10px] text-charcoal/60 dark:text-zinc-400">Left of {effectiveDailyTarget}</p>
              </div>
              <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-[10px] uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">Weekly</p>
                <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{weeklyRemaining}</p>
                <p className="mt-1 text-[10px] text-charcoal/60 dark:text-zinc-400">Left of {WEEKLY_TARGET}</p>
              </div>
              <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-[10px] uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">Recent</p>
                <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{recentAverage}</p>
                <p className="mt-1 text-[10px] text-charcoal/60 dark:text-zinc-400">Average score</p>
              </div>
              <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-[10px] uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">Exam</p>
                <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{weeklyAverage}</p>
                <p className="mt-1 text-[10px] text-charcoal/60 dark:text-zinc-400">Weekly result</p>
              </div>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card className="rounded-3xl">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-lg font-bold">{t("speaking.history")}</h3>
              {latestAttempts.length === 0 ? (
                <p className="text-sm text-charcoal/60 dark:text-zinc-400">{t("speaking.historyEmpty")}</p>
              ) : (
                <div className="space-y-2">
                  {latestAttempts.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="font-semibold text-charcoal dark:text-zinc-100">{item.topic || item.question}</p>
                      <p className="text-charcoal/60 dark:text-zinc-400">Score: {item.score}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {weakMistakes.length > 0 ? (
            <Card className="rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">My mistakes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weakMistakes.map((item) => (
                  <div key={item.id} className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="positive">{item.topic || item.category}</Badge>
                    </div>
                    <p className="text-sm text-charcoal/80 dark:text-zinc-300">{item.reason}</p>
                    {item.corrected ? <p className="mt-1 text-sm font-semibold text-burgundy-700 dark:text-white">{item.corrected}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Reminders / Bottom settings */}
          <Card className="rounded-3xl">
            <CardContent className="p-4 sm:p-5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-burgundy-700 dark:text-white">
                <CheckCircle2 className="h-4 w-4" />
                Reminder
              </p>
              <p className="mt-2 text-xs text-charcoal/65 dark:text-zinc-400">
                Weekly exam starts automatically on Saturday after finishing daily speaking.
              </p>
              {topicProgress.length > 0 ? (
                <p className="mt-2 text-xs text-charcoal/65 dark:text-zinc-400">
                  Teacher topics loaded: {topicProgress.length}
                </p>
              ) : null}
              {mode === "weekly_exam" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setSnapshot((prev) => resetWeeklyExam(prev));
                    }}
                  >
                    Reset weekly exam
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {showExamPrompt ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-3xl border border-burgundy-300 bg-white p-6 shadow-2xl dark:border-burgundy-700 dark:bg-zinc-950">
            <h3 className="text-xl font-bold text-charcoal dark:text-zinc-100">Weekly Speaking Exam</h3>
            <p className="mt-2 text-sm text-charcoal/70 dark:text-zinc-300">
              You finished daily speaking. Start your Saturday exam now ({WEEKLY_TARGET} questions).
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={startWeeklyExam} className="flex-1">
                Start exam
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
