import { useCallback, useMemo, useRef, useState } from "react";
import { useAudioPlayback } from "./useAudioPlayback";
import { useMicrophoneLevel } from "./useMicrophoneLevel";
import type { VoiceSessionMessage, VoiceState, VoiceTranscriptItem } from "../types/voice";
import { normalizeAssistantReply } from "../lib/aiText";

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
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
  onExchange?: (userText: string) => Promise<string>;
  onError?: (message: string) => void;
}

const SPEECH_SILENCE_MS = 2800;

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeSpokenText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
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

function correctionFor(text: string, topic: string): string {
  const clean = text.trim();
  if (/\bexplain me\b/i.test(clean)) {
    return `Correction: "Can you explain ${topic} to me in more detail?"`;
  }
  if (!/[?.!]$/.test(clean)) {
    return `Correction: "${clean.charAt(0).toUpperCase()}${clean.slice(1)}?"`;
  }
  return "";
}

function mockReply(userText: string): string {
  const clean = userText.trim();
  if (!clean) return "I am here with you. Tell me what to practice in English.";
  const lower = clean.toLowerCase();
  const topic = extractTopic(clean);
  const correction = correctionFor(clean, topic);

  let answer = "Sure. Ask me your question, and I will answer in English with a short correction if needed.";
  if (lower.includes("present simple")) {
    answer = "The present simple is for habits, routines, facts, and schedules. Use the base verb, but add -s or -es with he, she, and it.";
  } else if (lower.includes("past simple")) {
    answer = "The past simple is for finished actions in the past. Use verb-ed for regular verbs, and the second form for irregular verbs.";
  } else if (lower.includes("present continuous")) {
    answer = "The present continuous is for actions happening now or temporary situations. Use am, is, or are plus verb-ing.";
  } else if (/\b(what|why|how|when|where|can|could|do|does|is|are)\b/i.test(clean)) {
    answer = `Sure. About ${topic}: I can explain it with simple examples. Give me one sentence, and I will help you use it naturally.`;
  }

  return correction ? `${answer} ${correction}` : `${answer} What example should we practice?`;
}

