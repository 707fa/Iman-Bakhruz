import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { smoothValue } from "../lib/audio";

function randomWave() {
  return 0.22 + Math.random() * 0.76;
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const normalized = lang.toLowerCase();
  const exact = voices.find((voice) => voice.lang.toLowerCase() === normalized);
  if (exact) return exact;
  const family = normalized.split("-")[0];
  const byFamily = voices.find((voice) => voice.lang.toLowerCase().startsWith(family));
  if (byFamily) return byFamily;
  return voices.find((voice) => voice.localService) ?? voices[0] ?? null;
}

export function useAudioPlayback() {
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [outputLevel, setOutputLevel] = useState(0);
  const meterRef = useRef<number | null>(null);
  const smoothRef = useRef(0);

  const stopMeter = useCallback(() => {
    if (meterRef.current) {
      window.cancelAnimationFrame(meterRef.current);
      meterRef.current = null;
    }
    smoothRef.current = 0;
    setOutputLevel(0);
  }, []);

  const animateMeter = useCallback(() => {
    smoothRef.current = smoothValue(smoothRef.current, randomWave(), 0.28);
    setOutputLevel(smoothRef.current);
    meterRef.current = window.requestAnimationFrame(animateMeter);
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    stopMeter();
  }, [stopMeter]);

  const play = useCallback(
    async (text: string, lang: string) => {
      if (!text.trim() || muted) return;
      stop();
      setSpeaking(true);
      meterRef.current = window.requestAnimationFrame(animateMeter);

      if (!("speechSynthesis" in window)) {
        globalThis.setTimeout(() => {
          setSpeaking(false);
          stopMeter();
        }, Math.min(5000, Math.max(1200, text.length * 40)));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.93;
      utterance.pitch = 1;
      utterance.volume = 1;
      const voice = pickVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.onend = () => {
        setSpeaking(false);
        stopMeter();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        stopMeter();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [animateMeter, muted, stop, stopMeter],
  );

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (next) stop();
      return next;
    });
  }, [stop]);

  useEffect(() => stop, [stop]);

  return useMemo(
    () => ({
      muted,
      speaking,
      outputLevel,
      play,
      stop,
      toggleMuted,
    }),
    [muted, outputLevel, play, speaking, stop, toggleMuted],
  );
}
