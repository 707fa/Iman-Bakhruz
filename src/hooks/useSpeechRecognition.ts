import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionEventResult = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
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
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const ctor = useMemo(() => resolveCtor(), []);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");

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

      recognition.lang = options.lang || "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const text = result?.[0]?.transcript?.trim() || "";
          if (!text) continue;
          if (result.isFinal) {
            finalTranscriptRef.current = `${finalTranscriptRef.current} ${text}`.trim();
          } else {
            interim = `${interim} ${text}`.trim();
          }
        }
        setTranscript(finalTranscriptRef.current);
        setInterimTranscript(interim);
      };

      recognition.onerror = (event) => {
        setError(mapSpeechError(String(event.error || "")));
      };

      recognition.onend = () => {
        setListening(false);
        setInterimTranscript("");
        cleanupRecognition();
      };

      recognition.start();
      return true;
    } catch {
      setListening(false);
      cleanupRecognition();
      setError("Unable to start microphone recording.");
      return false;
    }
  }, [cleanupRecognition, ctor, options.lang]);

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

