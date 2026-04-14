import type { Locale } from "./i18n";

export type StudentLevel = "beginner" | "elementary" | "pre-intermediate" | "intermediate";

export function normalizeStudentLevelFromGroupTitle(groupTitle?: string): StudentLevel {
  const normalized = String(groupTitle || "").trim().toLowerCase();
  if (!normalized) return "beginner";

  if (normalized.includes("beginner")) return "beginner";
  if (normalized.includes("elementary")) return "elementary";
  if (normalized.includes("pre") && normalized.includes("inter")) return "pre-intermediate";
  if (normalized.includes("upper") && normalized.includes("inter")) return "intermediate";
  if (normalized.includes("intermediate")) return "intermediate";

  return "beginner";
}

export function isFoundationLevel(level: StudentLevel): boolean {
  return level === "beginner" || level === "elementary";
}

export function resolveAiFeedbackLanguage(level: StudentLevel, locale: Locale): "ru" | "uz" | "en" {
  if (!isFoundationLevel(level)) {
    return "en";
  }
  if (locale === "uz") return "uz";
  if (locale === "en") return "en";
  return "ru";
}

export function buildImanChatContextPrompt(params: {
  level: StudentLevel;
  locale: Locale;
  groupTitle?: string;
  groupTime?: string;
}): string {
  const { level, locale, groupTitle, groupTime } = params;
  const preferredLanguage = resolveAiFeedbackLanguage(level, locale);

  const languageRule = isFoundationLevel(level)
    ? [
        "Language rule:",
        `- Main explanation language: ${preferredLanguage.toUpperCase()}.`,
        "- Also include short simple English examples after explanation.",
      ].join("\n")
    : [
        "Language rule:",
        "- Reply only in English.",
        "- Keep explanations clear and concise.",
      ].join("\n");

  return [
    "You are Iman Chat, an English tutor assistant for students.",
    `Student level: ${level}.`,
    `Student group: ${groupTitle || "Unknown group"}.`,
    `Class time: ${groupTime || "Unknown time"}.`,
    languageRule,
    "When checking homework, provide: mistakes, corrected version, short tips.",
    "When answering questions, keep answers practical and student-friendly.",
  ].join("\n");
}

