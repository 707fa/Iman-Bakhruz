import type { Achievement, AchievementStats, EarnedAchievement } from "../types";
import { makeId } from "./utils";

const STORAGE_PREFIX = "iman-achievements-v1";

const definitions: Achievement[] = [
  {
    id: "ach-streak-3",
    key: "streak_3",
    category: "streak",
    titleEn: "3-Day Streak",
    titleRu: "3 дня подряд",
    titleUz: "3 kun ketma-ket",
    descriptionEn: "Practiced English 3 days in a row",
    descriptionRu: "Практиковал английский 3 дня подряд",
    descriptionUz: "Ingliz tilini 3 kun ketma-ket mashq qildi",
    icon: "🔥",
    condition: (s) => s.streakDays >= 3,
  },
  {
    id: "ach-streak-7",
    key: "streak_7",
    category: "streak",
    titleEn: "Week Warrior",
    titleRu: "Воин недели",
    titleUz: "Hafta jangchisi",
    descriptionEn: "7-day streak — a full week of practice!",
    descriptionRu: "7 дней подряд — целая неделя практики!",
    descriptionUz: "7 kun ketma-ket — to'liq hafta mashq!",
    icon: "⚡",
    condition: (s) => s.streakDays >= 7,
  },
  {
    id: "ach-streak-30",
    key: "streak_30",
    category: "streak",
    titleEn: "Monthly Champion",
    titleRu: "Месячный чемпион",
    titleUz: "Oylik chempion",
    descriptionEn: "30-day streak — incredible discipline!",
    descriptionRu: "30 дней подряд — невероятная дисциплина!",
    descriptionUz: "30 kun ketma-ket — ajoyib intizom!",
    icon: "👑",
    condition: (s) => s.streakDays >= 30,
  },
  {
    id: "ach-speaking-10",
    key: "speaking_10",
    category: "speaking",
    titleEn: "First Steps",
    titleRu: "Первые шаги",
    titleUz: "Birinchi qadamlar",
    descriptionEn: "Completed 10 speaking exercises",
    descriptionRu: "Выполнил 10 speaking упражнений",
    descriptionUz: "10 ta speaking mashqini bajarildi",
    icon: "🎤",
    condition: (s) => s.totalSpeakingAttempts >= 10,
  },
  {
    id: "ach-speaking-50",
    key: "speaking_50",
    category: "speaking",
    titleEn: "Voice Active",
    titleRu: "Голос активен",
    titleUz: "Ovoz faol",
    descriptionEn: "Completed 50 speaking exercises",
    descriptionRu: "Выполнил 50 speaking упражнений",
    descriptionUz: "50 ta speaking mashqini bajarildi",
    icon: "📢",
    condition: (s) => s.totalSpeakingAttempts >= 50,
  },
  {
    id: "ach-speaking-100",
    key: "speaking_100",
    category: "speaking",
    titleEn: "Speaking Pro",
    titleRu: "Про говорения",
    titleUz: "Speaking professional",
    descriptionEn: "100 speaking exercises completed!",
    descriptionRu: "100 speaking упражнений выполнено!",
    descriptionUz: "100 ta speaking mashqini bajarildi!",
    icon: "🎙️",
    condition: (s) => s.totalSpeakingAttempts >= 100,
  },
  {
    id: "ach-homework-1",
    key: "homework_1",
    category: "homework",
    titleEn: "Homework Starter",
    titleRu: "Начинающий домашку",
    titleUz: "Uy vazifasi boshlovchisi",
    descriptionEn: "Submitted your first homework",
    descriptionRu: "Сдал первую домашку",
    descriptionUz: "Birinchi uy vazifasini topshirdi",
    icon: "📝",
    condition: (s) => s.totalHomeworkSubmitted >= 1,
  },
  {
    id: "ach-homework-10",
    key: "homework_10",
    category: "homework",
    titleEn: "Homework Hero",
    titleRu: "Герой домашки",
    titleUz: "Uy vazifasi qahramoni",
    descriptionEn: "Submitted 10 homework assignments",
    descriptionRu: "Сдал 10 домашних заданий",
    descriptionUz: "10 ta uy vazifasini topshirdi",
    icon: "✅",
    condition: (s) => s.totalHomeworkSubmitted >= 10,
  },
  {
    id: "ach-homework-perfect",
    key: "homework_perfect",
    category: "homework",
    titleEn: "Perfect Score",
    titleRu: "Идеальный балл",
    titleUz: "Mukammal ball",
    descriptionEn: "Got 100% on a homework assignment",
    descriptionRu: "Получил 100% за домашнее задание",
    descriptionUz: "Uy vazifasidan 100% oldi",
    icon: "💯",
    condition: (s) => s.homeworkPerfectScore >= 1,
  },
  {
    id: "ach-grammar-80",
    key: "grammar_80",
    category: "grammar",
    titleEn: "Grammar Star",
    titleRu: "Звезда грамматики",
    titleUz: "Grammatika yulduzi",
    descriptionEn: "Grammar score reached 80%+",
    descriptionRu: "Грамматика достигла 80%+",
    descriptionUz: "Grammatika 80%+ ga yetdi",
    icon: "⭐",
    condition: (s) => s.grammarScore >= 80,
  },
  {
    id: "ach-vocabulary-80",
    key: "vocabulary_80",
    category: "vocabulary",
    titleEn: "Word Master",
    titleRu: "Мастер слов",
    titleUz: "So'z ustasi",
    descriptionEn: "Vocabulary score reached 80%+",
    descriptionRu: "Словарный запас достиг 80%+",
    descriptionUz: "Lug'at 80%+ ga yetdi",
    icon: "📚",
    condition: (s) => s.vocabularyScore >= 80,
  },
  {
    id: "ach-games-5",
    key: "games_5",
    category: "games",
    titleEn: "Game Player",
    titleRu: "Игрок",
    titleUz: "O'yinchi",
    descriptionEn: "Played 5 games",
    descriptionRu: "Сыграл 5 игр",
    descriptionUz: "5 ta o'yin o'ynadi",
    icon: "🎮",
    condition: (s) => s.gamesPlayed >= 5,
  },
  {
    id: "ach-games-win-3",
    key: "games_win_3",
    category: "games",
    titleEn: "Winner",
    titleRu: "Победитель",
    titleUz: "G'olib",
    descriptionEn: "Won 3 games",
    descriptionRu: "Выиграл 3 игры",
    descriptionUz: "3 ta o'yinda g'alaba qozondi",
    icon: "🏆",
    condition: (s) => s.gameWins >= 3,
  },
  {
    id: "ach-points-500",
    key: "points_500",
    category: "special",
    titleEn: "Rising Star",
    titleRu: "Восходящая звезда",
    titleUz: "Ko'tarilgan yulduz",
    descriptionEn: "Earned 500 total points",
    descriptionRu: "Набрал 500 баллов всего",
    descriptionUz: "Jami 500 ball to'pladi",
    icon: "🌟",
    condition: (s) => s.totalPoints >= 500,
  },
  {
    id: "ach-points-2000",
    key: "points_2000",
    category: "special",
    titleEn: "Superstar",
    titleRu: "Суперзвезда",
    titleUz: "Super yulduz",
    descriptionEn: "Earned 2000 total points",
    descriptionRu: "Набрал 2000 баллов",
    descriptionUz: "2000 ball to'pladi",
    icon: "💫",
    condition: (s) => s.totalPoints >= 2000,
  },
  {
    id: "ach-chat-50",
    key: "chat_50",
    category: "special",
    titleEn: "Chat Explorer",
    titleRu: "Исследователь чата",
    titleUz: "Chat tadqiqotchisi",
    descriptionEn: "Sent 50 messages to AI tutor",
    descriptionRu: "Отправил 50 сообщений AI-тьютору",
    descriptionUz: "AI o'qituvchiga 50 ta xabar yubordi",
    icon: "💬",
    condition: (s) => s.aiChatMessages >= 50,
  },
];