export function useVoiceAssistant({ lang, outputLang, onExchange, onError }: UseVoiceAssistantOptions) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState<VoiceTranscriptItem[]>([]);
  const mic = useMicrophoneLevel();
  const audio = useAudioPlayback();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const keepListeningRef = useRef(false);
  const sessionMessagesRef = useRef<VoiceSessionMessage[]>([]);
  const processingRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const finalSpeechRef = useRef("");
  const lastInterimRef = useRef("");
  const restartingRef = useRef(false);

  const visualLevel = state === "listening" ? mic.level : state === "speaking" ? audio.outputLevel : state === "thinking" ? 0.45 : 0.14;

  const clearSilenceTimer = useCallback(() => {
    if (!silenceTimerRef.current) return;
    window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }, []);

  const finishProcessing = useCallback(() => {
    processingRef.current = false;
    restartingRef.current = false;
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

  const stopListening = useCallback(async () => {
    keepListeningRef.current = false;
    finishProcessing();
    clearSilenceTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      // noop
    }
    await mic.stop();
    if (state !== "speaking") {
      setState(audio.muted ? "muted" : "idle");
    }
  }, [audio.muted, clearSilenceTimer, finishProcessing, mic, state]);

  const handleFinalText = useCallback(
    async (finalText: string) => {
      const clean = finalText.trim();
      if (!clean || processingRef.current) return;
      processingRef.current = true;
      clearSilenceTimer();
      clearBufferedSpeech();

      setTranscript((prev) => [...prev.slice(-7).filter((item) => !item.partial), { id: makeId("u"), role: "user", text: clean }]);
      sessionMessagesRef.current.push({
        role: "user",
        text: clean,
        createdAt: new Date().toISOString(),
      });
      setState("thinking");

      let assistantText = "";
      try {
        assistantText = onExchange ? normalizeAssistantReply(await onExchange(clean)) : normalizeAssistantReply(mockReply(clean));
      } catch {
        assistantText = normalizeAssistantReply(mockReply(clean));
      }

      setTranscript((prev) => [...prev.slice(-7), { id: makeId("a"), role: "assistant", text: assistantText }]);
      sessionMessagesRef.current.push({
        role: "assistant",
        text: assistantText,
        createdAt: new Date().toISOString(),
      });
      if (audio.muted) {
        setState("muted");
        finishProcessing();
        return;
      }
      setState("speaking");
      try {
        await audio.play(assistantText, outputLang || lang);
      } catch {
        setState("idle");
        finishProcessing();
        onError?.("Neural voice is unavailable right now. Please retry in a few seconds.");
        return;
      }
      setState("idle");

      if (open && keepListeningRef.current) {
        try {
          finishProcessing();
          const RecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
          if (RecognitionCtor) {
            const recognition = new RecognitionCtor();
            recognition.lang = lang;
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            recognition.onresult = (event: SpeechRecognitionEventLike) => {
              let interim = "";
              let finalText = "";
              for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const result = event.results[i];
                const chunk = result?.[0]?.transcript?.trim() ?? "";
                if (!chunk) continue;
                if (result.isFinal) finalText += `${finalText ? " " : ""}${chunk}`;
                else interim += `${interim ? " " : ""}${chunk}`;
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
                scheduleBufferedSpeechSubmit(recognition);
              }
            };
            recognition.onerror = (event) => {
              const code = String(event?.error || "");
              if (code === "aborted" || code === "no-speech") {
                if (!processingRef.current) setState(audio.muted ? "muted" : "idle");
                return;
              }
              setState("error");
              onError?.("Voice recognition error. Please retry and check microphone permission.");
            };
            recognition.onend = () => {
              if (restartingRef.current || processingRef.current) return;
              if (submitBufferedSpeech(recognition, true)) return;
              if (!keepListeningRef.current && state !== "speaking") {
                setState(audio.muted ? "muted" : "idle");
              }
            };
            restartingRef.current = true;
            recognitionRef.current = recognition;
            recognition.start();
            restartingRef.current = false;
            setState("listening");
          } else {
            finishProcessing();
            setState("idle");
          }
        } catch {
          finishProcessing();
          setState("idle");
        }
      } else {
        finishProcessing();
      }
    },
    [audio, clearBufferedSpeech, clearSilenceTimer, finishProcessing, lang, onExchange, onError, open, outputLang],
  );

  const submitBufferedSpeech = useCallback(
    (recognition: SpeechRecognitionLike, shouldRestart: boolean) => {
      const buffered = getBufferedSpeech();
      if (!buffered || processingRef.current) return false;
      keepListeningRef.current = shouldRestart;
      clearSilenceTimer();
      try {
        recognition.stop();
      } catch {
        // noop
      }
      void handleFinalText(buffered);
      return true;
    },
    [clearSilenceTimer, getBufferedSpeech, handleFinalText],
  );

  const scheduleBufferedSpeechSubmit = useCallback(
    (recognition: SpeechRecognitionLike) => {
      clearSilenceTimer();
      silenceTimerRef.current = window.setTimeout(() => {
        void submitBufferedSpeech(recognition, true);
      }, SPEECH_SILENCE_MS);
    },
    [clearSilenceTimer, submitBufferedSpeech],
  );

  const startListening = useCallback(async () => {
    const RecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setState("error");
      onError?.("Voice input is not supported in this browser. Use Chrome/Edge on HTTPS.");
      return;
    }

    const micOk = await mic.start();
    if (!micOk) {
      setState("error");
      onError?.("Microphone permission is blocked. Please allow microphone access.");
      return;
    }

    try {
      recognitionRef.current?.abort?.();
    } catch {
      // noop
    }

    const recognition = new RecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const chunk = result?.[0]?.transcript?.trim() ?? "";
        if (!chunk) continue;
        if (result.isFinal) finalText += `${finalText ? " " : ""}${chunk}`;
        else interim += `${interim ? " " : ""}${chunk}`;
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
        scheduleBufferedSpeechSubmit(recognition);
      }
    };
    recognition.onerror = (event) => {
      const code = String(event?.error || "");
      if (code === "aborted" || code === "no-speech") {
        if (!processingRef.current) setState(audio.muted ? "muted" : "idle");
        return;
      }
      setState("error");
      onError?.("Voice recognition error. Please retry and check microphone permission.");
    };
    recognition.onend = () => {
      if (restartingRef.current || processingRef.current) return;
      if (submitBufferedSpeech(recognition, true)) return;
      if (!keepListeningRef.current && state !== "speaking") {
        setState(audio.muted ? "muted" : "idle");
      }
    };
    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    recognition.start();
    setState(audio.muted ? "muted" : "listening");
  }, [audio.muted, getBufferedSpeech, handleFinalText, lang, mic, onError, scheduleBufferedSpeechSubmit, showBufferedSpeech, state, submitBufferedSpeech]);

  const toggleMic = useCallback(() => {
    if (state === "listening") {
      const recognition = recognitionRef.current;
      if (recognition && submitBufferedSpeech(recognition, false)) return;
      void stopListening();
      return;
    }
    void startListening();
  }, [startListening, state, stopListening, submitBufferedSpeech]);

  const toggleAudio = useCallback(() => {
    audio.toggleMuted();
    if (!audio.muted) {
      setState("muted");
      return;
    }
    if (state !== "listening") {
      setState("idle");
    }
  }, [audio, state]);

  const close = useCallback(async () => {
    setOpen(false);
    await stopListening();
    audio.stop();
    setState("idle");
    setTranscript([]);
  }, [audio, stopListening]);

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
      micMuted: state !== "listening",
      audioMuted: audio.muted,
      toggleMic,
      toggleAudio,
      consumeSessionMessages,
    }),
    [audio.muted, close, consumeSessionMessages, open, state, toggleAudio, toggleMic, transcript, visualLevel],
  );
}
