import { Bot, Globe2, Loader2, RefreshCw, Sparkles, Swords, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "../hooks/useAppStore";
import { DATA_PROVIDER_MODE } from "../lib/env";
import { cn } from "../lib/utils";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type ArenaRole = "student" | "teacher";
type ArenaMode = "ai" | "group" | "global";
type GameType = "quiz" | "builder" | "native_fix";

interface BaseChallenge {
  type: GameType;
  title: string;
  hint: string;
}

interface QuizChallenge extends BaseChallenge {
  type: "quiz";
  question: string;
  options: string[];
}

interface BuilderChallenge extends BaseChallenge {
  type: "builder";
  instruction: string;
  words: string[];
}

interface NativeFixChallenge extends BaseChallenge {
  type: "native_fix";
  instruction: string;
  wrongSentence: string;
}

type GameChallenge = QuizChallenge | BuilderChallenge | NativeFixChallenge;

interface EvaluationResult {
  isCorrect: boolean;
  scoreDelta: number;
  feedback: string;
  nativeSample: string;
}

interface LeaderboardEntry {
  id: string;
  fullName: string;
  score: number;
  isMe: boolean;
}

const FALLBACK_QUIZ: QuizChallenge[] = [
  {
    type: "quiz",
    title: "Speed Quiz",
    question: "Choose the correct sentence:",
    options: ["He go to school.", "He goes to school.", "He going school.", "He gone to school."],
    hint: "With he/she/it add -s in Present Simple.",
  },
  {
    type: "quiz",
    title: "Speed Quiz",
    question: "Choose the best phrase:",
    options: ["do a progress", "make progress", "build progress", "write progress"],
    hint: "Native collocation is make progress.",
  },
];

const FALLBACK_BUILDER: BuilderChallenge[] = [
  {
    type: "builder",
    title: "Sentence Builder",
    instruction: "Build a natural sentence from these words:",
    words: ["I", "need", "to", "improve", "my", "speaking", "skills"],
    hint: "Start with subject + need to + verb.",
  },
  {
    type: "builder",
    title: "Sentence Builder",
    instruction: "Build a natural sentence from these words:",
    words: ["we", "have", "an", "English", "lesson", "tomorrow"],
    hint: "Use present simple for schedule.",
  },
];

const FALLBACK_NATIVE_FIX: NativeFixChallenge[] = [
  {
    type: "native_fix",
    title: "Fix Like Native",
    instruction: "Rewrite this sentence naturally in English:",
    wrongSentence: "I very like this movie.",
    hint: "Use like ... very much or really like.",
  },
  {
    type: "native_fix",
    title: "Fix Like Native",
    instruction: "Rewrite this sentence naturally in English:",
    wrongSentence: "Can you explain me this grammar?",
    hint: "Explain ... to someone.",
  },
];

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

function normalizeChallenge(payload: unknown, expected: GameType): GameChallenge | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const type = (data.type as string) || expected;
  const title = String(data.title ?? "").trim();
  const hint = String(data.hint ?? "").trim();

  if (expected === "quiz" && type === "quiz") {
    const question = String(data.question ?? "").trim();
    const options = Array.isArray(data.options) ? data.options.map((option) => String(option).trim()).filter(Boolean) : [];
    if (!question || options.length < 4) return null;
    return {
      type: "quiz",
      title: title || "Speed Quiz",
      question,
      options: options.slice(0, 4),
      hint: hint || "Read carefully and choose the best option.",
    };
  }

  if (expected === "builder" && type === "builder") {
    const instruction = String(data.instruction ?? "").trim();
    const words = Array.isArray(data.words) ? data.words.map((word) => String(word).trim()).filter(Boolean) : [];
    if (!instruction || words.length < 4) return null;
    return {
      type: "builder",
      title: title || "Sentence Builder",
      instruction,
      words,
      hint: hint || "Build a correct and natural sentence.",
    };
  }

  if (expected === "native_fix" && type === "native_fix") {
    const instruction = String(data.instruction ?? "").trim();
    const wrongSentence = String(data.wrongSentence ?? "").trim();
    if (!instruction || !wrongSentence) return null;
    return {
      type: "native_fix",
      title: title || "Fix Like Native",
      instruction,
      wrongSentence,
      hint: hint || "Rewrite like a native speaker.",
    };
  }

  return null;
}

