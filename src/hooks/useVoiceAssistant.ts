import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAudioPlayback } from "./useAudioPlayback";
import { useMicrophoneLevel } from "./useMicrophoneLevel";
import type { VoiceSessionMessage, VoiceState, VoiceTranscriptItem } from "../types/voice";
import { normalizeAssistantReply } from "../lib/aiText";

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence?: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
    SpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

interface UseVoiceAssistantOptions {
  lang: string;
  outputLang?: string;
  recognitionLangs?: string[];
  speechHints?: string[];
  onExchange?: (userText: string) => Promise<string>;
  onError?: (message: string) => void;
}

type RecognitionMode = "conversation" | "interrupt";

const SPEECH_SILENCE_MS = 2200;
const QUESTION_SILENCE_MS = 1200;
const STOP_SILENCE_MS = 250;

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeSpokenText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function normalizeForCommand(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueLanguages(values: string[], fallback: string): string[] {
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = [...new Set(normalized.length ? normalized : [fallback])];
  return unique.includes(fallback) ? unique : [...unique, fallback];
}

function hasCyrillic(text: string): boolean {
  return /[а-яё]/i.test(text);
}

function hasUzbekLatin(text: string): boolean {
  const clean = normalizeForCommand(text);
  return /\b(nima|qanday|nega|qachon|qayerda|kim|menga|tushuntir|degani|qilib|bo'ladi|boladi|o'zi|uzi|misol|gap|xato|to'g'ri|togri|inglizcha)\b/i.test(clean);
}

function formatTopic(raw: string): string {
  const topic = raw
    .replace(/[?.!]+$/g, "")
    .replace(/\b(more|please|again|to me|for me)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!topic) return "it";
  if (/^(present|past|future)\s+/i.test(topic)) return `the ${topic}`;
  return topic;
}

function extractTopic(text: string): string {
  const clean = text.trim();
  const aboutMatch = clean.match(/\babout\s+(.+)$/i);
  if (aboutMatch?.[1]) return formatTopic(aboutMatch[1]);

  const explainMatch = clean.match(/\bexplain(?:\s+to\s+me|\s+me)?\s+(.+)$/i);
  if (explainMatch?.[1]) return formatTopic(explainMatch[1]);

  return "it";
}

function normalizeVoiceInput(text: string): string {
  const clean = normalizeSpokenText(text);
  const cyrillicLower = clean.toLowerCase();
  const normalized = normalizeForCommand(clean);

  const asksAboutPresentSimple =
    /\bpresent\s+simple\b/i.test(clean) ||
    /\bпр[еи]з[еэ]нт\s+симпл\b/i.test(cyrillicLower) ||
    /\bпресент\s+симпле\b/i.test(cyrillicLower) ||
    /\bpresent\s+simple\s+(nima|degani|qanday|tushuntir)\b/i.test(normalized) ||
    /\b(nima|degani|qanday|tushuntir)\s+present\s+simple\b/i.test(normalized) ||
    /\b(ibs|i\s*b\s*s|ice|eyes)\s+(meme|mean|mini|me)\s+(yesterday|simple|simply|symbol)\b/i.test(clean);

  if (asksAboutPresentSimple) {
    if (
      /\b(what|explain|tell|how|do|does|is|are|mean|means)\b/i.test(clean) ||
      /\bчто\s+такое\b/i.test(cyrillicLower) ||
      /\b(объясни|обьясни|расскажи|как|зачем|когда|для\s+чего)\b/i.test(cyrillicLower) ||
      /\b(nima|degani|qanday|menga|tushuntir|ishlat|qachon|misol)\b/i.test(normalized) ||
      /\bкак\b/i.test(cyrillicLower) ||
      /\b(ibs|i\s*b\s*s|ice|eyes)\s+(meme|mean|mini|me)\s+(yesterday|simple|simply|symbol)\b/i.test(clean)
    ) {
      return "What is the present simple and how do I use it?";
    }
  }

  if (/^what\s+do\s+you\s+do\s+present\s+simple\b/i.test(clean)) {
    return "What is the present simple and how do I use it?";
  }

  if (hasCyrillic(clean) || hasUzbekLatin(clean)) {
    return `The student said in Russian, Uzbek, or mixed language: "${clean}". Understand the meaning and answer in simple English. If they made an English mistake, correct only the English part shortly.`;
  }

  return clean;
}

function correctionFor(text: string, topic: string): string {
  const clean = text.trim();
  if (/\bexplain me\b/i.test(clean)) {
    return `Correction: say "explain ${topic} to me," not "explain me."`;
  }
  return "";
}

function mockReply(userText: string): string {
  const clean = userText.trim();
  if (!clean) return "I'm listening. Tell me what you want to practice in English.";
  const lower = clean.toLowerCase();
  const topic = extractTopic(clean);
  const correction = correctionFor(clean, topic);

  let answer = "Sure. Let's talk naturally in English. Ask me anything, and I will answer first, then correct only important mistakes.";
  if (lower.includes("present simple")) {
    answer = "The present simple is a verb tense for habits, routines, facts, and schedules. Use the base verb: I study, you work, we play. With he, she, or it, add -s or -es: she studies, he works. For negatives, use do not or does not. For questions, use do or does.";
  } else if (lower.includes("past simple")) {
    answer = "The past simple is for finished actions in the past. Use verb-ed for regular verbs, and the second form for irregular verbs. For example, I watched a movie, or I went home.";
  } else if (lower.includes("present continuous")) {
    answer = "The present continuous is for actions happening now or temporary situations. Use am, is, or are plus verb-ing. For example, I am speaking now.";
  } else if (/\b(my name is|i am|i'm|years old|learning english|engineer|school)\b/i.test(clean)) {
    answer =
      'Nice to meet you. A natural version is: "My name is Farrux. I am 16 years old. I am learning English because I want to fly to London. I want to work as an engineer, and I am good at school." Correction: say "I want to fly to London," not "I am go to fly in London."';
  } else if (/\b(what|why|how|when|where|can|could|do|does|is|are)\b/i.test(clean)) {
    answer = `Sure. About ${topic}: I can explain it simply and give examples. Tell me one sentence, and I will help you make it natural.`;
  }

  return correction ? `${answer} ${correction}` : `${answer} What should we practice next?`;
}

function isStopCommand(text: string): boolean {
  const clean = normalizeForCommand(text);
  return /^(iman\s+)?(stop|pause|wait|cancel|enough|be quiet|silent|shut up|стоп|остановись|подожди|хватит|молчи|замолчи|bas|toxta|to'xta|kut|yetarli|jim)(\s+iman)?$/.test(clean);
}

function looksLikeQuestionOrNewTurn(text: string): boolean {
  const clean = normalizeForCommand(text);
  if (clean.length < 8) return false;
  return /^(iman\s+)?(can|could|what|why|how|when|where|who|which|do|does|did|is|are|am|tell|explain|help|no|wait|actually|but|что|почему|как|когда|где|кто|какой|объясни|обьясни|расскажи|помоги|nima|nega|qanday|qachon|qayerda|kim|menga|tushuntir|ayt|yordam)\b/.test(clean);
}

function resolveRecognitionLanguageIndex(text: string, languages: string[], fallbackIndex: number): number {
  const lower = text.toLowerCase();
  if (hasCyrillic(lower)) {
    const ruIndex = languages.findIndex((item) => item.toLowerCase().startsWith("ru"));
    if (ruIndex >= 0) return ruIndex;
  }
  if (hasUzbekLatin(lower)) {
    const uzIndex = languages.findIndex((item) => item.toLowerCase().startsWith("uz"));
    if (uzIndex >= 0) return uzIndex;
  }
  if (/[a-z]/i.test(text)) {
    const enIndex = languages.findIndex((item) => item.toLowerCase().startsWith("en"));
    if (enIndex >= 0) return enIndex;
  }
  return fallbackIndex;
}

function getSilenceDelay(text: string): number {
  if (isStopCommand(text)) return STOP_SILENCE_MS;
  if (/[?!.]$/.test(text.trim()) || looksLikeQuestionOrNewTurn(text)) return QUESTION_SILENCE_MS;
  return SPEECH_SILENCE_MS;
}

function replaceNameMistakes(text: string, hints: string[]): string {
  const knownNames = new Set(["Farrux", "Farrukh", "Farukh", "Farruh"]);
  for (const hint of hints) {
    const first = hint.trim().split(/\s+/)[0];
    if (/^farr?u[hkx]/i.test(first) || /^faru[hkx]/i.test(first)) {
      knownNames.add(first);
    }
  }

  const preferredName = [...knownNames].find((name) => /^farrux$/i.test(name)) ?? [...knownNames][0] ?? "Farrux";
  return text.replace(/\b(faro|farrow|farooq|faruk|farukh|farruk|farruh|fahrux|feruz|pharaoh)\b/gi, preferredName);
}

function pickBestTranscript(result: SpeechRecognitionResultLike, hints: string[]): string {
  const alternatives: SpeechRecognitionAlternativeLike[] = [];
  for (let index = 0; index < Math.max(1, result.length || 0); index += 1) {
    const alternative = result[index];
    if (alternative?.transcript?.trim()) alternatives.push(alternative);
  }

  if (alternatives.length === 0) return "";
  const normalizedHints = hints.map((hint) => hint.toLowerCase()).filter(Boolean);
  const ranked = [...alternatives].sort((a, b) => {
    const aText = a.transcript.toLowerCase();
    const bText = b.transcript.toLowerCase();
    const aHintScore = normalizedHints.some((hint) => aText.includes(hint)) ? 3 : 0;
    const bHintScore = normalizedHints.some((hint) => bText.includes(hint)) ? 3 : 0;
    return bHintScore + (b.confidence ?? 0) - (aHintScore + (a.confidence ?? 0));
  });

  return replaceNameMistakes(ranked[0]?.transcript ?? "", hints);
}

function readRecognitionEvent(event: SpeechRecognitionEventLike, hints: string[]) {
  let interim = "";
  let finalText = "";

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const chunk = normalizeSpokenText(pickBestTranscript(result, hints));
    if (!chunk) continue;
    if (result.isFinal) finalText += `${finalText ? " " : ""}${chunk}`;
    else interim += `${interim ? " " : ""}${chunk}`;
  }

  return {
    finalText: normalizeSpokenText(finalText),
    interim: normalizeSpokenText(interim),
  };
}

function isLikelyAssistantEcho(heard: string, assistantText: string): boolean {
  const heardWords = normalizeForCommand(heard).split(/\s+/).filter((word) => word.length > 2);
  if (heardWords.length < 4) return false;

  const assistantWords = new Set(normalizeForCommand(assistantText).split(/\s+/).filter((word) => word.length > 2));
  if (assistantWords.size === 0) return false;

  const overlap = heardWords.filter((word) => assistantWords.has(word)).length;
  return overlap / heardWords.length >= 0.68;
}

export function useVoiceAssistant({ lang, outputLang, recognitionLangs, speechHints = [], onExchange, onError }: UseVoiceAssistantOptions) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState<VoiceTranscriptItem[]>([]);
  const mic = useMicrophoneLevel();
  const audio = useAudioPlayback();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionModeRef = useRef<RecognitionMode>("conversation");
  const keepListeningRef = useRef(false);
  const sessionMessagesRef = useRef<VoiceSessionMessage[]>([]);
  const processingRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const finalSpeechRef = useRef("");
  const lastInterimRef = useRef("");
  const stateRef = useRef<VoiceState>("idle");
  const openRef = useRef(false);
  const speechHintsRef = useRef<string[]>(speechHints);
  const recognitionLangsRef = useRef<string[]>(uniqueLanguages(recognitionLangs ?? [lang], lang));
  const recognitionLangIndexRef = useRef(0);
  const currentAssistantTextRef = useRef("");
  const exchangeRunRef = useRef(0);
  const startRecognitionRef = useRef<(mode?: RecognitionMode) => Promise<void>>(async () => undefined);
  const handleFinalTextRef = useRef<(finalText: string) => Promise<void>>(async () => undefined);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    speechHintsRef.current = speechHints;
  }, [speechHints]);

  useEffect(() => {
    recognitionLangsRef.current = uniqueLanguages(recognitionLangs ?? [lang], lang);
    recognitionLangIndexRef.current = 0;
  }, [lang, recognitionLangs]);

  const updateState = useCallback((next: VoiceState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const visualLevel = state === "listening" ? mic.level : state === "speaking" ? audio.outputLevel : state === "thinking" ? 0.45 : 0.14;

  const clearSilenceTimer = useCallback(() => {
    if (!silenceTimerRef.current) return;
    window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }, []);

  const finishProcessing = useCallback(() => {
    processingRef.current = false;
  }, []);

  const getBufferedSpeech = useCallback(() => normalizeSpokenText(`${finalSpeechRef.current} ${lastInterimRef.current}`), []);

  const clearBufferedSpeech = useCallback(() => {
    finalSpeechRef.current = "";
    lastInterimRef.current = "";
  }, []);

  const showBufferedSpeech = useCallback((text: string) => {
    if (!text.trim()) return;
    setTranscript((prev) => [...prev.slice(-7).filter((item) => !item.partial), { id: makeId("p"), role: "user", text, partial: true }]);
  }, []);

  const stopRecognition = useCallback((method: "stop" | "abort" = "stop") => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;

    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      if (method === "abort") recognition.abort?.();
      else recognition.stop();
    } catch {
      // noop
    }
  }, []);

  const restartConversationSoon = useCallback(() => {
    if (!openRef.current || !keepListeningRef.current) return;
    window.setTimeout(() => {
      if (!openRef.current || !keepListeningRef.current || processingRef.current) return;
      void startRecognitionRef.current("conversation");
    }, 120);
  }, []);

  const submitBufferedSpeech = useCallback(
    (shouldRestart: boolean) => {
      const buffered = getBufferedSpeech();
      if (!buffered || processingRef.current) return false;
      keepListeningRef.current = shouldRestart;
      clearSilenceTimer();
      stopRecognition("stop");
      void handleFinalTextRef.current(buffered);
      return true;
    },
    [clearSilenceTimer, getBufferedSpeech, stopRecognition],
  );

  const scheduleBufferedSpeechSubmit = useCallback(
    (text: string) => {
      clearSilenceTimer();
      silenceTimerRef.current = window.setTimeout(() => {
        void submitBufferedSpeech(true);
      }, getSilenceDelay(text));
    },
    [clearSilenceTimer, submitBufferedSpeech],
  );

  const startRecognition = useCallback(
    async (mode: RecognitionMode = "conversation") => {
      const RecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!RecognitionCtor) {
        updateState("error");
        onError?.("Voice input is not supported in this browser. Use Chrome/Edge on HTTPS.");
        return;
      }

      const micOk = await mic.start();
      if (!micOk) {
        updateState("error");
        onError?.("Microphone permission is blocked. Please allow microphone access.");
        return;
      }

      stopRecognition("abort");

      const recognition = new RecognitionCtor();
      recognitionRef.current = recognition;
      recognitionModeRef.current = mode;
      recognition.lang = recognitionLangsRef.current[recognitionLangIndexRef.current] ?? lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;

      recognition.onresult = (event) => {
        const { finalText, interim } = readRecognitionEvent(event, speechHintsRef.current);
        const heard = normalizeSpokenText(`${finalText} ${interim}`);
        if (!heard) return;

        if (recognitionModeRef.current === "interrupt") {
          if (isLikelyAssistantEcho(heard, currentAssistantTextRef.current)) return;

          if (isStopCommand(heard)) {
            exchangeRunRef.current += 1;
            audio.stop();
            clearBufferedSpeech();
            clearSilenceTimer();
            stopRecognition("abort");
            finishProcessing();
            setTranscript((prev) => [...prev.slice(-7).filter((item) => !item.partial), { id: makeId("u"), role: "user", text: "Stop" }]);
            updateState("listening");
            restartConversationSoon();
            return;
          }

          if (finalText && looksLikeQuestionOrNewTurn(heard)) {
            exchangeRunRef.current += 1;
            audio.stop();
            clearBufferedSpeech();
            clearSilenceTimer();
            stopRecognition("abort");
            finishProcessing();
            void handleFinalTextRef.current(heard);
          }
          return;
        }

        if (finalText) {
          finalSpeechRef.current = normalizeSpokenText(`${finalSpeechRef.current} ${finalText}`);
          lastInterimRef.current = "";
        } else {
          lastInterimRef.current = interim;
        }

        const buffered = getBufferedSpeech();
        if (buffered) {
          showBufferedSpeech(buffered);
          scheduleBufferedSpeechSubmit(buffered);
        }
      };

      recognition.onerror = (event) => {
        const code = String(event?.error || "");
        if (code === "aborted" || code === "no-speech") {
          if (keepListeningRef.current && openRef.current && !processingRef.current) restartConversationSoon();
          return;
        }
        if (code === "language-not-supported") {
          const langs = recognitionLangsRef.current;
          recognitionLangIndexRef.current = (recognitionLangIndexRef.current + 1) % Math.max(1, langs.length);
          if (keepListeningRef.current && openRef.current && !processingRef.current) restartConversationSoon();
          return;
        }
        updateState("error");
        onError?.("Voice recognition error. Please retry and check microphone permission.");
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition || processingRef.current) return;
        if (recognitionModeRef.current === "conversation" && submitBufferedSpeech(true)) return;
        if (keepListeningRef.current && openRef.current) {
          restartConversationSoon();
          return;
        }
        updateState(audio.muted ? "muted" : "idle");
      };

      try {
        recognition.start();
        updateState(mode === "interrupt" ? "speaking" : "listening");
      } catch {
        recognitionRef.current = null;
        if (keepListeningRef.current && openRef.current) restartConversationSoon();
      }
    },
    [
      audio,
      clearBufferedSpeech,
      clearSilenceTimer,
      finishProcessing,
      getBufferedSpeech,
      lang,
      mic,
      onError,
      restartConversationSoon,
      scheduleBufferedSpeechSubmit,
      showBufferedSpeech,
      stopRecognition,
      submitBufferedSpeech,
      updateState,
    ],
  );

  useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  const handleStopCommand = useCallback(async () => {
    exchangeRunRef.current += 1;
    audio.stop();
    clearBufferedSpeech();
    clearSilenceTimer();
    stopRecognition("abort");
    finishProcessing();
    if (openRef.current && keepListeningRef.current) {
      updateState("listening");
      await startRecognitionRef.current("conversation");
    } else {
      updateState(audio.muted ? "muted" : "idle");
    }
  }, [audio, clearBufferedSpeech, clearSilenceTimer, finishProcessing, stopRecognition, updateState]);

  const handleFinalText = useCallback(
    async (finalText: string) => {
      const clean = normalizeVoiceInput(finalText);
      if (!clean) return;
      const languages = recognitionLangsRef.current;
      recognitionLangIndexRef.current = resolveRecognitionLanguageIndex(finalText, languages, recognitionLangIndexRef.current);

      if (isStopCommand(clean)) {
        await handleStopCommand();
        return;
      }

      if (processingRef.current) return;
      processingRef.current = true;
      const runId = exchangeRunRef.current + 1;
      exchangeRunRef.current = runId;
      clearSilenceTimer();
      clearBufferedSpeech();
      stopRecognition("stop");

      setTranscript((prev) => [...prev.slice(-7).filter((item) => !item.partial), { id: makeId("u"), role: "user", text: clean }]);
      sessionMessagesRef.current.push({
        role: "user",
        text: clean,
        createdAt: new Date().toISOString(),
      });
      updateState("thinking");

      let assistantText = "";
      try {
        assistantText = onExchange ? normalizeAssistantReply(await onExchange(clean)) : normalizeAssistantReply(mockReply(clean));
      } catch {
        assistantText = normalizeAssistantReply(mockReply(clean));
      }

      if (runId !== exchangeRunRef.current) return;

      setTranscript((prev) => [...prev.slice(-7), { id: makeId("a"), role: "assistant", text: assistantText }]);
      sessionMessagesRef.current.push({
        role: "assistant",
        text: assistantText,
        createdAt: new Date().toISOString(),
      });

      if (audio.muted) {
        finishProcessing();
        if (openRef.current && keepListeningRef.current) {
          updateState("listening");
          await startRecognitionRef.current("conversation");
        } else {
          updateState("muted");
        }
        return;
      }

      currentAssistantTextRef.current = assistantText;
      updateState("speaking");
      if (openRef.current && keepListeningRef.current) {
        void startRecognitionRef.current("interrupt");
      }

      try {
        await audio.play(assistantText, outputLang || lang);
      } catch {
        if (runId !== exchangeRunRef.current) return;
        finishProcessing();
        updateState("listening");
        restartConversationSoon();
        onError?.("Neural voice is unavailable right now. Please retry in a few seconds.");
        return;
      }

      if (runId !== exchangeRunRef.current) return;
      finishProcessing();
      currentAssistantTextRef.current = "";

      if (openRef.current && keepListeningRef.current) {
        updateState("listening");
        await startRecognitionRef.current("conversation");
      } else {
        updateState(audio.muted ? "muted" : "idle");
      }
    },
    [
      audio,
      clearBufferedSpeech,
      clearSilenceTimer,
      finishProcessing,
      handleStopCommand,
      lang,
      onExchange,
      onError,
      outputLang,
      restartConversationSoon,
      stopRecognition,
      updateState,
    ],
  );

  useEffect(() => {
    handleFinalTextRef.current = handleFinalText;
  }, [handleFinalText]);

  const stopListening = useCallback(async () => {
    keepListeningRef.current = false;
    exchangeRunRef.current += 1;
    finishProcessing();
    clearSilenceTimer();
    clearBufferedSpeech();
    stopRecognition("abort");
    audio.stop();
    await mic.stop();
    updateState(audio.muted ? "muted" : "idle");
  }, [audio, clearBufferedSpeech, clearSilenceTimer, finishProcessing, mic, stopRecognition, updateState]);

  const startListening = useCallback(async () => {
    keepListeningRef.current = true;
    await startRecognition("conversation");
  }, [startRecognition]);

  const toggleMic = useCallback(() => {
    if (keepListeningRef.current) {
      void stopListening();
      return;
    }
    void startListening();
  }, [startListening, stopListening]);

  const toggleAudio = useCallback(() => {
    audio.toggleMuted();
    if (!audio.muted) {
      audio.stop();
      if (keepListeningRef.current) updateState("listening");
      else updateState("muted");
      return;
    }
    if (keepListeningRef.current) updateState("listening");
    else updateState("idle");
  }, [audio, updateState]);

  const close = useCallback(async () => {
    setOpen(false);
    openRef.current = false;
    await stopListening();
    audio.stop();
    updateState("idle");
    setTranscript([]);
  }, [audio, stopListening, updateState]);

  const consumeSessionMessages = useCallback(() => {
    const snapshot = [...sessionMessagesRef.current];
    sessionMessagesRef.current = [];
    return snapshot;
  }, []);

  return useMemo(
    () => ({
      open,
      setOpen,
      close,
      state,
      transcript,
      visualLevel,
      micMuted: !keepListeningRef.current,
      audioMuted: audio.muted,
      toggleMic,
      toggleAudio,
      consumeSessionMessages,
    }),
    [audio.muted, close, consumeSessionMessages, open, state, toggleAudio, toggleMic, transcript, visualLevel],
  );
}
