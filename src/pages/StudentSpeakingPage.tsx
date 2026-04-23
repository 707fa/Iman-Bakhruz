import { Brain, Loader2, Mic, RotateCcw, Sparkles, Volume2, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAppStore } from "../hooks/useAppStore";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { getSpeakingQuestionsForLevel } from "../data/speakingQuestions";
import { normalizeStudentLevelFromGroupTitle, resolveAiFeedbackLanguage } from "../lib/studentLevel";
import { pickGatewayVoice, speakWithBestBrowserVoice } from "../lib/speech";
import { checkSpeakingAnswer, generateSpeakingQuestions, mapSpeakingApiErrorToMessage, type GeneratedSpeakingQuestion } from "../services/api/speakingApi";
import { isVoiceGatewayReady, requestVoiceTts } from "../services/api/voiceGatewayApi";
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

const QUICK_DRILLS = [
  "Past Simple (did + V1)",
  "Present Simple (do/does)",
  "Have / Has",
  "Articles (a/an/the)",
  "Travel vocabulary",
] as const;

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

function mergeTeacherAndFallbackQuestions(teacherQuestions: string[], fallback: GeneratedSpeakingQuestion[]): GeneratedSpeakingQuestion[] {
  const merged: GeneratedSpeakingQuestion[] = [];
  const seen = new Set<string>();

  for (const question of teacherQuestions) {
    const prompt = String(question || "").trim();
    if (!prompt) continue;
    const key = prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: `teacher-${merged.length + 1}`,
      topic: "Teacher Task",
      prompt,
    });
    if (merged.length >= DAILY_TARGET) return merged;
  }

  for (const item of fallback) {
    const key = item.prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= DAILY_TARGET) break;
  }

  return merged;
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
  const [questionSpeaking, setQuestionSpeaking] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [manualTranscript, setManualTranscript] = useState("");
  const [result, setResult] = useState<SpeakingAnalysisResult | null>(null);

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

  const fallbackQuestions = useMemo(() => {
    const base = buildFallbackQuestions(level, lessonTopic || "General English");
    return mergeTeacherAndFallbackQuestions(teacherQuestions, base);
  }, [level, lessonTopic, teacherQuestions]);
  const effectiveQuestions = generatedQuestions.length > 0 ? generatedQuestions : fallbackQuestions;
  const currentQuestion = effectiveQuestions[questionIndex] ?? effectiveQuestions[0] ?? null;

  useEffect(() => {
    if (!speech.transcript) return;
    setManualTranscript(speech.transcript);
  }, [speech.transcript]);

  useEffect(() => {
    if (speech.listening) {
      setStatus("listening");
      return;
    }
    if (status === "listening") {
      setStatus("idle");
    }
  }, [speech.listening, status]);

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
    setManualTranscript("");
    setResult(null);
  }

  async function generateQuestions(topicInput?: string) {
    const topic = (topicInput ?? lessonTopic).trim();
    if (!topic) {
      setQuestionError("Enter lesson topic");
      return;
    }

    if (topicInput && topicInput !== lessonTopic) {
      setLessonTopic(topic);
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
      showToast({ message: "AI prepared 20 speaking questions", tone: "success" });
    } catch (error) {
      const message = mapSpeakingApiErrorToMessage(error);
      setQuestionError(message);
      showToast({ message, tone: "error" });
      setGeneratedQuestions([]);
    } finally {
      setGeneratingQuestions(false);
    }
  }

  function useQuickDrill(topic: string) {
    void generateQuestions(topic);
  }

  function toggleRecording() {
    if (speech.listening) {
      speech.stop();
      return;
    }

    setResult(null);
    setRecordingSeconds(0);
    setManualTranscript("");

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

  async function listenQuestion() {
    if (!currentQuestion) return;

    setQuestionSpeaking(true);
    try {
      if (isVoiceGatewayReady()) {
        const response = await requestVoiceTts({
          text: currentQuestion.prompt,
          lang: "en-US",
          voice: pickGatewayVoice("en-US"),
        });
        const audio = new Audio(response.audioSrc);
        audio.preload = "auto";
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
        });
        return;
      }

      await speakWithBestBrowserVoice(currentQuestion.prompt, "en-US", {
        rate: 0.93,
        pitch: 1.03,
        volume: 1,
      });
    } catch {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        showToast({ message: t("speaking.listenUnavailable"), tone: "error" });
        return;
      }
      await speakWithBestBrowserVoice(currentQuestion.prompt, "en-US", {
        rate: 0.93,
        pitch: 1.03,
        volume: 1,
      });
    } finally {
      setQuestionSpeaking(false);
    }
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

    const transcript = manualTranscript.trim();
    if (!transcript) {
      showToast({ message: t("speaking.error.emptyTranscript"), tone: "error" });
      return;
    }

    if (wordsCount(transcript) < MIN_WORDS) {
      showToast({ message: `Minimum ${MIN_WORDS} words required.`, tone: "error" });
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

      <Card className="overflow-hidden rounded-3xl border-burgundy-200/70">
        <CardContent className="bg-gradient-to-br from-burgundy-50 via-white to-burgundy-50 p-4 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              value={lessonTopic}
              onChange={(event) => setLessonTopic(event.target.value)}
              placeholder="Lesson topic (Past Simple, Travel, Daily routine...)"
              className="h-11 rounded-2xl"
            />
            <Button onClick={() => void generateQuestions()} disabled={generatingQuestions} className="h-11 rounded-2xl px-4">
              {generatingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate 20
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {QUICK_DRILLS.map((drill) => (
              <button
                key={drill}
                type="button"
                onClick={() => useQuickDrill(drill)}
                className="rounded-full border border-burgundy-200 bg-white px-3 py-1.5 text-xs font-semibold text-burgundy-700 transition hover:border-burgundy-300 hover:bg-burgundy-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              >
                {drill}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge className="bg-burgundy-700 text-white">{t("speaking.question")}</Badge>
            <Badge variant="positive">{questionIndex + 1}/{effectiveQuestions.length || DAILY_TARGET}</Badge>
            <Badge variant="positive">{currentQuestion?.topic || "Topic"}</Badge>
            {teacherQuestions.length > 0 ? <Badge variant="positive">Teacher tasks: {teacherQuestions.length}</Badge> : null}
            {taskLoading ? <Badge variant="positive">Teacher tasks loading...</Badge> : null}
          </div>
          {questionError ? <p className="mt-2 text-xs text-burgundy-700 dark:text-burgundy-200">{questionError}</p> : null}
          <p className="mt-2 text-base font-semibold text-charcoal dark:text-zinc-100 sm:text-lg">{currentQuestion?.prompt || "No question"}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Mic className="h-5 w-5 text-burgundy-700 dark:text-white" />
              Live Speaking
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

            <div className="grid place-items-center py-2">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={status === "processing"}
                className={[
                  "grid h-28 w-28 place-items-center rounded-full border text-white shadow-[0_26px_60px_-28px_rgba(80,0,20,0.65)] transition",
                  speech.listening
                    ? "scale-105 border-burgundy-400 bg-burgundy-600"
                    : "border-burgundy-300 bg-burgundy-700 hover:scale-[1.03]",
                  status === "processing" ? "cursor-not-allowed opacity-70" : "",
                ].join(" ")}
                aria-label={speech.listening ? t("speaking.stopRecording") : t("speaking.startRecording")}
              >
                {status === "processing" ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-9 w-9" />}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Button variant="secondary" onClick={() => void listenQuestion()} disabled={questionSpeaking} className="h-10 rounded-xl text-sm">
                {questionSpeaking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Volume2 className="mr-2 h-4 w-4" />}
                {questionSpeaking ? "Playing..." : "Listen"}
              </Button>
              <Button variant="secondary" onClick={goNextQuestion} className="h-10 rounded-xl text-sm">
                <Sparkles className="mr-2 h-4 w-4" />
                Next
              </Button>
              <Button variant="secondary" onClick={resetAttempt} className="h-10 rounded-xl text-sm">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/65 dark:text-zinc-400">
                {t("speaking.transcript")}
              </p>
              <textarea
                value={manualTranscript}
                onChange={(event) => setManualTranscript(event.target.value)}
                rows={5}
                className="w-full resize-y rounded-2xl border border-burgundy-100 bg-white p-3 text-sm text-charcoal outline-none transition focus:border-burgundy-300 focus:ring-2 focus:ring-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-700"
                placeholder={t("speaking.transcriptPlaceholder")}
              />
            </div>

            {speech.interimTranscript ? (
              <p className="text-xs text-charcoal/65 dark:text-zinc-400">
                {t("speaking.interim")}: {speech.interimTranscript}
              </p>
            ) : null}

            <Button onClick={() => void analyzeAnswer()} disabled={status === "processing"} className="h-11 w-full rounded-xl text-sm">
              {status === "processing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {t("speaking.analyze")}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardContent className="space-y-2 p-4">
            <h3 className="text-base font-bold">Recent Attempts</h3>
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
      </div>

      <Card className="rounded-3xl">
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
    </div>
  );
}

