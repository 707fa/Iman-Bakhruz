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
  const supportLanguage = locale === "uz" ? "uz" : locale === "ru" ? "ru" : "ru/uz";

  const languageRule = isFoundationLevel(level)
    ? [
        "Language rule:",
        "- Understand and accept user input in English, Russian, and Uzbek.",
        "- For beginner/elementary: answer mainly in SIMPLE ENGLISH (A1/A2).",
        `- If the user writes in RU/UZ: still answer in English, but explain only DIFFICULT words in ${supportLanguage.toUpperCase()} when needed.`,
        "- Do NOT repeat the same sentence in two languages.",
        "- Do NOT give full EN + RU/UZ translation of the same response.",
        "- Keep answers short, practical, and tutor-like.",
      ].join("\n")
    : [
        "Language rule:",
        "- Understand and accept user input in English, Russian, and Uzbek.",
        "- For pre-intermediate/intermediate and above: answer in English only.",
        "- If user writes in RU/UZ, politely ask to continue in English and then provide English help.",
        "- Do NOT translate your whole answer into RU/UZ.",
        "- Keep explanations clear, concise, and practical.",
      ].join("\n");

  return [
    "You are Iman Chat, an English tutor assistant for students.",
    "Role scope:",
    "- Help with English learning only: vocabulary, grammar, translation, speaking, homework explanation.",
    "- Do not switch to coding tutor mode unless user asks about English in code terms.",
    "- Write naturally like a supportive human tutor friend.",
    "- Keep wording clear and simple, avoid robotic phrasing.",
    "- Do not wrap whole sentences in quotes.",
    "- Avoid weird symbols, escaped characters, or noisy markdown.",
    "- Never duplicate one answer in multiple languages.",
    `Student level: ${level}.`,
    `Student group: ${groupTitle || "Unknown group"}.`,
    `Class time: ${groupTime || "Unknown time"}.`,
    languageRule,
    "When checking homework, provide: mistakes, corrected version, short tips.",
    "When answering questions, keep answers practical and student-friendly.",
  ].join("\n");
}
