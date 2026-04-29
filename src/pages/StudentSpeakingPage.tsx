import { Brain, Loader2, Mic, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAppStore } from "../hooks/useAppStore";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { getSpeakingQuestionsForLevel } from "../data/speakingQuestions";
import { normalizeStudentLevelFromGroupTitle, resolveAiFeedbackLanguage } from "../lib/studentLevel";
import { checkSpeakingAnswer, generateSpeakingQuestions, mapSpeakingApiErrorToMessage, type GeneratedSpeakingQuestion } from "../services/api/speakingApi";
import { getApiToken } from "../services/tokenStorage";
import { platformApi } from "../services/api/platformApi";
import type { HomeworkTask, SpeakingAnalysisResult } from "../types";

type SpeakingStatus = "idle" | "listening" | "processing" | "success" | "error";

interface LocalSpeakingAttempt {
  id: string;
  question: string;
  topic: string;
  score: number;
  transcript: string;
  createdAt: string;
}

const DAILY_TARGET = 20;
const MIN_WORDS = 4;
const PASS_SCORE = 70;

function toClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function wordsCount(text: string): number {
  return text
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function normalizeTeacherSpeakingQuestions(tasks: HomeworkTask[]): string[] {
  const raw = tasks.flatMap((task) => (Array.isArray(task.speakingQuestions) ? task.speakingQuestions : []));
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const text = String(item || "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(text);
    if (unique.length >= 20) break;
  }

  return unique;
}

function buildFallbackQuestions(level: ReturnType<typeof normalizeStudentLevelFromGroupTitle>, topic: string): GeneratedSpeakingQuestion[] {
  const base = getSpeakingQuestionsForLevel(level);
  const normalizedTopic = topic.trim().toLowerCase();
  const sorted = [...base].sort((a, b) => {
    const aHit = normalizedTopic && `${a.topic} ${a.prompt}`.toLowerCase().includes(normalizedTopic) ? 1 : 0;
    const bHit = normalizedTopic && `${b.topic} ${b.prompt}`.toLowerCase().includes(normalizedTopic) ? 1 : 0;
    return bHit - aHit;
  });

  const result: GeneratedSpeakingQuestion[] = [];
  const seen = new Set<string>();

  for (const item of sorted) {
    const key = item.prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ id: item.id, topic: item.topic, prompt: item.prompt });
    if (result.length >= DAILY_TARGET) break;
  }

  while (result.length < DAILY_TARGET) {
    const index = result.length + 1;
    result.push({
      id: `fallback-${index}`,
      topic: topic.trim() || "General English",
      prompt: `Speak for 40 seconds about "${topic.trim() || "General English"}" and give one real example. (${index})`,
    });
  }

  return result;
}

function getHistoryKey(userId: string): string {
  return `speaking-history-v3:${userId || "guest"}`;
}

function readHistory(userId: string): LocalSpeakingAttempt[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(getHistoryKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const rec = item as Record<string, unknown>;
        return {
          id: String(rec.id || ""),
          question: String(rec.question || ""),
          topic: String(rec.topic || ""),
          score: Number(rec.score || 0),
          transcript: String(rec.transcript || ""),
          createdAt: String(rec.createdAt || ""),
        } as LocalSpeakingAttempt;
      })
      .filter((item): item is LocalSpeakingAttempt => Boolean(item && item.id && item.question))
      .slice(0, 20);
  } catch {
    return [];
  }
}

function saveHistory(userId: string, history: LocalSpeakingAttempt[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getHistoryKey(userId), JSON.stringify(history.slice(0, 20)));
}

