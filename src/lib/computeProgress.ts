import type { ProgressSnapshot, SpeakingSessionSnapshot, StatusBadge, Student } from "../types";
import { readSpeakingSnapshot, getDailyRemainingCount } from "./speakingSession";

const STORAGE_AI_CHAT_PREFIX = "iman-ai-chat-v2";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function readAiChatMessageCount(userId: string | undefined): number {
  if (!userId || typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_AI_CHAT_PREFIX}:${userId}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return 0;
    return parsed.filter((item: unknown) => {
      if (!item || typeof item !== "object") return false;
      const rec = item as Record<string, unknown>;
      return rec.role === "user";
    }).length;
  } catch {
    return 0;
  }
}

function computeSpeakingScore(snapshot: SpeakingSessionSnapshot): number {
  const totalAttempts = snapshot.attempts.length;
  if (totalAttempts === 0) return 0;

  const recentScores = snapshot.attempts
    .slice(0, 30)
    .map((item) => item.score)
    .filter((score) => score > 0);

  if (recentScores.length === 0) return 10;
  const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  const practiceBonus = Math.min(20, totalAttempts * 0.8);
  return clamp(avgScore * 0.6 + practiceBonus);
}

function computeGrammarScore(snapshot: SpeakingSessionSnapshot): number {
  const grammarMistakes = snapshot.mistakes.filter((item) => item.category === "grammar");
  if (grammarMistakes.length === 0) {
    const totalAttempts = snapshot.attempts.length;
    return clamp(Math.min(80, totalAttempts * 2));
  }
  const recentGrammarScores = snapshot.attempts
    .slice(0, 30)
    .map((item) => item.grammarScore ?? 0)
    .filter((score) => score > 0);

  if (recentGrammarScores.length === 0) return 30;
  const avg = recentGrammarScores.reduce((sum, score) => sum + score, 0) / recentGrammarScores.length;
  return clamp(avg);
}

function computeVocabularyScore(snapshot: SpeakingSessionSnapshot): number {
  const vocabMistakes = snapshot.mistakes.filter((item) => item.category === "vocabulary");
  if (vocabMistakes.length === 0) {
    const totalAttempts = snapshot.attempts.length;
    return clamp(Math.min(85, totalAttempts * 2.2));
  }
  const recentVocabScores = snapshot.attempts
    .slice(0, 30)
    .map((item) => item.vocabularyScore ?? 0)
    .filter((score) => score > 0);

  if (recentVocabScores.length === 0) return 35;
  const avg = recentVocabScores.reduce((sum, score) => sum + score, 0) / recentVocabScores.length;
  return clamp(avg);
}

function computeHomeworkScore(aiChatCount: number): number {
  return clamp(Math.min(100, aiChatCount * 4));
}

function computeAttendance(points: number, streakDays: number): number {
  const pointRatio = Math.min(1, points / 500);
  const streakRatio = Math.min(1, streakDays / 30);
  return clamp(pointRatio * 60 + streakRatio * 40);
}

function computeWeeklyXp(points: number, snapshot: SpeakingSessionSnapshot, aiChatCount: number): number {
  const recentAttempts = snapshot.attempts.filter((item) => {
    const createdAt = Date.parse(item.createdAt);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return createdAt > weekAgo;
  });
  const speakingXp = recentAttempts.reduce((sum, item) => sum + item.score, 0);
  return Math.round(points * 0.5 + speakingXp * 0.3 + aiChatCount * 2);
}

function computeLevel(points: number): number {
  if (points < 50) return 1;
  if (points < 150) return 2;
  if (points < 350) return 3;
  if (points < 700) return 4;
  if (points < 1200) return 5;
  if (points < 2000) return 6;
  if (points < 3500) return 7;
  if (points < 5000) return 8;
  if (points < 8000) return 9;
  return 10;
}

function computeStreakDays(snapshot: SpeakingSessionSnapshot): number {
  const today = new Date();
  let streak = 0;

  for (let daysAgo = 0; daysAgo < 60; daysAgo += 1) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - daysAgo);
    const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;

    if (daysAgo === 0) {
      const dailyRemaining = getDailyRemainingCount(snapshot);
      const dailyTarget = 20;
      if (dailyRemaining < dailyTarget) {
        streak += 1;
        continue;
      }
    }

    const hasAttemptOnDate = snapshot.attempts.some((item) => {
      const attemptDate = item.createdAt.slice(0, 10);
      return attemptDate === dateKey;
    });

    if (hasAttemptOnDate) {
      streak += 1;
    } else if (daysAgo > 0) {
      break;
    }
  }

  return streak;
}

function computeStatusBadge(grammar: number, speaking: number, vocabulary: number, homework: number): StatusBadge {
  const avg = (grammar + speaking + vocabulary + homework) / 4;
  if (avg >= 60) return "green";
  if (avg >= 30) return "yellow";
  return "red";
}

export function computeStudentProgress(student: Student): ProgressSnapshot {
  const snapshot = readSpeakingSnapshot(student.id);
  const aiChatCount = readAiChatMessageCount(student.id);

  const grammar = computeGrammarScore(snapshot);
  const speaking = computeSpeakingScore(snapshot);
  const vocabulary = computeVocabularyScore(snapshot);
  const homework = computeHomeworkScore(aiChatCount);
  const attendance = computeAttendance(student.points, student.progress?.streakDays ?? computeStreakDays(snapshot));
  const status = computeStatusBadge(grammar, speaking, vocabulary, homework);
  const weeklyXp = computeWeeklyXp(student.points, snapshot, aiChatCount);
  const level = computeLevel(student.points);
  const streakDays = computeStreakDays(snapshot);

  return {
    status,
    grammar,
    vocabulary,
    homework,
    speaking,
    attendance,
    weeklyXp,
    level,
    streakDays,
    gameWins: student.progress?.gameWins ?? 0,
    gamesPlayed: student.progress?.gamesPlayed ?? 0,
    gameBonusPoints: student.progress?.gameBonusPoints ?? 0,
  };
}

export function computeStudentStatusBadge(student: Student): StatusBadge {
  const progress = computeStudentProgress(student);
  return progress.status;
}
