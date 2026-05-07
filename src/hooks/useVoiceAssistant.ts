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
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
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

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function mockReply(userText: string): string {
  const clean = userText.trim();
  if (!clean) return "I am here with you. Tell me what to practice in English.";
  return `Great, I heard you. Let's practice this in better English together.`;
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
  const lastInterimRef = useRef("");

  const visualLevel = state === "listening" ? mic.level : state === "speaking" ? audio.outputLevel : state === "thinking" ? 0.45 : 0.14;

  const stopListening = useCallback(async () => {
    keepListeningRef.current = false;
    processingRef.current = false;
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // noop
    }
    await mic.stop();
    if (state !== "speaking") {
      setState(audio.muted ? "muted" : "idle");
    }
  }, [audio.muted, mic, state]);

  const handleFinalText = useCallback(
    async (finalText: string) => {
      const clean = finalText.trim();
      if (!clean || processingRef.current) return;
      processingRef.current = true;
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      lastInterimRef.current = "";

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
        return;
      }
      setState("speaking");
      try {
        await audio.play(assistantText, outputLang || lang);
      } catch {
        setState("idle");
        onError?.("Neural voice is unavailable right now. Please retry in a few seconds.");
        return;
      }
      setState("idle");

      if (open && keepListeningRef.current) {
        try {
          processingRef.current = false;
          recognitionRef.current?.start();
          setState("listening");
        } catch {
          processingRef.current = false;
          setState("idle");
        }
      } else {
        processingRef.current = false;
      }
    },
    [audio, lang, onExchange, open, outputLang],
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

    const recognition = new RecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = false;
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
      if (interim) {
        lastInterimRef.current = interim;
        setTranscript((prev) => [...prev.slice(-7).filter((item) => !item.partial), { id: makeId("p"), role: "user", text: interim, partial: true }]);
        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = window.setTimeout(() => {
          const fallbackText = lastInterimRef.current.trim();
          if (!fallbackText || processingRef.current) return;
          keepListeningRef.current = true;
          try {
            recognition.stop();
          } catch {
            // noop
          }
          void handleFinalText(fallbackText);
        }, 1300);
      }
      if (finalText) {
        keepListeningRef.current = true;
        try {
          recognition.stop();
        } catch {
          // noop
        }
        void handleFinalText(finalText);
      }
    };
    recognition.onerror = () => {
      setState("error");
      onError?.("Voice recognition error. Please retry and check microphone permission.");
    };
    recognition.onend = () => {
      if (!keepListeningRef.current && state !== "speaking") {
        setState(audio.muted ? "muted" : "idle");
      }
    };
    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    recognition.start();
    setState(audio.muted ? "muted" : "listening");
  }, [audio.muted, handleFinalText, lang, mic, onError, state]);

  const toggleMic = useCallback(() => {
    if (state === "listening") {
      void stopListening();
      return;
    }
    void startListening();
  }, [startListening, state, stopListening]);

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