export function StudentSpeakingPage() {
  const { state, currentStudent, applyAiScore } = useAppStore();
  const { t, locale } = useUi();
  const { showToast } = useToast();

  const token = getApiToken();
  const currentGroup = currentStudent ? state.groups.find((item) => item.id === currentStudent.groupId) : null;
  const level = normalizeStudentLevelFromGroupTitle(currentGroup?.title);
  const language = resolveAiFeedbackLanguage(level, locale);

  const [teacherSpeakingTasks, setTeacherSpeakingTasks] = useState<HomeworkTask[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);

  const [lessonTopic, setLessonTopic] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedSpeakingQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionAnimSeed, setQuestionAnimSeed] = useState(0);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [status, setStatus] = useState<SpeakingStatus>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [result, setResult] = useState<SpeakingAnalysisResult | null>(null);
  const [speakingNotice, setSpeakingNotice] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState<"practice" | "analysis" | "history">("practice");
  const [pendingAutoAnalyze, setPendingAutoAnalyze] = useState(false);
  const wasListeningRef = useRef(false);

  const [history, setHistory] = useState<LocalSpeakingAttempt[]>(() => readHistory(currentStudent?.id || "guest"));

  const speech = useSpeechRecognition({ lang: "en-US" });

  useEffect(() => {
    setHistory(readHistory(currentStudent?.id || "guest"));
  }, [currentStudent?.id]);

  useEffect(() => {
    saveHistory(currentStudent?.id || "guest", history);
  }, [currentStudent?.id, history]);

  useEffect(() => {
    if (!token || !currentStudent || !currentGroup) {
      setTeacherSpeakingTasks([]);
      return;
    }

    let disposed = false;
    setTaskLoading(true);

    void platformApi
      .getStudentSpeakingTasks(token)
      .then((tasks) => {
        if (disposed) return;
        const filtered = tasks.filter((task) => task.groupId === currentGroup.id);
        setTeacherSpeakingTasks(filtered);
        if (!lessonTopic.trim() && filtered[0]?.speakingTopic) {
          setLessonTopic(String(filtered[0].speakingTopic));
        }
      })
      .catch(() => {
        if (!disposed) setTeacherSpeakingTasks([]);
      })
      .finally(() => {
        if (!disposed) setTaskLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [token, currentStudent, currentGroup?.id, lessonTopic]);

  const teacherQuestions = useMemo(() => normalizeTeacherSpeakingQuestions(teacherSpeakingTasks), [teacherSpeakingTasks]);

  const fallbackQuestions = useMemo(() => buildFallbackQuestions(level, lessonTopic || "General English"), [level, lessonTopic]);
  const effectiveQuestions = generatedQuestions.length > 0 ? generatedQuestions : fallbackQuestions;
  const currentQuestion = effectiveQuestions[questionIndex] ?? effectiveQuestions[0] ?? null;

  useEffect(() => {
    if (speech.listening) {
      setStatus(pendingAutoAnalyze ? "processing" : "listening");
      wasListeningRef.current = true;
      return;
    }
    if (pendingAutoAnalyze) {
      setStatus("processing");
      return;
    }
    if (status === "listening" || wasListeningRef.current) {
      setStatus("idle");
      wasListeningRef.current = false;
    }
  }, [pendingAutoAnalyze, speech.listening, status]);

  useEffect(() => {
    if (!pendingAutoAnalyze || speech.listening) return;
    setPendingAutoAnalyze(false);
    const timer = window.setTimeout(() => {
      void analyzeAnswer();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [pendingAutoAnalyze, speech.listening, speech.transcript]);

  useEffect(() => {
    if (!speech.error) return;
    setStatus("error");
    setSpeakingNotice(speech.error);
    showToast({ message: speech.error, tone: "error" });
  }, [speech.error, showToast]);

  useEffect(() => {
    if (!speech.listening) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [speech.listening]);

  function resetAttempt() {
    speech.reset();
    setStatus("idle");
    setRecordingSeconds(0);
    setResult(null);
    setSpeakingNotice(null);
    setPendingAutoAnalyze(false);
  }

  async function generateQuestions() {
    const topic = lessonTopic.trim();
    if (!topic) {
      setQuestionError("Enter lesson topic first.");
      return;
    }

    setGeneratingQuestions(true);
    setQuestionError(null);

    try {
      const questions = await generateSpeakingQuestions({
        level,
        language,
        lessonTopic: topic,
        teacherQuestions,
        userId: currentStudent?.id,
      });
      setGeneratedQuestions(questions.slice(0, DAILY_TARGET));
      setQuestionIndex(0);
      showToast({ message: "AI prepared 20 speaking questions.", tone: "success" });
    } catch (error) {
      const message = mapSpeakingApiErrorToMessage(error);
      setQuestionError(message);
      showToast({ message, tone: "error" });
      setGeneratedQuestions([]);
    } finally {
      setGeneratingQuestions(false);
    }
  }

  function toggleRecording() {
    if (speech.listening) {
      setPendingAutoAnalyze(true);
      setSpeakingNotice("Recording stopped. AI is checking your answer...");
      setStatus("processing");
      speech.stop();
      return;
    }

    setResult(null);
    setRecordingSeconds(0);
    setSpeakingNotice(null);
    setPendingAutoAnalyze(false);

    if (!speech.supported) {
      setStatus("error");
      setSpeakingNotice(t("speaking.error.unavailable"));
      showToast({ message: t("speaking.error.unavailable"), tone: "error" });
      return;
    }

    const started = speech.start();
    if (!started) {
      setStatus("error");
      return;
    }

    setStatus("listening");
    setSpeakingNotice("Recording is on. Speak clearly, then press Stop.");
  }

  function listenQuestion() {
    if (!currentQuestion) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      showToast({ message: t("speaking.listenUnavailable"), tone: "error" });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(currentQuestion.prompt);
    utterance.lang = "en-US";
    utterance.rate = 1.02;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((voice) => /en-us/i.test(voice.lang) && /(female|samantha|zira|aria|google us english)/i.test(voice.name)) ??
      voices.find((voice) => /en-us/i.test(voice.lang)) ??
      voices.find((voice) => /en/i.test(voice.lang));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function goToNextQuestionAfterSuccess() {
    const next = questionIndex + 1;
    if (next >= effectiveQuestions.length) {
      showToast({ message: "Great! You completed all questions for this set.", tone: "success" });
      resetAttempt();
      return;
    }

    setQuestionIndex(next);
    setQuestionAnimSeed((prev) => prev + 1);
    resetAttempt();
  }

  async function analyzeAnswer() {
    if (!currentQuestion) return;

    const transcript = (speech.transcript || speech.interimTranscript || "").trim();
    if (!transcript) {
      const message = "No speech captured yet. Speak a little longer and try again.";
      setStatus("error");
      setSpeakingNotice(message);
      showToast({ message, tone: "error" });
      window.setTimeout(() => setStatus("idle"), 900);
      return;
    }

    if (wordsCount(transcript) < MIN_WORDS) {
      const message = `Minimum ${MIN_WORDS} words required for checking.`;
      setStatus("error");
      setSpeakingNotice(message);
      showToast({ message, tone: "error" });
      window.setTimeout(() => setStatus("idle"), 900);
      return;
    }

    setStatus("processing");
    setSpeakingNotice("AI is checking grammar, fluency, and vocabulary...");

    try {
      const analysis = await checkSpeakingAnswer({
        question: currentQuestion.prompt,
        transcript,
        level,
        language,
        groupTitle: currentGroup?.title,
        groupTime: currentGroup?.time,
      });

      setResult(analysis);
      setStatus("success");
      setSpeakingNotice(analysis.score >= PASS_SCORE ? "Analysis ready. Good answer!" : "Analysis ready. Try again to improve your score.");
      
      if (analysis.score < PASS_SCORE) {
        showToast({ message: `Not enough score (${analysis.score}). Please try this question again.`, tone: "error" });
      } else {
        showToast({ message: "Great. Answer accepted.", tone: "success" });
        
        // Automated scoring
        const points = analysis.score / 10;
        await applyAiScore(points);
        showToast({ tone: "success", message: `AI awarded you ${points.toFixed(1)} points for speaking!` });

        window.setTimeout(() => {
          goToNextQuestionAfterSuccess();
        }, 520);
      }

      const nextHistory: LocalSpeakingAttempt[] = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          question: currentQuestion.prompt,
          topic: currentQuestion.topic,
          score: analysis.score,
          transcript,
          createdAt: new Date().toISOString(),
        },
        ...history,
      ].slice(0, 20);
      setHistory(nextHistory);
    } catch (error) {
      const message = mapSpeakingApiErrorToMessage(error);
      setStatus("error");
      setSpeakingNotice(message);
      showToast({ message, tone: "error" });
    }
  }

  const statusLabel = t(`speaking.status.${status}`);
  const dailyDone = Math.min(history.length, DAILY_TARGET);
  const capturedText = (speech.transcript || speech.interimTranscript || "").trim();
  const capturedWords = wordsCount(capturedText);
  const statusPanelTitle = !speech.supported
    ? "Speaking is not available in this browser"
    : generatingQuestions || taskLoading
      ? "Loading speaking practice..."
      : status === "processing"
        ? "Working..."
        : status === "listening"
          ? "Recording is working"
          : status === "success"
            ? "Speaking worked"
            : status === "error"
              ? "Action needed"
              : "Ready to record";
  const statusPanelText = speakingNotice
    ?? (!speech.supported
      ? t("speaking.unsupported")
      : status === "processing"
        ? "Please wait. Do not close this page."
        : status === "listening"
          ? "The microphone is listening now."
          : "Press the microphone button to start.");
  const statusPanelClass =
    status === "error" || !speech.supported
      ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-100"
      : status === "listening"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/45 dark:bg-emerald-950/25 dark:text-emerald-100"
        : status === "processing" || generatingQuestions || taskLoading
          ? "border-burgundy-200 bg-burgundy-50 text-burgundy-950 dark:border-burgundy-900/55 dark:bg-burgundy-950/35 dark:text-burgundy-100"
          : "border-burgundy-100 bg-white text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  const questionSection = (
    <Card className="overflow-hidden rounded-[1.75rem] border-burgundy-100/70 bg-[radial-gradient(circle_at_top_right,rgba(111,0,0,0.12),transparent_48%),linear-gradient(180deg,#ffffff,#faf8f8)] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(111,0,0,0.18),transparent_48%),linear-gradient(180deg,#121214,#0b0b0d)]">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={lessonTopic}
            onChange={(event) => setLessonTopic(event.target.value)}
            placeholder="Lesson topic (example: Past Simple, Daily routine, Travel)"
          />
          <Button onClick={() => void generateQuestions()} disabled={generatingQuestions} className="h-11 rounded-full px-5">
            {generatingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            AI 20 questions
          </Button>
        </div>
        {questionError ? <p className="text-xs text-burgundy-700 dark:text-burgundy-200">{questionError}</p> : null}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className="bg-burgundy-700 text-white">{t("speaking.question")}</Badge>
          <Badge variant="positive">{questionIndex + 1}/{effectiveQuestions.length || DAILY_TARGET}</Badge>
          <Badge variant="positive">{currentQuestion?.topic || "Topic"}</Badge>
          {taskLoading ? <Badge variant="positive">Teacher tasks loading...</Badge> : null}
        </div>
        <div className="rounded-2xl border border-burgundy-100/80 bg-white/85 p-3.5 dark:border-zinc-700 dark:bg-zinc-900/75">
          <AnimatePresence mode="wait">
            <motion.p
              key={`${currentQuestion?.id || "q"}-${questionIndex}-${questionAnimSeed}`}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.34, ease: "easeOut" }}
              className="text-base font-semibold text-charcoal dark:text-zinc-100 sm:text-lg"
            >
              {currentQuestion?.prompt || "No question"}
            </motion.p>
          </AnimatePresence>
        </div>
        <Button variant="secondary" onClick={listenQuestion} className="h-11 rounded-full px-4 text-sm sm:px-5">
          <Volume2 className="mr-2 h-4 w-4" />
          {t("speaking.listenQuestion")}
        </Button>
      </CardContent>
    </Card>
  );

  const recordingSection = (
    <Card className="overflow-hidden rounded-[1.75rem] border-burgundy-100/70 bg-[radial-gradient(circle_at_top,rgba(111,0,0,0.12),transparent_52%),linear-gradient(180deg,#ffffff,#f7f5f5)] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top,rgba(111,0,0,0.22),transparent_52%),linear-gradient(180deg,#121214,#08080b)]">
      <CardHeader className="pb-2">
        <CardTitle className="inline-flex items-center gap-2 text-lg">
          <Mic className="h-5 w-5 text-burgundy-700 dark:text-white" />
          {t("speaking.recording")}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="positive">{statusLabel}</Badge>
          <Badge variant="positive">{t("speaking.timer")}: {toClock(recordingSeconds)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!speech.supported ? (
          <p className="rounded-xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-xs text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-white">
            {t("speaking.unsupported")}
          </p>
        ) : null}

        <div className={`rounded-2xl border p-3 shadow-soft ${statusPanelClass}`}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/75 text-current dark:bg-black/20">
              {status === "processing" || generatingQuestions || taskLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className={`h-2.5 w-2.5 rounded-full ${status === "listening" || status === "success" ? "bg-emerald-500" : status === "error" || !speech.supported ? "bg-rose-500" : "bg-burgundy-600"}`} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black">{statusPanelTitle}</p>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-current dark:bg-black/20">
                  {capturedWords} words
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold opacity-80">{statusPanelText}</p>
              {capturedText ? (
                <p className="mt-2 line-clamp-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold opacity-90 dark:bg-black/20">
                  {capturedText}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-3 py-1">
          <span
            className={`pointer-events-none absolute h-36 w-36 rounded-full bg-burgundy-500/20 blur-2xl transition duration-500 ${
              speech.listening ? "scale-125 opacity-100" : "scale-95 opacity-60"
            }`}
          />
          <button
            type="button"
            onClick={toggleRecording}
            disabled={status === "processing"}
            aria-label={speech.listening ? t("speaking.stopRecording") : t("speaking.startRecording")}
            className={`relative z-10 flex h-28 w-28 items-center justify-center rounded-full border text-white shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-burgundy-300/50 ${
              speech.listening
                ? "border-burgundy-300 bg-gradient-to-br from-burgundy-700 to-burgundy-900"
                : "border-zinc-300 bg-gradient-to-br from-zinc-900 to-black dark:border-zinc-700"
            } ${status === "processing" ? "opacity-80" : "hover:scale-[1.03] active:scale-95"} `}
          >
            {status === "processing" ? <Loader2 className="h-7 w-7 animate-spin" /> : <Mic className="h-8 w-8" />}
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/65 dark:text-zinc-400">
            {status === "processing" ? "AI checking..." : speech.listening ? t("speaking.stopRecording") : t("speaking.startRecording")}
          </p>
        </div>

        <AnimatePresence>
          {result && result.score < PASS_SCORE ? (
            <motion.div
              key="retry-only-on-fail"
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="grid gap-2"
            >
              <Button variant="secondary" onClick={resetAttempt} className="h-11 rounded-full text-sm">
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("speaking.retry")}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <p className="text-xs font-semibold text-charcoal/70 dark:text-zinc-300">
          Passing score: {PASS_SCORE}+. Next question opens automatically after correct answer.
        </p>
      </CardContent>
    </Card>
  );

  const historySection = (
    <Card className="rounded-2xl">
      <CardContent className="space-y-2 p-3 sm:p-4">
        <h3 className="text-base font-bold">{t("speaking.history")}</h3>
        {history.length === 0 ? (
          <p className="text-xs text-charcoal/65 dark:text-zinc-400">{t("speaking.historyEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-xl border border-burgundy-100 bg-white px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="line-clamp-1 text-xs font-semibold text-charcoal dark:text-zinc-100">{item.topic || "Topic"}</p>
                <p className="line-clamp-1 text-[11px] text-charcoal/65 dark:text-zinc-400">{item.question}</p>
                <p className="mt-1 text-xs font-bold text-burgundy-700 dark:text-burgundy-200">Score: {item.score}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const resultSection = (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t("speaking.results")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!result ? (
          <p className="text-sm text-charcoal/65 dark:text-zinc-400">{t("speaking.emptyResult")}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-burgundy-100 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-900"><p className="text-[10px] uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.overall")}</p><p className="mt-1 text-xl font-bold text-burgundy-700 dark:text-white">{result.score}</p></div>
              <div className="rounded-xl border border-burgundy-100 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-900"><p className="text-[10px] uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.grammar")}</p><p className="mt-1 text-xl font-bold text-burgundy-700 dark:text-white">{result.grammarScore}</p></div>
              <div className="rounded-xl border border-burgundy-100 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-900"><p className="text-[10px] uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.fluency")}</p><p className="mt-1 text-xl font-bold text-burgundy-700 dark:text-white">{result.fluencyScore}</p></div>
              <div className="rounded-xl border border-burgundy-100 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-900"><p className="text-[10px] uppercase tracking-[0.12em] text-charcoal/60 dark:text-zinc-500">{t("speaking.vocabulary")}</p><p className="mt-1 text-xl font-bold text-burgundy-700 dark:text-white">{result.vocabularyScore}</p></div>
            </div>

            <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="inline-flex items-center gap-2 font-semibold text-charcoal dark:text-zinc-100"><Brain className="h-4 w-4 text-burgundy-700 dark:text-white" />{t("speaking.feedback")}</p>
              <p className="mt-1.5 text-sm text-charcoal/80 dark:text-zinc-300">{result.feedback || "-"}</p>
              <p className={`mt-2 text-sm font-semibold ${result.score >= PASS_SCORE ? "text-emerald-700 dark:text-emerald-300" : "text-burgundy-700 dark:text-burgundy-300"}`}>
                {result.score >= PASS_SCORE
                  ? `Accepted. You can open the next question.`
                  : `Try again. Need ${PASS_SCORE}+ to continue.`}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{t("speaking.corrected")}</p>
                <p className="mt-1 text-sm text-charcoal/75 dark:text-zinc-300">{result.correctedAnswer || "-"}</p>
              </div>
              <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{t("speaking.modelAnswer")}</p>
                <p className="mt-1 text-sm text-charcoal/75 dark:text-zinc-300">{result.modelAnswer || "-"}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("speaking.title")}
        subtitle={t("speaking.subtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-burgundy-700 text-white">{level.toUpperCase()}</Badge>
            <Badge variant="positive">{dailyDone}/{DAILY_TARGET}</Badge>
          </div>
        }
      />

      <div className="lg:hidden">
        <Tabs value={mobileSection} onValueChange={(value) => setMobileSection(value as "practice" | "analysis" | "history")}>
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-burgundy-100 bg-white/90 p-1 dark:border-zinc-800 dark:bg-zinc-900/90">
            <TabsTrigger className="rounded-xl px-2 py-2 text-xs data-[state=active]:bg-burgundy-700 data-[state=active]:text-white" value="practice">Practice</TabsTrigger>
            <TabsTrigger className="rounded-xl px-2 py-2 text-xs data-[state=active]:bg-burgundy-700 data-[state=active]:text-white" value="analysis">Analysis</TabsTrigger>
            <TabsTrigger className="rounded-xl px-2 py-2 text-xs data-[state=active]:bg-burgundy-700 data-[state=active]:text-white" value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="practice" className="space-y-4">
            {questionSection}
            {recordingSection}
          </TabsContent>
          <TabsContent value="analysis">{resultSection}</TabsContent>
          <TabsContent value="history">{historySection}</TabsContent>
        </Tabs>
      </div>

      <div className="hidden space-y-4 lg:block">
        {questionSection}
        <div className="grid gap-4 lg:grid-cols-[1fr_310px]">
          {recordingSection}
          {historySection}
        </div>
        {resultSection}
      </div>
    </div>
  );
}
