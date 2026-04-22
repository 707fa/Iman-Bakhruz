import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { smoothValue } from "../lib/audio";

function randomWave() {
  return 0.22 + Math.random() * 0.76;
}

function pickVoice(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const normalized = lang.toLowerCase();
  const femaleHints = [
    "female",
    "woman",
    "zira",
    "samantha",
    "victoria",
    "karen",
    "moira",
    "ava",
    "aria",
    "alloy",
    "sonia",
    "natalia",
    "katya",
  ];
  const maleHints = ["male", "man", "david", "mark", "alex", "ivan", "pavel", "daniel"];
  const scoreVoice = (voice: SpeechSynthesisVoice) => {
    const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
    let score = 0;
    if (voice.lang.toLowerCase() === normalized) score += 30;
    if (voice.lang.toLowerCase().startsWith(normalized.split("-")[0])) score += 18;
    if (voice.localService) score += 8;
    if (name.includes("neural") || name.includes("natural") || name.includes("premium")) score += 10;
    if (femaleHints.some((hint) => name.includes(hint))) score += 24;
    if (maleHints.some((hint) => name.includes(hint))) score -= 10;
    return score;
  };

  const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  if (ranked.length > 0) return ranked[0] ?? null;

  const exact = voices.find((voice) => voice.lang.toLowerCase() === normalized);
  if (exact) return exact;
  const family = normalized.split("-")[0];
  const byFamily = voices.find((voice) => voice.lang.toLowerCase().startsWith(family));
  if (byFamily) return byFamily;
  return voices.find((voice) => voice.localService) ?? voices[0] ?? null;
}

function waitForVoices(timeoutMs = 700): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
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
      utterance.rate = 0.9;
      utterance.pitch = 1.03;
      utterance.volume = 1;
      const voices = await waitForVoices();
      const voice = pickVoice(lang, voices);
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
