import { Brain, Loader2, Mic, RotateCcw, Sparkles, Volume2 } from "lucide-react";
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
  const { state, currentStudent } = useAppStore();
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
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [status, setStatus] = useState<SpeakingStatus>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [result, setResult] = useState<SpeakingAnalysisResult | null>(null);
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
      setStatus("listening");
      wasListeningRef.current = true;
      return;
    }
    if (status === "listening" || wasListeningRef.current) {
      setStatus("idle");
      wasListeningRef.current = false;
    }
  }, [speech.listening, status]);

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
    setPendingAutoAnalyze(false);
  }

  async function generateQuestions() {
    const topic = lessonTopic.trim();
    if (!topic) {
      setQuestionError("Р’РІРµРґРёС‚Рµ С‚РµРјСѓ СѓСЂРѕРєР°");
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
      showToast({ message: "AI РїРѕРґРіРѕС‚РѕРІРёР» 20 speaking РІРѕРїСЂРѕСЃРѕРІ", tone: "success" });
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
      speech.stop();
      return;
    }

    setResult(null);
    setRecordingSeconds(0);
    setPendingAutoAnalyze(false);

    if (!speech.supported) {
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

  function goNextQuestion() {
    setQuestionIndex((prev) => {
      const next = prev + 1;
      return next >= effectiveQuestions.length ? 0 : next;
    });
    resetAttempt();
  }

  async function analyzeAnswer() {
    if (!currentQuestion) return;

    const transcript = speech.transcript.trim();
    if (!transcript) {
      showToast({ message: t("speaking.error.emptyTranscript"), tone: "error" });
      return;
    }

    if (wordsCount(transcript) < MIN_WORDS) {
      showToast({ message: `РњРёРЅРёРјСѓРј ${MIN_WORDS} СЃР»РѕРІ РґР»СЏ РїСЂРѕРІРµСЂРєРё.`, tone: "error" });
      return;
    }

    setStatus("processing");

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
      showToast({ message, tone: "error" });
    }
  }

  const statusLabel = t(`speaking.status.${status}`);
  const dailyDone = Math.min(history.length, DAILY_TARGET);

  const questionSection = (
    <Card className="rounded-2xl">
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={lessonTopic}
            onChange={(event) => setLessonTopic(event.target.value)}
            placeholder="РўРµРјР° СѓСЂРѕРєР° (РЅР°РїСЂРёРјРµСЂ: Past Simple, Daily routine, Travel)"
          />
          <Button onClick={() => void generateQuestions()} disabled={generatingQuestions} className="h-10 px-4">
            {generatingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            AI 20 РІРѕРїСЂРѕСЃРѕРІ
          </Button>
        </div>
        {questionError ? <p className="text-xs text-burgundy-700 dark:text-burgundy-200">{questionError}</p> : null}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className="bg-burgundy-700 text-white">{t("speaking.question")}</Badge>
          <Badge variant="positive">{questionIndex + 1}/{effectiveQuestions.length || DAILY_TARGET}</Badge>
          <Badge variant="positive">{currentQuestion?.topic || "Topic"}</Badge>
          {taskLoading ? <Badge variant="positive">Teacher tasks loading...</Badge> : null}
        </div>
        <p className="text-base font-semibold text-charcoal dark:text-zinc-100 sm:text-lg">{currentQuestion?.prompt || "No question"}</p>
        <Button variant="secondary" onClick={listenQuestion} className="h-9 text-sm">
          <Volume2 className="mr-2 h-4 w-4" />
          {t("speaking.listenQuestion")}
        </Button>
      </CardContent>
    </Card>
  );

  const recordingSection = (
    <Card className="rounded-2xl">
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
      <CardContent className="space-y-3">
        {!speech.supported ? (
          <p className="rounded-xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-xs text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-white">
            {t("speaking.unsupported")}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-3 py-1">
          <Button
            onClick={toggleRecording}
            disabled={status === "processing"}
            className="h-28 w-28 rounded-full text-sm shadow-soft"
            variant={speech.listening ? "secondary" : "default"}
          >
            {status === "processing" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-7 w-7" />}
          </Button>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/65 dark:text-zinc-400">
            {status === "processing" ? "AI checking..." : speech.listening ? t("speaking.stopRecording") : t("speaking.startRecording")}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={resetAttempt} className="h-10 text-sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("speaking.retry")}
          </Button>
          <Button variant="secondary" onClick={goNextQuestion} className="h-10 text-sm">
            <Sparkles className="mr-2 h-4 w-4" />
            {t("speaking.nextQuestion")}
          </Button>
        </div>
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
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
            <TabsTrigger className="px-2 py-2 text-xs" value="practice">Practice</TabsTrigger>
            <TabsTrigger className="px-2 py-2 text-xs" value="analysis">Analysis</TabsTrigger>
            <TabsTrigger className="px-2 py-2 text-xs" value="history">History</TabsTrigger>
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
