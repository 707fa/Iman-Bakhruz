export interface BrowserSpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

const HIGH_QUALITY_ENGLISH_HINTS = [
  "google us english",
  "microsoft ava",
  "microsoft aria",
  "microsoft jenny",
  "microsoft emma",
  "microsoft sonia",
  "samantha",
  "ava",
  "jenny",
  "aria",
  "victoria",
  "daniel",
  "enhanced",
  "premium",
  "neural",
  "natural",
];

function normalizeLang(lang: string): string {
  const safe = (lang || "en-US").trim().toLowerCase();
  if (!safe) return "en-us";
  return safe.replace("_", "-");
}

const FEMALE_NAME_HINTS_BY_LANG: Record<string, string[]> = {
  en: [
    "aria",
    "samantha",
    "victoria",
    "ava",
    "karen",
    "zira",
    "susan",
    "jenny",
    "female",
    "woman",
  ],
  ru: ["svetlana", "irina", "milena", "alisa", "yana", "olga", "female", "woman"],
  uz: ["female", "woman", "zira", "aria", "samantha"],
};

function scoreVoice(voice: SpeechSynthesisVoice, lang: string): number {
  const normalized = normalizeLang(lang);
  const langPrefix = normalized.split("-")[0] || "en";
  const voiceLang = normalizeLang(voice.lang);
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();

  let score = 0;
  if (langPrefix === "en" && !voiceLang.startsWith("en")) score -= 160;
  if (normalized === "en-us" && voiceLang === "en-us") score += 60;
  if (voiceLang === normalized) score += 42;
  if (voiceLang.startsWith(langPrefix)) score += 24;
  if (voice.localService) score += 10;
  if (langPrefix === "en" && HIGH_QUALITY_ENGLISH_HINTS.some((hint) => name.includes(hint))) score += 42;
  if (name.includes("compact")) score -= 24;
  if (name.includes("novelty")) score -= 80;

  const femaleHints = FEMALE_NAME_HINTS_BY_LANG[langPrefix] ?? FEMALE_NAME_HINTS_BY_LANG.en;
  if (femaleHints.some((hint) => name.includes(hint))) score += 28;
  if (name.includes("male") || name.includes("man")) score -= 12;

  return score;
}

export function waitForSpeechVoices(timeoutMs = 800): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }

    const initial = window.speechSynthesis.getVoices();
    if (initial.length > 0) {
      resolve(initial);
      return;
    }

    const timerId = window.setTimeout(() => {
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    }, timeoutMs);

    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timerId);
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

export function pickBestBrowserVoice(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const ranked = [...voices].sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang));
  return ranked[0] ?? null;
}

export function pickGatewayVoice(_lang: string): string | null {
  return null;
}

export async function speakWithBestBrowserVoice(text: string, lang: string, options?: BrowserSpeakOptions): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  const transcript = text.trim();
  if (!transcript) return;

  const utterance = new SpeechSynthesisUtterance(transcript);
  utterance.lang = lang;
  utterance.rate = options?.rate ?? 0.95;
  utterance.pitch = options?.pitch ?? 1;
  utterance.volume = options?.volume ?? 1;

  const voices = await waitForSpeechVoices();
  const voice = pickBestBrowserVoice(lang, voices);
  if (voice) {
    utterance.voice = voice;
  }

  const resumeInterval = window.setInterval(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);

  await new Promise<void>((resolve) => {
    utterance.onend = () => {
      window.clearInterval(resumeInterval);
      resolve();
    };
    utterance.onerror = () => {
      window.clearInterval(resumeInterval);
      resolve();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}
