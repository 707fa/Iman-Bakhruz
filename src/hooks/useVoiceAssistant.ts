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

function mockReply(userText: string): string {
  const clean = userText.trim();
  if (!clean) return "I am here with you. Tell me what to practice in English.";
  const natural = clean.charAt(0).toUpperCase() + clean.slice(1).replace(/[.!?]*$/, ".");
  return `I heard you. A more natural way to say it is: "${natural}" Now say it again smoothly.`;
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
          restartingRef.current = true;
          recognitionRef.current?.start();
          restartingRef.current = false;
          setState("listening");
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
