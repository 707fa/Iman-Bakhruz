import { Bell, Brain, CheckCircle2, CircleAlert, Clock3, Languages, Mic, RefreshCw, Sparkles, Volume2, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
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
  readSpeakingSnapshot,
  resetWeeklyExam,
  writeSpeakingSnapshot,
} from "../lib/speakingSession";
import { normalizeStudentLevelFromGroupTitle, resolveAiFeedbackLanguage } from "../lib/studentLevel";
import type { SpeakingAnalysisResult, SpeakingQuestion, SpeakingSessionSnapshot } from "../types";
import { checkSpeakingAnswer, mapSpeakingApiErrorToMessage } from "../services/api/speakingApi";

type SpeakingMode = "daily" | "weekly_exam";
type SpeakingStatus = "idle" | "listening" | "processing" | "success" | "error";

const DAILY_TARGET = 20;
const WEEKLY_TARGET = 10;
const MIN_WORDS = 4;
const MIN_SECONDS = 3;

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

export function StudentSpeakingPage() {
  const { state, currentStudent } = useAppStore();
  const { t, locale } = useUi();

  const userId = currentStudent?.id ?? "";
  const currentGroup = currentStudent ? state.groups.find((item) => item.id === currentStudent.groupId) : null;
  const level = normalizeStudentLevelFromGroupTitle(currentGroup?.title);
  const language = resolveAiFeedbackLanguage(level, locale);
  const levelQuestions = useMemo(() => getSpeakingQuestionsForLevel(level), [level]);

  const [snapshot, setSnapshot] = useState<SpeakingSessionSnapshot>(() =>
    userId ? readSpeakingSnapshot(userId) : readSpeakingSnapshot("guest"),
  );
  const [mode, setMode] = useState<SpeakingMode>("daily");
  const [question, setQuestion] = useState<SpeakingQuestion | null>(null);
  const [status, setStatus] = useState<SpeakingStatus>("idle");
  const [result, setResult] = useState<SpeakingAnalysisResult | null>(null);
  const [manualTranscript, setManualTranscript] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted",
  );

  const speech = useSpeechRecognition({ lang: "en-US" });

  useEffect(() => {
    const key = userId || "guest";
    const current = readSpeakingSnapshot(key);
    const withWeekly = ensureWeeklyQuestionSet(current, levelQuestions, WEEKLY_TARGET);
    setSnapshot(withWeekly);
    setResult(null);
    setErrorMessage(null);
  }, [userId, levelQuestions]);

  useEffect(() => {
    if (!userId) return;
    writeSpeakingSnapshot(userId, snapshot);
  }, [snapshot, userId]);

  useEffect(() => {
    const fallbackQuestion = levelQuestions[0] ?? null;
    if (mode === "weekly_exam") {
      const withWeekly = ensureWeeklyQuestionSet(snapshot, levelQuestions, WEEKLY_TARGET);
      if (withWeekly !== snapshot) {
        setSnapshot(withWeekly);
      }
      const weeklyQuestion = getWeeklyCurrentQuestion(levelQuestions, withWeekly);
      setQuestion(weeklyQuestion ?? fallbackQuestion);
      return;
    }

    const nextQuestion = chooseNextDailyQuestion(levelQuestions, snapshot);
    setQuestion(nextQuestion ?? fallbackQuestion);
  }, [mode, snapshot, levelQuestions]);

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
    setStatus("error");
    if (speech.error.toLowerCase().includes("permission denied")) {
      setErrorMessage(t("speaking.error.microphoneDenied"));
      return;
    }
    setErrorMessage(speech.error);
  }, [speech.error, t]);

  const dailyRemaining = getDailyRemainingCount(snapshot, DAILY_TARGET);
  const weeklyRemaining = getWeeklyRemainingCount(snapshot, WEEKLY_TARGET);
  const latestAttempts = snapshot.attempts.slice(0, 6);
  const recentAverage = averageScore(latestAttempts.map((item) => item.score));
  const weakMistakes = getWeakMistakes(snapshot, level, 10);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (snapshot.daily.reminderShownDateKey === snapshot.daily.dateKey) return;
    if (dailyRemaining <= 0) return;
    if (dailyRemaining > 7) return;

    try {
      new Notification("Iman Speaking Reminder", {
        body: `Today you still have ${dailyRemaining} of ${DAILY_TARGET} speaking tasks left.`,
      });
      setSnapshot((prev) => markReminderShown(prev));
    } catch {
      // Browser may block notifications in some contexts.
    }
  }, [dailyRemaining, snapshot.daily.dateKey, snapshot.daily.reminderShownDateKey]);

  function askNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    void Notification.requestPermission().then((permission) => {
      const granted = permission === "granted";
      setNotificationEnabled(granted);
      if (!granted) {
        setErrorMessage("Notifications were not enabled. You can still use in-app reminder banner.");
      }
    });
  }

  function listenQuestion() {
    if (!question) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setErrorMessage(t("speaking.listenUnavailable"));
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
      setStatus("error");
      setErrorMessage(t("speaking.error.unavailable"));
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

  function resetAttempt(keepQuestion = true) {
    speech.reset();
    setStatus("idle");
    setErrorMessage(null);
    setResult(null);
    setRecordingSeconds(0);
    if (!keepQuestion) {
      setQuestion(null);
    }
    setManualTranscript("");
  }

  function moveToNextQuestion() {
    setErrorMessage(null);
    setResult(null);
    setRecordingSeconds(0);
    speech.reset();
    setManualTranscript("");

    if (mode === "weekly_exam") {
      const current = ensureWeeklyQuestionSet(snapshot, levelQuestions, WEEKLY_TARGET);
      const nextWeeklyQuestion = getWeeklyCurrentQuestion(levelQuestions, current);
      if (!nextWeeklyQuestion) {
        setMode("daily");
        return;
      }
      setQuestion(nextWeeklyQuestion);
      return;
    }

    const nextDailyQuestion = chooseNextDailyQuestion(levelQuestions, snapshot);
    setQuestion(nextDailyQuestion ?? levelQuestions[0] ?? null);
  }

  async function analyzeAnswer() {
    if (!question) return;
    if (status === "processing") return;

    const transcript = manualTranscript.trim();
    if (!transcript) {
      setStatus("error");
      setErrorMessage(t("speaking.error.emptyTranscript"));
      return;
    }

    if (wordsCount(transcript) < MIN_WORDS) {
      setStatus("error");
      setErrorMessage(`Minimum ${MIN_WORDS} words required.`);
      return;
    }

    if (recordingSeconds < MIN_SECONDS) {
      setStatus("error");
      setErrorMessage(`Record at least ${MIN_SECONDS} seconds to submit answer.`);
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
      setStatus("error");
      setErrorMessage(mapSpeakingApiErrorToMessage(error));
    }
  }

  const weeklyAttempts = snapshot.attempts.filter((item) => item.mode === "weekly_exam");
  const weeklyAverage = averageScore(weeklyAttempts.slice(0, WEEKLY_TARGET).map((item) => item.score));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("speaking.title")}
        subtitle={t("speaking.subtitle")}
        action={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Button variant={mode === "daily" ? "default" : "secondary"} size="sm" onClick={() => setMode("daily")}>
              Daily 20
            </Button>
            <Button
              variant={mode === "weekly_exam" ? "default" : "secondary"}
              size="sm"
              onClick={() => {
                setMode("weekly_exam");
                setSnapshot((prev) => ensureWeeklyQuestionSet(prev, levelQuestions, WEEKLY_TARGET));
              }}
            >
              Weekly Exam
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-burgundy-700 text-white">{t("speaking.question")}</Badge>
              <Badge variant="positive">{level.toUpperCase()}</Badge>
              <Badge variant="positive">{question?.topic || "-"}</Badge>
            </div>
            <p className="text-lg font-semibold text-charcoal dark:text-zinc-100">{question?.prompt}</p>
            <Button variant="secondary" onClick={listenQuestion}>
              <Volume2 className="mr-2 h-4 w-4" />
              {t("speaking.listenQuestion")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <h3 className="text-xl font-bold">{t("speaking.history")}</h3>
            {latestAttempts.length === 0 ? (
              <p className="text-sm text-charcoal/60 dark:text-zinc-400">{t("speaking.historyEmpty")}</p>
            ) : (
              <div className="space-y-2">
                {latestAttempts.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="font-semibold text-charcoal dark:text-zinc-100">{item.topic || item.question}</p>
                    <p className="text-charcoal/60 dark:text-zinc-400">Score: {item.score}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="inline-flex items-center gap-2">
            <Mic className="h-5 w-5 text-burgundy-700 dark:text-white" />
            {t("speaking.recording")}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="positive">{status.toUpperCase()}</Badge>
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

          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={startRecording} disabled={status === "processing" || speech.listening}>
              <Mic className="mr-2 h-4 w-4" />
              {t("speaking.startRecording")}
            </Button>
            <Button variant="secondary" onClick={stopRecording} disabled={!speech.listening}>
              <Clock3 className="mr-2 h-4 w-4" />
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

          {errorMessage ? (
            <p className="rounded-xl border border-burgundy-300 bg-burgundy-50 px-3 py-2 text-sm text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-white">
              <CircleAlert className="mr-2 inline h-4 w-4" />
              {errorMessage}
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-3">
            <Button onClick={() => void analyzeAnswer()} disabled={status === "processing"}>
              {status === "processing" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {t("speaking.analyze")}
            </Button>
            <Button variant="secondary" onClick={() => resetAttempt(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("speaking.retry")}
            </Button>
            <Button variant="secondary" onClick={moveToNextQuestion}>
              <Sparkles className="mr-2 h-4 w-4" />
              {t("speaking.nextQuestion")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">Today</p>
            <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-white">{dailyRemaining}</p>
            <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">Left of {DAILY_TARGET} questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">Weekly Exam</p>
            <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-white">{weeklyRemaining}</p>
            <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">Left of {WEEKLY_TARGET} questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">Recent Avg</p>
            <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-white">{recentAverage}</p>
            <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">From last attempts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">Weekly Avg</p>
            <p className="mt-2 text-3xl font-bold text-burgundy-700 dark:text-white">{weeklyAverage}</p>
            <p className="mt-1 text-sm text-charcoal/60 dark:text-zinc-400">Mini-exam result</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("speaking.results")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result ? (
            <p className="text-sm text-charcoal/65 dark:text-zinc-400">{t("speaking.emptyResult")}</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.overall")}</p>
                  <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{result.score}</p>
                </div>
                <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.grammar")}</p>
                  <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{result.grammarScore}</p>
                </div>
                <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.fluency")}</p>
                  <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{result.fluencyScore}</p>
                </div>
                <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.vocabulary")}</p>
                  <p className="mt-1 text-2xl font-bold text-burgundy-700 dark:text-white">{result.vocabularyScore}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="font-semibold text-charcoal dark:text-zinc-100">
                  <Brain className="mr-2 inline h-4 w-4 text-burgundy-700 dark:text-white" />
                  {t("speaking.feedback")}
                </p>
                <p className="text-sm text-charcoal/75 dark:text-zinc-300">{result.feedback || "-"}</p>
                <p className="text-xs text-charcoal/60 dark:text-zinc-400">
                  <Languages className="mr-1 inline h-3.5 w-3.5" />
                  {t("speaking.levelEstimate")}: {result.levelEstimate || level}
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="font-semibold text-charcoal dark:text-zinc-100">{t("speaking.corrected")}</p>
                  <p className="mt-2 text-sm text-charcoal/75 dark:text-zinc-300">{result.correctedAnswer || "-"}</p>
                </div>
                <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="font-semibold text-charcoal dark:text-zinc-100">{t("speaking.modelAnswer")}</p>
                  <p className="mt-2 text-sm text-charcoal/75 dark:text-zinc-300">{result.modelAnswer || "-"}</p>
                </div>
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

      <Card>
        <CardHeader>
          <CardTitle>My mistakes</CardTitle>
        </CardHeader>
        <CardContent>
          {weakMistakes.length === 0 ? (
            <p className="text-sm text-charcoal/65 dark:text-zinc-400">No saved mistakes yet. Do speaking checks to build your weak-topic bank.</p>
          ) : (
            <div className="space-y-2">
              {weakMistakes.map((item) => (
                <div key={item.id} className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="positive">{item.category}</Badge>
                    <Badge variant="positive">{item.topic}</Badge>
                    <span className="text-xs text-charcoal/60 dark:text-zinc-400">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-charcoal/80 dark:text-zinc-300">{item.reason}</p>
                  {item.corrected ? <p className="text-sm font-semibold text-burgundy-700 dark:text-white">{item.corrected}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-burgundy-700 dark:text-white">
            <CheckCircle2 className="h-4 w-4" />
            Reminder: today left {dailyRemaining} of {DAILY_TARGET} speaking questions.
          </p>
          {mode === "weekly_exam" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSnapshot((prev) => resetWeeklyExam(prev));
                  setMode("weekly_exam");
                }}
              >
                Reset weekly exam
              </Button>
              <span className="text-xs text-charcoal/65 dark:text-zinc-400">
                Weekly mode: {WEEKLY_TARGET} questions, final report by average score.
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