export function getAchievementDefinitions(): Achievement[] {
  return definitions;
}

export function getAchievementsByCategory(category: Achievement["category"]): Achievement[] {
  return definitions.filter((a) => a.category === category);
}

export function checkNewAchievements(stats: AchievementStats, existingIds: Set<string>): Achievement[] {
  return definitions.filter((a) => !existingIds.has(a.id) && a.condition(stats));
}

export function readEarnedAchievements(studentId: string): EarnedAchievement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${studentId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: unknown) => {
      if (!item || typeof item !== "object") return false;
      const rec = item as Record<string, unknown>;
      return typeof rec.achievementId === "string" && typeof rec.earnedAt === "string";
    }) as EarnedAchievement[];
  } catch {
    return [];
  }
}

export function writeEarnedAchievements(studentId: string, achievements: EarnedAchievement[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${studentId}`, JSON.stringify(achievements));
}

export function awardAchievements(studentId: string, stats: AchievementStats): EarnedAchievement[] {
  const existing = readEarnedAchievements(studentId);
  const existingIds = new Set(existing.map((e) => e.achievementId));
  const newlyEarned = checkNewAchievements(stats, existingIds);

  if (newlyEarned.length === 0) return [];

  const newRecords: EarnedAchievement[] = newlyEarned.map((achievement) => ({
    id: makeId("ach"),
    achievementId: achievement.id,
    studentId,
    earnedAt: new Date().toISOString(),
  }));

  const all = [...existing, ...newRecords];
  writeEarnedAchievements(studentId, all);
  return newRecords;
}
