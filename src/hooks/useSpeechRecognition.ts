import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionEventResult = {
  isFinal: boolean;
  length: number;
  0?: {
    transcript: string;
    confidence?: number;
  };
  [index: number]: { transcript: string; confidence?: number } | undefined;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionEventResult[];
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function resolveCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scoped = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };
  return scoped.SpeechRecognition ?? scoped.webkitSpeechRecognition ?? null;
}

function mapSpeechError(errorCode: string): string {
  if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
    return "Microphone permission denied.";
  }
  if (errorCode === "audio-capture") {
    return "No microphone found.";
  }
  if (errorCode === "no-speech") {
    return "No speech detected. Please try again.";
  }
  if (errorCode === "network") {
    return "Speech recognition network error.";
  }
  return "Speech recognition is unavailable.";
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

function normalizeTranscript(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function pickBestAlternative(result: SpeechRecognitionEventResult): string {
  const alternatives: Array<{ transcript: string; confidence: number }> = [];
  const total = Number(result.length || 0);

  for (let index = 0; index < total; index += 1) {
    const option = result[index];
    const transcript = String(option?.transcript || "").trim();
    if (!transcript) continue;
    alternatives.push({
      transcript,
      confidence: Number.isFinite(option?.confidence) ? Number(option?.confidence) : 0,
    });
  }

  if (alternatives.length === 0) return "";

  alternatives.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.transcript.length - a.transcript.length;
  });

  return alternatives[0]?.transcript ?? "";
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const ctor = useMemo(() => resolveCtor(), []);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const shouldRestartRef = useRef(false);
  const stoppingRef = useRef(false);

  const [supported] = useState(Boolean(ctor));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cleanupRecognition = useCallback(() => {
    const instance = recognitionRef.current;
    if (!instance) return;
    instance.onresult = null;
    instance.onerror = null;
    instance.onend = null;
    recognitionRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      const instance = recognitionRef.current;
      if (instance) {
        try {
          instance.abort();
        } catch {
          // noop
        }
      }
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  const reset = useCallback(() => {
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    stoppingRef.current = true;
    const instance = recognitionRef.current;
    if (!instance) return;
    try {
      instance.stop();
    } catch {
      // noop
    }
  }, []);

  const start = useCallback(() => {
    if (!ctor) {
      setError("Speech recognition is not supported in this browser.");
      return false;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setError("Speech recognition requires HTTPS.");
      return false;
    }

    try {
      const recognition = new ctor();
      recognitionRef.current = recognition;
      setError(null);
      setListening(true);
      setInterimTranscript("");
      finalTranscriptRef.current = "";
      shouldRestartRef.current = true;
      stoppingRef.current = false;

      recognition.lang = options.lang || "en-US";
      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = options.interimResults ?? true;
      recognition.maxAlternatives = options.maxAlternatives ?? 3;

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const text = pickBestAlternative(result);
          if (!text) continue;
          if (result.isFinal) {
            finalTranscriptRef.current = normalizeTranscript(`${finalTranscriptRef.current} ${text}`);
          } else {
            interim = normalizeTranscript(`${interim} ${text}`);
          }
        }
        setTranscript(finalTranscriptRef.current);
        setInterimTranscript(interim);
      };

      recognition.onerror = (event) => {
        const code = String(event.error || "");
        if (code === "aborted" && stoppingRef.current) return;
        if (code !== "no-speech") {
          setError(mapSpeechError(code));
        }
      };

      recognition.onend = () => {
        if (shouldRestartRef.current && !stoppingRef.current) {
          try {
            recognition.start();
            return;
          } catch {
            // Fall through to cleanup when restart fails.
          }
        }
        setListening(false);
        setInterimTranscript("");
        stoppingRef.current = false;
        cleanupRecognition();
      };

      recognition.start();
      return true;
    } catch {
      setListening(false);
      shouldRestartRef.current = false;
      stoppingRef.current = false;
      cleanupRecognition();
      setError("Unable to start microphone recording.");
      return false;
    }
  }, [cleanupRecognition, ctor, options.continuous, options.interimResults, options.lang, options.maxAlternatives]);

  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
