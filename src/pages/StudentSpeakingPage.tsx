import { AlertCircle, ArrowRight, Loader2, Mic, RotateCcw, Square, Volume2, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { SkillScoreCard } from "../components/speaking/SkillScoreCard";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { SPEAKING_QUESTIONS } from "../data/speakingQuestions";
import { useAppStore } from "../hooks/useAppStore";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useUi } from "../hooks/useUi";
import { checkSpeakingAnswer, mapSpeakingApiErrorToMessage } from "../services/api/speakingApi";
import type { SpeakingAnalysisResult, SpeakingAttemptHistoryItem } from "../types";

type SpeakingStatus = "idle" | "listening" | "processing" | "success" | "error";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "uz" ? "uz-UZ" : locale === "en" ? "en-US" : "ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

function getLevelBadge(level: string): string {
  if (level === "beginner") return "Beginner";
  if (level === "elementary") return "Elementary";
  if (level === "pre-intermediate") return "Pre-Intermediate";
  if (level === "intermediate") return "Intermediate";
  return level;
}

export function StudentSpeakingPage() {
  const { t, locale } = useUi();
  const { state } = useAppStore();
  const sessionUserId = state.session?.userId ?? "guest";
  const storageKey = `result-speaking-history-v1:${sessionUserId}`;

  const [questionIndex, setQuestionIndex] = useState(0);
  const [status, setStatus] = useState<SpeakingStatus>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [analysis, setAnalysis] = useState<SpeakingAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<SpeakingAttemptHistoryItem[]>([]);

  const { supported, listening, transcript, interimTranscript, error: speechError, start, stop, reset } = useSpeechRecognition({
    lang: "en-US",
  });

  const question = SPEAKING_QUESTIONS[questionIndex];
  const canSpeakQuestion = typeof window !== "undefined" && "speechSynthesis" in window;
  const finalTranscript = transcript.trim();
  const liveTranscript = useMemo(() => `${finalTranscript} ${interimTranscript}`.trim(), [finalTranscript, interimTranscript]);
  const hasTranscript = transcriptDraft.trim().length > 0;
  const statusLabelMap: Record<SpeakingStatus, string> = {
    idle: t("speaking.status.idle"),
    listening: t("speaking.status.listening"),
    processing: t("speaking.status.processing"),
    success: t("speaking.status.success"),
    error: t("speaking.status.error"),
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SpeakingAttemptHistoryItem[];
      if (Array.isArray(parsed)) {
        setAttempts(parsed.slice(0, 12));
      }
    } catch {
      // ignore invalid cache
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(attempts.slice(0, 12)));
  }, [attempts, storageKey]);

  useEffect(() => {
    if (!listening) return;
    const id = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [listening]);

  useEffect(() => {
    if (!liveTranscript) return;
    if (listening || !transcriptDraft.trim()) {
      setTranscriptDraft(liveTranscript);
    }
  }, [listening, liveTranscript, transcriptDraft]);

  useEffect(() => {
    if (!speechError) return;
    const normalizedError = speechError.toLowerCase();
    setStatus("error");
    if (normalizedError.includes("permission") || normalizedError.includes("not-allowed")) {
      setError(t("speaking.error.microphoneDenied"));
      return;
    }
    if (normalizedError.includes("not supported") || normalizedError.includes("unavailable") || normalizedError.includes("https")) {
      setError(t("speaking.error.unavailable"));
      return;
    }
    if (normalizedError.includes("no speech")) {
      setError(t("speaking.error.emptyTranscript"));
      return;
    }
    setError(speechError);
  }, [speechError, t]);

  function handleListenQuestion() {
    if (!canSpeakQuestion || typeof window === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(question.prompt);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function resetAttemptState() {
    setStatus("idle");
    setError(null);
    setAnalysis(null);
    setRecordingSeconds(0);
    setTranscriptDraft("");
    reset();
  }

  function handleStartRecording() {
    setError(null);
    setAnalysis(null);
    setRecordingSeconds(0);
    reset();
    setTranscriptDraft("");
    const ok = start();
    if (ok) {
      setStatus("listening");
    } else {
      setStatus("error");
      if (!supported) {
        setError(t("speaking.error.unavailable"));
      }
    }
  }

  function handleStopRecording() {
    stop();
    setStatus("idle");
  }

  async function handleAnalyze() {
    const text = transcriptDraft.trim();
    if (!text) {
      setStatus("error");
      setError(t("speaking.error.emptyTranscript"));
      return;
    }

    setStatus("processing");
    setError(null);

    try {
      const result = await checkSpeakingAnswer({
        question: question.prompt,
        transcript: text,
        level: question.level,
        language: locale,
        userId: state.session?.userId,
      });
      setAnalysis(result);
      setStatus("success");

      setAttempts((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          questionId: question.id,
          question: question.prompt,
          transcript: text,
          score: result.score,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (apiError) {
      setStatus("error");
      setError(mapSpeakingApiErrorToMessage(apiError));
    }
  }

  function handleNextQuestion() {
    setQuestionIndex((prev) => (prev + 1) % SPEAKING_QUESTIONS.length);
    resetAttemptState();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("speaking.title")}
        subtitle={t("speaking.subtitle")}
        action={<Badge variant="positive">{`${questionIndex + 1}/${SPEAKING_QUESTIONS.length}`}</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="soft">{t("speaking.question")}</Badge>
                <Badge variant="positive">{getLevelBadge(question.level)}</Badge>
                <Badge variant="negative">{question.topic}</Badge>
              </div>
              <CardTitle className="text-lg leading-relaxed sm:text-xl">{question.prompt}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" onClick={handleListenQuestion}>
                <Volume2 className="mr-2 h-4 w-4" />
                {t("speaking.listenQuestion")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="inline-flex items-center gap-2">
                <Mic className="h-5 w-5 text-burgundy-700 dark:text-white" />
                {t("speaking.recording")}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status === "error" ? "negative" : "soft"}>{statusLabelMap[status]}</Badge>
                <Badge variant="negative">{`${t("speaking.timer")}: ${formatTime(recordingSeconds)}`}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canSpeakQuestion ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  {t("speaking.listenUnavailable")}
                </div>
              ) : null}

              {!supported ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/25 dark:text-amber-300">
                  {t("speaking.unsupported")}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={handleStartRecording} disabled={status === "processing" || listening || !supported}>
                  <Mic className="mr-2 h-4 w-4" />
                  {t("speaking.startRecording")}
                </Button>
                <Button variant="secondary" onClick={handleStopRecording} disabled={!listening}>
                  <Square className="mr-2 h-4 w-4" />
                  {t("speaking.stopRecording")}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("speaking.transcript")}</p>
                <textarea
                  value={transcriptDraft}
                  onChange={(event) => setTranscriptDraft(event.target.value)}
                  rows={5}
                  className="w-full resize-y rounded-2xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal outline-none ring-burgundy-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  placeholder={t("speaking.transcriptPlaceholder")}
                />
                {interimTranscript ? (
                  <p className="text-xs text-charcoal/55 dark:text-zinc-500">
                    {t("speaking.interim")}: {interimTranscript}
                  </p>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/25 dark:text-rose-300">
                  <p className="inline-flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-3">
                <Button onClick={() => void handleAnalyze()} disabled={status === "processing" || !hasTranscript}>
                  {status === "processing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                  {t("speaking.analyze")}
                </Button>
                <Button variant="secondary" onClick={resetAttemptState} disabled={status === "processing"}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("speaking.retry")}
                </Button>
                <Button variant="positive" onClick={handleNextQuestion} disabled={status === "processing"}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  {t("speaking.nextQuestion")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("speaking.results")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status === "processing" ? (
                <div className="flex items-center gap-2 rounded-xl border border-burgundy-100 bg-burgundy-50 px-3 py-3 text-sm text-burgundy-700 dark:border-burgundy-900 dark:bg-burgundy-900/35 dark:text-burgundy-100">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("speaking.status.processing")}
                </div>
              ) : null}

              {analysis ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SkillScoreCard label={t("speaking.overall")} score={analysis.score} />
                    <SkillScoreCard label={t("speaking.grammar")} score={analysis.grammarScore} />
                    <SkillScoreCard label={t("speaking.fluency")} score={analysis.fluencyScore} />
                    <SkillScoreCard label={t("speaking.vocabulary")} score={analysis.vocabularyScore} />
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("speaking.feedback")}</p>
                      <p className="mt-2 text-sm text-charcoal dark:text-zinc-100">{analysis.feedback || "-"}</p>
                    </div>
                    <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("speaking.levelEstimate")}</p>
                      <p className="mt-2 text-sm font-semibold text-charcoal dark:text-zinc-100">{analysis.levelEstimate || "-"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("speaking.corrected")}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-charcoal dark:text-zinc-100">{analysis.correctedAnswer || "-"}</p>
                  </div>

                  <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("speaking.modelAnswer")}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-charcoal dark:text-zinc-100">{analysis.modelAnswer || "-"}</p>
                  </div>

                  <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{t("speaking.mistakes")}</p>
                    {analysis.mistakes.length === 0 ? (
                      <p className="mt-2 text-sm text-charcoal/70 dark:text-zinc-300">{t("speaking.noMistakes")}</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {analysis.mistakes.map((mistake, index) => (
                          <div key={`${mistake.original}-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                            <p className="text-xs text-rose-600 dark:text-rose-400">{mistake.original || "-"}</p>
                            <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">{mistake.corrected || "-"}</p>
                            <p className="mt-1 text-xs text-charcoal/70 dark:text-zinc-300">{mistake.reason || "-"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : status !== "processing" ? (
                <p className="text-sm text-charcoal/65 dark:text-zinc-400">{t("speaking.emptyResult")}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("speaking.history")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attempts.length === 0 ? (
              <p className="text-sm text-charcoal/65 dark:text-zinc-400">{t("speaking.historyEmpty")}</p>
            ) : (
              attempts.slice(0, 8).map((attempt) => (
                <div key={attempt.id} className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
                      {attempt.question}
                    </p>
                    <p className="text-sm font-bold text-burgundy-700 dark:text-white">{attempt.score}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-charcoal/75 dark:text-zinc-300">{attempt.transcript}</p>
                  <p className="mt-1 text-[11px] text-charcoal/50 dark:text-zinc-500">{formatDateTime(attempt.createdAt, locale)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
