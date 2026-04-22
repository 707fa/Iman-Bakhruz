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
  const supportLanguage = preferredLanguage === "en" ? "ru/uz" : preferredLanguage;

  const languageRule = isFoundationLevel(level)
    ? [
        "Language rule:",
        "- Understand and accept user input in English, Russian, and Uzbek.",
        "- Output ratio target for beginner/elementary:",
        "- About 70% simple English + about 30% support language.",
        `- Support language for this student: ${supportLanguage.toUpperCase()}.`,
        "- Keep English words short and easy (A1/A2).",
        "- Correct mistakes gently like a friendly tutor.",
      ].join("\n")
    : [
        "Language rule:",
        "- Understand and accept user input in English, Russian, and Uzbek.",
        "- Output ratio target for higher levels:",
        "- About 98% English, up to 2% support language only if needed for clarity.",
        "- Keep explanations clear, concise, and practical.",
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
