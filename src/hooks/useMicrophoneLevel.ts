import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createInputAnalyser, readAmplitude, requestMicrophoneStream, smoothValue, stopInputAnalyser, type InputAnalyserSession } from "../lib/audio";

export function useMicrophoneLevel() {
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const sessionRef = useRef<InputAnalyserSession | null>(null);
  const smoothRef = useRef(0);

  const stop = useCallback(async () => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    await stopInputAnalyser(sessionRef.current);
    sessionRef.current = null;
    smoothRef.current = 0;
    setLevel(0);
    setActive(false);
  }, []);

  const tick = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const current = readAmplitude(session.analyser, session.data);
    smoothRef.current = smoothValue(smoothRef.current, current, 0.22);
    setLevel(smoothRef.current);
    frameRef.current = window.requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await requestMicrophoneStream();
      sessionRef.current = createInputAnalyser(stream);
      setActive(true);
      frameRef.current = window.requestAnimationFrame(tick);
      return true;
    } catch {
      setError("Microphone permission denied.");
      await stop();
      return false;
    }
  }, [stop, tick]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return useMemo(
    () => ({
      active,
      level,
      error,
      start,
      stop,
    }),
    [active, error, level, start, stop],
  );
}
