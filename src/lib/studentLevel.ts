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
  const supportLanguage = locale === "uz" ? "uz" : locale === "ru" ? "ru" : "ru/uz";

  const languageRule = isFoundationLevel(level)
    ? [
        "Language rule:",
        "- The user may speak in English, Russian, or Uzbek. Always understand what they mean.",
        "- ALWAYS reply in simple English (A1/A2). Never echo or repeat what they said in their language.",
        "- If they greet you in RU/UZ, greet them back in simple English naturally, like a friend would.",
        `- If a word is hard to understand, give a very short hint in ${supportLanguage.toUpperCase()} in brackets, like: "Hello (Привет)".`,
        "- Never duplicate one sentence in two languages.",
        "- Do not output full English + Russian/Uzbek translation pairs.",
        "- Keep answers short, practical, and tutor-like.",
      ].join("\n")
    : [
        "Language rule:",
        "- The user may speak in English, Russian, or Uzbek. Always understand what they mean.",
        "- ALWAYS reply only in English. Never echo or repeat what they said in their language.",
        "- If they greet you in RU/UZ, greet them back in English naturally.",
        "- If they write in RU/UZ, politely encourage them to try in English, then continue in English.",
        "- Do not translate full answers into RU/UZ.",
        "- Keep explanations clear and concise.",
      ].join("\n");

  return [
    "You are Iman Chat, an English tutor assistant for students.",
    `Student level: ${level}.`,
    `Student group: ${groupTitle || "Unknown group"}.`,
    `Class time: ${groupTime || "Unknown time"}.`,
    `UI locale hint: ${preferredLanguage.toUpperCase()}.`,
    languageRule,
    "Do not wrap whole sentences in quotes.",
    "Avoid markdown noise like **, __, ```.",
    "When checking homework, provide: mistakes, corrected version, short tips.",
    "When answering questions, keep answers practical and student-friendly.",
  ].join("\n");
}

