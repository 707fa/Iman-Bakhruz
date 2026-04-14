import type {
  SpeakingAnalysisResult,
  SpeakingAttemptHistoryItem,
  SpeakingMistakeBankItem,
  SpeakingMistakeCategory,
  SpeakingQuestion,
  SpeakingSessionSnapshot,
} from "../types";

const STORAGE_PREFIX = "result-speaking-session-v2";
const DAILY_TARGET_DEFAULT = 20;
const WEEKLY_TARGET_DEFAULT = 10;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asDateKey(value?: Date): string {
  const date = value ?? new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asWeekKey(value?: Date): string {
  const date = value ? new Date(value) : new Date();
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function emptySnapshot(now = new Date()): SpeakingSessionSnapshot {
  return {
    attempts: [],
    mistakes: [],
    daily: {
      dateKey: asDateKey(now),
      completedQuestionIds: [],
    },
    weeklyExam: {
      weekKey: asWeekKey(now),
      questionIds: [],
      completedQuestionIds: [],
      started: false,
      promptShownWeekKey: undefined,
    },
  };
}

function normalizeSnapshot(raw: unknown): SpeakingSessionSnapshot {
  const now = new Date();
  const fallback = emptySnapshot(now);
  const data = toRecord(raw);
  if (!data) return fallback;

  const attempts = readArray<unknown>(data.attempts)
    .map((item) => {
      const rec = toRecord(item);
      if (!rec) return null;
      const id = typeof rec.id === "string" ? rec.id : makeId("attempt");
      const questionId = typeof rec.questionId === "string" ? rec.questionId : "";
      const question = typeof rec.question === "string" ? rec.question : "";
      const transcript = typeof rec.transcript === "string" ? rec.transcript : "";
      const createdAt = typeof rec.createdAt === "string" ? rec.createdAt : new Date().toISOString();
      if (!questionId || !question || !transcript) return null;
      return {
        id,
        questionId,
        question,
        topic: typeof rec.topic === "string" ? rec.topic : undefined,
        level: typeof rec.level === "string" ? (rec.level as SpeakingQuestion["level"]) : undefined,
        transcript,
        score: Number(rec.score) || 0,
        grammarScore: Number(rec.grammarScore) || undefined,
        fluencyScore: Number(rec.fluencyScore) || undefined,
        vocabularyScore: Number(rec.vocabularyScore) || undefined,
        durationSec: Number(rec.durationSec) || undefined,
        mode: rec.mode === "weekly_exam" ? "weekly_exam" : "daily",
        createdAt,
      } as SpeakingAttemptHistoryItem;
    })
    .filter((item): item is SpeakingAttemptHistoryItem => item !== null)
    .slice(0, 300);

  const mistakes = readArray<unknown>(data.mistakes)
    .map((item) => {
      const rec = toRecord(item);
      if (!rec) return null;
      const category = rec.category === "vocabulary" || rec.category === "pronunciation" ? rec.category : "grammar";
      const level = typeof rec.level === "string" ? (rec.level as SpeakingQuestion["level"]) : "beginner";
      const topic = typeof rec.topic === "string" ? rec.topic : "";
      const reason = typeof rec.reason === "string" ? rec.reason : "";
      if (!topic || !reason) return null;
      return {
        id: typeof rec.id === "string" ? rec.id : makeId("mistake"),
        questionId: typeof rec.questionId === "string" ? rec.questionId : "",
        topic,
        level,
        category,
        original: typeof rec.original === "string" ? rec.original : "",
        corrected: typeof rec.corrected === "string" ? rec.corrected : "",
        reason,
        createdAt: typeof rec.createdAt === "string" ? rec.createdAt : new Date().toISOString(),
      } as SpeakingMistakeBankItem;
    })
    .filter((item): item is SpeakingMistakeBankItem => item !== null)
    .slice(0, 500);

  const dailyRaw = toRecord(data.daily);
  const weeklyRaw = toRecord(data.weeklyExam);

  return {
    attempts,
    mistakes,
    daily: {
      dateKey: typeof dailyRaw?.dateKey === "string" ? dailyRaw.dateKey : fallback.daily.dateKey,
      completedQuestionIds: readArray<string>(dailyRaw?.completedQuestionIds).filter((item) => typeof item === "string"),
      reminderShownDateKey:
        typeof dailyRaw?.reminderShownDateKey === "string" ? dailyRaw.reminderShownDateKey : undefined,
    },
    weeklyExam: {
      weekKey: typeof weeklyRaw?.weekKey === "string" ? weeklyRaw.weekKey : fallback.weeklyExam.weekKey,
      questionIds: readArray<string>(weeklyRaw?.questionIds).filter((item) => typeof item === "string"),
      completedQuestionIds: readArray<string>(weeklyRaw?.completedQuestionIds).filter((item) => typeof item === "string"),
      started: Boolean(weeklyRaw?.started),
      promptShownWeekKey:
        typeof weeklyRaw?.promptShownWeekKey === "string" ? weeklyRaw.promptShownWeekKey : undefined,
    },
  };
}

function withCurrentPeriods(snapshot: SpeakingSessionSnapshot): SpeakingSessionSnapshot {
  const today = asDateKey();
  const currentWeek = asWeekKey();

  const nextDaily =
    snapshot.daily.dateKey === today
      ? snapshot.daily
      : {
          dateKey: today,
          completedQuestionIds: [],
          reminderShownDateKey: undefined,
        };

  const nextWeekly =
    snapshot.weeklyExam.weekKey === currentWeek
      ? snapshot.weeklyExam
      : {
          weekKey: currentWeek,
          questionIds: [],
          completedQuestionIds: [],
          started: false,
          promptShownWeekKey: undefined,
        };

  if (nextDaily === snapshot.daily && nextWeekly === snapshot.weeklyExam) return snapshot;
  return {
    ...snapshot,
    daily: nextDaily,
    weeklyExam: nextWeekly,
  };
}

function seededShuffle<T>(items: T[], seedKey: string): T[] {
  const copy = [...items];
  let seed = 0;
  for (let index = 0; index < seedKey.length; index += 1) {
    seed = (seed * 31 + seedKey.charCodeAt(index)) >>> 0;
  }
  if (seed === 0) seed = 123456789;

  for (let i = copy.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickWeakTopics(snapshot: SpeakingSessionSnapshot, level: SpeakingQuestion["level"]): string[] {
  const scores = new Map<string, number>();
  for (const item of snapshot.mistakes) {
    if (item.level !== level) continue;
    scores.set(item.topic, (scores.get(item.topic) ?? 0) + 1);
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([topic]) => topic);
}

export function readSpeakingSnapshot(userId: string): SpeakingSessionSnapshot {
  if (typeof window === "undefined") return withCurrentPeriods(emptySnapshot());
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${userId}`);
  if (!raw) return withCurrentPeriods(emptySnapshot());
  try {
    return withCurrentPeriods(normalizeSnapshot(JSON.parse(raw)));
  } catch {
    return withCurrentPeriods(emptySnapshot());
  }
}

export function writeSpeakingSnapshot(userId: string, snapshot: SpeakingSessionSnapshot): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${userId}`, JSON.stringify(snapshot));
}

export function getDailyRemainingCount(snapshot: SpeakingSessionSnapshot, target = DAILY_TARGET_DEFAULT): number {
  return Math.max(0, target - snapshot.daily.completedQuestionIds.length);
}

export function getWeeklyRemainingCount(snapshot: SpeakingSessionSnapshot, target = WEEKLY_TARGET_DEFAULT): number {
  return Math.max(0, target - snapshot.weeklyExam.completedQuestionIds.length);
}

export function ensureWeeklyQuestionSet(
  snapshot: SpeakingSessionSnapshot,
  levelQuestions: SpeakingQuestion[],
  target = WEEKLY_TARGET_DEFAULT,
  seedKey = "default",
): SpeakingSessionSnapshot {
  const normalized = withCurrentPeriods(snapshot);
  if (normalized.weeklyExam.questionIds.length >= target) return normalized;

  const baseSeed = `${normalized.weeklyExam.weekKey}:${seedKey}:${levelQuestions.length}`;
  const picked = seededShuffle(levelQuestions, baseSeed)
    .slice(0, Math.min(target, levelQuestions.length))
    .map((item) => item.id);
  return {
    ...normalized,
    weeklyExam: {
      ...normalized.weeklyExam,
      questionIds: picked,
      completedQuestionIds: normalized.weeklyExam.completedQuestionIds.filter((id) => picked.includes(id)),
    },
  };
}

export function chooseNextDailyQuestion(
  levelQuestions: SpeakingQuestion[],
  snapshot: SpeakingSessionSnapshot,
): SpeakingQuestion | null {
  if (levelQuestions.length === 0) return null;

  const normalized = withCurrentPeriods(snapshot);
  const completed = new Set(normalized.daily.completedQuestionIds);
  const remaining = levelQuestions.filter((item) => !completed.has(item.id));
  const pool = remaining.length > 0 ? remaining : levelQuestions;
  const weakTopics = pickWeakTopics(normalized, pool[0]?.level ?? "beginner");
  const weakPool = pool.filter((item) => weakTopics.includes(item.topic));
  const pickWeak = weakPool.length > 0 && Math.random() < 0.3;
  const candidatePool = pickWeak ? weakPool : pool;
  return candidatePool[Math.floor(Math.random() * candidatePool.length)] ?? pool[0] ?? null;
}

export function getWeeklyCurrentQuestion(
  levelQuestions: SpeakingQuestion[],
  snapshot: SpeakingSessionSnapshot,
): SpeakingQuestion | null {
  if (levelQuestions.length === 0) return null;
  const normalized = ensureWeeklyQuestionSet(snapshot, levelQuestions);
  const completed = new Set(normalized.weeklyExam.completedQuestionIds);
  const nextQuestionId = normalized.weeklyExam.questionIds.find((id) => !completed.has(id));
  if (!nextQuestionId) return null;
  return levelQuestions.find((item) => item.id === nextQuestionId) ?? null;
}

function classifyCategory(reason: string): SpeakingMistakeCategory {
  const text = reason.toLowerCase();
  if (text.includes("pronunciation") || text.includes("stress") || text.includes("intonation")) {
    return "pronunciation";
  }
  if (text.includes("vocab") || text.includes("word choice") || text.includes("lexic")) {
    return "vocabulary";
  }
  return "grammar";
}

function extractPronunciationHint(feedback: string): string | null {
  const parts = feedback
    .split(/[.!?]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const match = parts.find((item) => /pronunci|stress|intonation|speak/i.test(item));
  return match ?? null;
}

export function appendSpeakingAttempt(
  snapshot: SpeakingSessionSnapshot,
  payload: {
    question: SpeakingQuestion;
    transcript: string;
    durationSec: number;
    mode: "daily" | "weekly_exam";
    analysis: SpeakingAnalysisResult;
  },
): SpeakingSessionSnapshot {
  const normalized = withCurrentPeriods(snapshot);
  const { question, transcript, durationSec, mode, analysis } = payload;

  const attempt: SpeakingAttemptHistoryItem = {
    id: makeId("attempt"),
    questionId: question.id,
    question: question.prompt,
    topic: question.topic,
    level: question.level,
    transcript,
    score: analysis.score,
    grammarScore: analysis.grammarScore,
    fluencyScore: analysis.fluencyScore,
    vocabularyScore: analysis.vocabularyScore,
    durationSec,
    mode,
    createdAt: new Date().toISOString(),
  };

  const nextAttempts = [attempt, ...normalized.attempts].slice(0, 250);

  const nextMistakes: SpeakingMistakeBankItem[] = [...normalized.mistakes];
  for (const item of analysis.mistakes) {
    if (!item.reason.trim()) continue;
    nextMistakes.unshift({
      id: makeId("mistake"),
      questionId: question.id,
      topic: question.topic,
      level: question.level,
      category: classifyCategory(item.reason),
      original: item.original,
      corrected: item.corrected,
      reason: item.reason,
      createdAt: new Date().toISOString(),
    });
  }

  const pronunciationHint = extractPronunciationHint(analysis.feedback);
  if (pronunciationHint) {
    nextMistakes.unshift({
      id: makeId("mistake"),
      questionId: question.id,
      topic: question.topic,
      level: question.level,
      category: "pronunciation",
      original: "",
      corrected: "",
      reason: pronunciationHint,
      createdAt: new Date().toISOString(),
    });
  }

  const nextDailyCompleted = normalized.daily.completedQuestionIds.includes(question.id)
    ? normalized.daily.completedQuestionIds
    : [...normalized.daily.completedQuestionIds, question.id];

  const weeklyCompleted =
    mode === "weekly_exam" && !normalized.weeklyExam.completedQuestionIds.includes(question.id)
      ? [...normalized.weeklyExam.completedQuestionIds, question.id]
      : normalized.weeklyExam.completedQuestionIds;

  return {
    attempts: nextAttempts,
    mistakes: nextMistakes.slice(0, 500),
    daily: {
      ...normalized.daily,
      completedQuestionIds: nextDailyCompleted,
    },
    weeklyExam: {
      ...normalized.weeklyExam,
      completedQuestionIds: weeklyCompleted,
    },
  };
}

export function markReminderShown(snapshot: SpeakingSessionSnapshot): SpeakingSessionSnapshot {
  const normalized = withCurrentPeriods(snapshot);
  return {
    ...normalized,
    daily: {
      ...normalized.daily,
      reminderShownDateKey: normalized.daily.dateKey,
    },
  };
}

export function resetWeeklyExam(snapshot: SpeakingSessionSnapshot): SpeakingSessionSnapshot {
  const normalized = withCurrentPeriods(snapshot);
  return {
    ...normalized,
    weeklyExam: {
      ...normalized.weeklyExam,
      questionIds: [],
      completedQuestionIds: [],
      started: false,
      promptShownWeekKey: undefined,
    },
  };
}

export function markWeeklyExamStarted(snapshot: SpeakingSessionSnapshot): SpeakingSessionSnapshot {
  const normalized = withCurrentPeriods(snapshot);
  return {
    ...normalized,
    weeklyExam: {
      ...normalized.weeklyExam,
      started: true,
      promptShownWeekKey: normalized.weeklyExam.weekKey,
    },
  };
}

export function getWeakMistakes(
  snapshot: SpeakingSessionSnapshot,
  level: SpeakingQuestion["level"],
  limit = 10,
): SpeakingMistakeBankItem[] {
  return snapshot.mistakes.filter((item) => item.level === level).slice(0, limit);
}