function fallbackChallenge(type: GameType): GameChallenge {
  const randomIndex = Math.floor(Math.random() * 1000);
  if (type === "quiz") {
    return FALLBACK_QUIZ[randomIndex % FALLBACK_QUIZ.length];
  }
  if (type === "builder") {
    return FALLBACK_BUILDER[randomIndex % FALLBACK_BUILDER.length];
  }
  return FALLBACK_NATIVE_FIX[randomIndex % FALLBACK_NATIVE_FIX.length];
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 15) return 15;
  return Math.round(value);
}

interface EnglishGamesArenaProps {
  role: ArenaRole;
}

export function EnglishGamesArena({ role }: EnglishGamesArenaProps) {
  const { state, currentStudent, currentTeacher } = useAppStore();
  const token = getApiToken();
  const isApiMode = DATA_PROVIDER_MODE === "api";
  const canUseAi = isApiMode && Boolean(token);

  const [mode, setMode] = useState<ArenaMode>("group");
  const [gameType, setGameType] = useState<GameType>("quiz");
  const [teacherGroupId, setTeacherGroupId] = useState("");
  const [duelTargetId, setDuelTargetId] = useState("");

  const [challenge, setChallenge] = useState<GameChallenge | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [aiTips, setAiTips] = useState<string[]>([]);

  const [selectedOption, setSelectedOption] = useState("");
  const [textAnswer, setTextAnswer] = useState("");

  const teacherGroups = useMemo(
    () => state.groups.filter((group) => (currentTeacher ? currentTeacher.groupIds.includes(group.id) : false)),
    [state.groups, currentTeacher],
  );

  useEffect(() => {
    if (role !== "teacher") return;
    if (!teacherGroupId && teacherGroups.length > 0) {
      setTeacherGroupId(teacherGroups[0].id);
    }
  }, [role, teacherGroupId, teacherGroups]);

  const effectiveGroupId =
    role === "student" ? (currentStudent?.groupId ?? "") : (teacherGroupId || teacherGroups[0]?.id || "");

  const participants = useMemo(() => {
    if (mode === "ai") return [];
    if (mode === "global") return state.students;
    if (!effectiveGroupId) return [];
    return state.students.filter((student) => student.groupId === effectiveGroupId);
  }, [mode, state.students, effectiveGroupId]);

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    if (mode === "ai") return [];

    const meId = role === "student" ? currentStudent?.id : undefined;
    const sessionBoost = Math.round(score * 1.2 + streak * 2);

    const rows = participants.map((student) => {
      const baseline = Math.round(student.points * 2 + ((student.id.length * 13) % 40));
      const isMe = meId === student.id;
      return {
        id: student.id,
        fullName: student.fullName,
        score: isMe ? baseline + sessionBoost : baseline,
        isMe,
      };
    });

    if (role === "teacher") {
      rows.push({
        id: "teacher-session",
        fullName: `${currentTeacher?.fullName ?? "Teacher"} (session)`,
        score: 80 + sessionBoost,
        isMe: true,
      });
    }

    return rows.sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName)).slice(0, 10);
  }, [mode, participants, role, currentStudent, currentTeacher, score, streak]);

  useEffect(() => {
    if (mode === "ai") return;
    const available = leaderboard.find((item) => !item.isMe);
    if (!available) {
      setDuelTargetId("");
      return;
    }
    if (!leaderboard.find((item) => item.id === duelTargetId && !item.isMe)) {
      setDuelTargetId(available.id);
    }
  }, [leaderboard, duelTargetId, mode]);

  const duelTarget = leaderboard.find((entry) => entry.id === duelTargetId && !entry.isMe) ?? null;
  const aiHref = role === "student" ? "/student/ai-chat" : "/teacher/ai-chat";

  async function askAiJson(prompt: string): Promise<Record<string, unknown> | null> {
    if (!token) return null;
    const messages = await platformApi.sendAiMessage(token, { text: prompt });
    const assistantText = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.text.trim().length > 0)?.text;
    if (!assistantText) return null;
    return parseJsonObject<Record<string, unknown>>(assistantText);
  }

  async function generateRound(nextType: GameType) {
    setLoadingChallenge(true);
    setError(null);
    setEvaluation(null);
    setSelectedOption("");
    setTextAnswer("");

    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const target = mode === "global" ? "all students" : mode === "group" ? "group battle" : "ai self-study";
    const levelHint = role === "student" ? "student level challenge" : "teacher demo challenge";

    if (!canUseAi) {
      setChallenge(fallbackChallenge(nextType));
      setLoadingChallenge(false);
      setError("AI mode not connected. Fallback round loaded.");
      return;
    }

    try {
      const schema =
        nextType === "quiz"
          ? '{"type":"quiz","title":"Speed Quiz","question":"...","options":["...","...","...","..."],"hint":"..."}'
          : nextType === "builder"
            ? '{"type":"builder","title":"Sentence Builder","instruction":"...","words":["...","...","..."],"hint":"..."}'
            : '{"type":"native_fix","title":"Fix Like Native","instruction":"...","wrongSentence":"...","hint":"..."}';

      const prompt = [
        "Ignore previous chat context completely.",
        "You generate ONE unique English game task.",
        `Game type: ${nextType}.`,
        `Audience: ${levelHint}.`,
        `Competition context: ${target}.`,
        `Random seed: ${seed}.`,
        "Return ONLY valid JSON, no markdown, no explanations.",
        `JSON schema: ${schema}`,
      ].join("\n");

      const payload = await askAiJson(prompt);
      const parsed = normalizeChallenge(payload, nextType);
      setChallenge(parsed ?? fallbackChallenge(nextType));
      if (!parsed) {
        setError("AI returned invalid format, fallback round loaded.");
      }
    } catch {
      setChallenge(fallbackChallenge(nextType));
      setError("AI temporarily unavailable, fallback round loaded.");
    } finally {
      setLoadingChallenge(false);
    }
  }

  useEffect(() => {
    void generateRound(gameType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType, mode]);

  function currentAnswer(): string {
    if (!challenge) return "";
    if (challenge.type === "quiz") return selectedOption.trim();
    return textAnswer.trim();
  }

  async function checkCurrentAnswer() {
    if (!challenge || checking) return;
    const answer = currentAnswer();
    if (!answer) return;

    setChecking(true);
    setError(null);

    if (!canUseAi) {
      const fallbackIsCorrect = answer.length > 3;
      const fallback: EvaluationResult = {
        isCorrect: fallbackIsCorrect,
        scoreDelta: fallbackIsCorrect ? 8 : 2,
        feedback: fallbackIsCorrect ? "Good attempt. Keep going." : "Try to be more accurate.",
        nativeSample: challenge.type === "quiz" ? challenge.hint : "Use short, natural sentences.",
      };
      setEvaluation(fallback);
      setScore((prev) => prev + fallback.scoreDelta);
      setStreak((prev) => (fallback.isCorrect ? prev + 1 : 0));
      if (!fallback.isCorrect) {
        setAiTips((prev) => [fallback.feedback, ...prev].slice(0, 8));
      }
      setChecking(false);
      return;
    }

    try {
      const prompt = [
        "Ignore previous chat context.",
        "You are an English teacher evaluator.",
        "Evaluate student answer for this challenge.",
        "Return ONLY JSON: {\"isCorrect\":true|false,\"scoreDelta\":0..15,\"feedback\":\"...\",\"nativeSample\":\"...\"}",
        `Challenge: ${JSON.stringify(challenge)}`,
        `Student answer: ${answer}`,
        "Feedback language: Russian.",
      ].join("\n");

      const payload = await askAiJson(prompt);
      const isCorrect = Boolean(payload?.isCorrect);
      const scoreDelta = clampScore(Number(payload?.scoreDelta ?? 0));
      const feedback = String(payload?.feedback ?? "").trim() || "Проверьте ответ и попробуйте еще раз.";
      const nativeSample = String(payload?.nativeSample ?? "").trim() || challenge.hint;

      const result: EvaluationResult = {
        isCorrect,
        scoreDelta,
        feedback,
        nativeSample,
      };

      setEvaluation(result);
      setScore((prev) => prev + result.scoreDelta);
      setStreak((prev) => (result.isCorrect ? prev + 1 : 0));
      if (!result.isCorrect) {
        setAiTips((prev) => [`${result.feedback} - ${result.nativeSample}`, ...prev].slice(0, 8));
      }
    } catch {
      setError("AI check failed. Try again.");
    } finally {
      setChecking(false);
    }
  }

  async function nextRound() {
    setRound((prev) => prev + 1);
    await generateRound(gameType);
  }

  function resetSession() {
    setRound(1);
    setScore(0);
    setStreak(0);
    setAiTips([]);
    setEvaluation(null);
    setSelectedOption("");
    setTextAnswer("");
    void generateRound(gameType);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>AI Games Arena</CardTitle>

          <div className="flex flex-wrap gap-2">
            <Button variant={mode === "ai" ? "default" : "secondary"} size="sm" onClick={() => setMode("ai")}>
              <Bot className="mr-1.5 h-3.5 w-3.5" />
              AI Mode
            </Button>
            <Button variant={mode === "group" ? "default" : "secondary"} size="sm" onClick={() => setMode("group")}>
              <UsersRound className="mr-1.5 h-3.5 w-3.5" />
              Group Mode
            </Button>
            <Button variant={mode === "global" ? "default" : "secondary"} size="sm" onClick={() => setMode("global")}>
              <Globe2 className="mr-1.5 h-3.5 w-3.5" />
              Global Mode
            </Button>
          </div>

          <Tabs value={gameType} onValueChange={(value) => setGameType(value as GameType)}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="quiz">Speed Quiz</TabsTrigger>
              <TabsTrigger value="builder">Sentence Builder</TabsTrigger>
              <TabsTrigger value="native_fix">Fix Like Native</TabsTrigger>
            </TabsList>
            <TabsContent value={gameType} className="m-0" />
          </Tabs>

          {role === "teacher" && mode === "group" && teacherGroups.length > 0 ? (
            <div className="max-w-sm">
              <Select value={effectiveGroupId} onValueChange={setTeacherGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {teacherGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.title} • {group.time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4">
          {!canUseAi ? (
            <div className="rounded-2xl border border-burgundy-200 bg-burgundy-50 px-4 py-3 text-sm text-burgundy-800 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-white">
              AI API not connected. Login in API mode for fully dynamic games. Fallback rounds are active.
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">Round</p>
              <p className="mt-1 text-xl font-bold text-burgundy-700 dark:text-white">{round}</p>
            </div>
            <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">Score</p>
              <p className="mt-1 text-xl font-bold text-burgundy-700 dark:text-white">{score}</p>
            </div>
            <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">Streak</p>
              <p className="mt-1 text-xl font-bold text-burgundy-700 dark:text-white">{streak}</p>
            </div>
          </div>

          {loadingChallenge ? (
            <div className="flex items-center gap-2 rounded-2xl border border-burgundy-100 bg-white px-4 py-5 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI is generating a new unique round...
            </div>
          ) : challenge ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">{challenge.title}</p>
                {challenge.type === "quiz" ? (
                  <p className="mt-2 text-sm font-semibold text-charcoal dark:text-zinc-100">{challenge.question}</p>
                ) : challenge.type === "builder" ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-charcoal dark:text-zinc-100">{challenge.instruction}</p>
                    <p className="mt-2 text-base font-bold tracking-[0.18em] text-burgundy-700 dark:text-white">
                      {challenge.words.join(" ")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-semibold text-charcoal dark:text-zinc-100">{challenge.instruction}</p>
                    <p className="mt-2 rounded-lg border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                      {challenge.wrongSentence}
                    </p>
                  </>
                )}
                <p className="mt-2 text-xs text-charcoal/60 dark:text-zinc-400">{challenge.hint}</p>
              </div>

              {challenge.type === "quiz" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {challenge.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedOption(option)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
                        "border-burgundy-100 bg-white hover:bg-burgundy-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                        selectedOption === option && "border-burgundy-300 bg-burgundy-50 dark:border-burgundy-700 dark:bg-burgundy-900/30",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={textAnswer}
                  onChange={(event) => setTextAnswer(event.target.value)}
                  placeholder="Write your answer..."
                  className="min-h-24 w-full rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal outline-none transition focus:border-burgundy-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void checkCurrentAnswer()} disabled={checking || loadingChallenge || currentAnswer().length === 0}>
                  {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  AI Check
                </Button>
                <Button variant="secondary" onClick={() => void nextRound()} disabled={loadingChallenge || checking}>
                  Next Round
                </Button>
                <Button variant="ghost" onClick={resetSession} disabled={loadingChallenge || checking}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Reset Session
                </Button>
              </div>
            </div>
          ) : null}

          {evaluation ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                evaluation.isCorrect
                  ? "border-burgundy-300 bg-burgundy-50 text-burgundy-800 dark:border-burgundy-700 dark:bg-burgundy-950/30 dark:text-white"
                  : "border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
              )}
            >
              <p className="font-semibold">{evaluation.isCorrect ? "Correct" : "Need improvement"} (+{evaluation.scoreDelta})</p>
              <p className="mt-1">{evaluation.feedback}</p>
              <p className="mt-1 text-xs">{evaluation.nativeSample}</p>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-sm text-burgundy-800 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-white">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Swords className="h-5 w-5 text-burgundy-700 dark:text-white" />
            {mode === "ai" ? "AI Coach" : "Battle Board"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mode === "ai" ? (
            <>
              <p className="text-sm text-charcoal/70 dark:text-zinc-300">
                AI analyzes each answer and gives feedback like a personal coach.
              </p>
              {aiTips.length === 0 ? (
                <p className="text-sm text-charcoal/60 dark:text-zinc-400">No tips yet. Play and get personalized feedback.</p>
              ) : (
                <div className="space-y-2">
                  {aiTips.map((tip, index) => (
                    <div
                      key={`${tip}-${index}`}
                      className="rounded-xl border border-burgundy-100 bg-white p-3 text-sm text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <Sparkles className="mr-2 inline h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
                      {tip}
                    </div>
                  ))}
                </div>
              )}
              <Link to={aiHref} className="inline-block">
                <Button variant="secondary">Open Iman Chat</Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-charcoal/70 dark:text-zinc-300">Compete with classmates in real-time style leaderboard.</p>
              <Select value={duelTarget?.id ?? ""} onValueChange={setDuelTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select opponent" />
                </SelectTrigger>
                <SelectContent>
                  {leaderboard
                    .filter((entry) => !entry.isMe)
                    .map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.fullName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">Duel</p>
                <p className="mt-1 text-sm text-charcoal dark:text-zinc-100">You: {score}</p>
                <p className="text-sm text-charcoal dark:text-zinc-100">
                  {duelTarget ? `${duelTarget.fullName}: ${duelTarget.score}` : "No opponent yet"}
                </p>
              </div>

              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-charcoal/60 dark:text-zinc-400">No participants yet.</p>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3 py-2",
                        entry.isMe
                          ? "border-burgundy-300 bg-burgundy-50 dark:border-burgundy-700 dark:bg-burgundy-900/25"
                          : "border-burgundy-100 bg-white dark:border-zinc-700 dark:bg-zinc-900",
                      )}
                    >
                      <p className="truncate text-sm font-medium text-charcoal dark:text-zinc-100">
                        #{index + 1} {entry.fullName}
                      </p>
                      <p className="text-sm font-semibold text-burgundy-700 dark:text-white">{entry.score}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


