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
        "- Understand user input in English, Russian, and Uzbek.",
        "- For beginner/elementary: answer mainly in simple English (A1/A2).",
        `- If user writes in RU/UZ: still answer in English, explain only difficult words in ${supportLanguage.toUpperCase()} when needed.`,
        "- Never duplicate one sentence in two languages.",
        "- Do not output full English + Russian/Uzbek translation pairs.",
        "- Keep answers short, practical, and tutor-like.",
      ].join("\n")
    : [
        "Language rule:",
        "- Understand user input in English, Russian, and Uzbek.",
        "- Reply only in English.",
        "- If user writes in RU/UZ, politely ask to continue in English, then continue in English.",
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

