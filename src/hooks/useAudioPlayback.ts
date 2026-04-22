import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { smoothValue } from "../lib/audio";
import { VOICE_BROWSER_FALLBACK_ENABLED } from "../lib/env";
import { isVoiceGatewayReady, requestVoiceTts } from "../services/api/voiceGatewayApi";

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

function toSpeechText(text: string): string {
  const normalized = text
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= 260) return normalized;

  const chunks = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (chunks.length === 0) return normalized.slice(0, 260);

  let combined = "";
  for (let index = 0; index < chunks.length; index += 1) {
    const next = chunks[index];
    if ((`${combined} ${next}`.trim()).length > 260) break;
    combined = `${combined} ${next}`.trim();
    if (index >= 1) break;
  }

  return combined || normalized.slice(0, 260);
}

interface OutputMeterSession {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
  data: Uint8Array<ArrayBuffer>;
}

export function useAudioPlayback() {
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [outputLevel, setOutputLevel] = useState(0);

  const meterRef = useRef<number | null>(null);
  const smoothRef = useRef(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const outputMeterRef = useRef<OutputMeterSession | null>(null);

  const stopMeter = useCallback(() => {
    if (meterRef.current) {
      window.cancelAnimationFrame(meterRef.current);
      meterRef.current = null;
    }

    const meter = outputMeterRef.current;
    if (meter) {
      meter.source.disconnect();
      meter.analyser.disconnect();
      if (meter.audioContext.state !== "closed") {
        void meter.audioContext.close();
      }
      outputMeterRef.current = null;
    }

    smoothRef.current = 0;
    setOutputLevel(0);
  }, []);

  const animateSyntheticMeter = useCallback(() => {
    smoothRef.current = smoothValue(smoothRef.current, randomWave(), 0.28);
    setOutputLevel(smoothRef.current);
    meterRef.current = window.requestAnimationFrame(animateSyntheticMeter);
  }, []);

  const animateAudioMeter = useCallback(() => {
    const meter = outputMeterRef.current;
    if (!meter) {
      meterRef.current = window.requestAnimationFrame(animateSyntheticMeter);
      return;
    }

    meter.analyser.getByteFrequencyData(meter.data);
    let sum = 0;
    for (let index = 0; index < meter.data.length; index += 1) {
      sum += meter.data[index];
    }
    const avg = sum / meter.data.length;
    const nextLevel = Math.min(1, Math.max(0, avg / 190));
    smoothRef.current = smoothValue(smoothRef.current, nextLevel, 0.3);
    setOutputLevel(smoothRef.current);
    meterRef.current = window.requestAnimationFrame(animateAudioMeter);
  }, [animateSyntheticMeter]);

  const setupAudioMeter = useCallback(
    async (audioElement: HTMLAudioElement) => {
      try {
        const audioContext = new AudioContext();
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        const source = audioContext.createMediaElementSource(audioElement);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.86;
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        outputMeterRef.current = {
          audioContext,
          analyser,
          source,
          data: new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>,
        };
        meterRef.current = window.requestAnimationFrame(animateAudioMeter);
      } catch {
        meterRef.current = window.requestAnimationFrame(animateSyntheticMeter);
      }
    },
    [animateAudioMeter, animateSyntheticMeter],
  );

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
      audioElRef.current = null;
    }

    cleanupObjectUrl();
    setSpeaking(false);
    stopMeter();
  }, [cleanupObjectUrl, stopMeter]);

  const playViaGateway = useCallback(
    async (text: string, lang: string): Promise<boolean> => {
      if (!isVoiceGatewayReady()) return false;

      const response = await requestVoiceTts({ text, lang });
      const audio = new Audio(response.audioSrc);
      audio.preload = "auto";
      audioElRef.current = audio;
      if (response.audioSrc.startsWith("blob:")) {
        objectUrlRef.current = response.audioSrc;
      }

      await setupAudioMeter(audio);
      await audio.play();
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Failed to play gateway TTS audio"));
      });
      return true;
    },
    [setupAudioMeter],
  );

  const playViaBrowserTts = useCallback(
    async (text: string, lang: string) => {
      meterRef.current = window.requestAnimationFrame(animateSyntheticMeter);

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
    [animateSyntheticMeter, stopMeter],
  );

  const play = useCallback(
    async (text: string, lang: string) => {
      if (!text.trim() || muted) return;

      stop();
      setSpeaking(true);
      const speechText = toSpeechText(text);

      try {
        const played = await playViaGateway(speechText, lang);
        if (played) {
          setSpeaking(false);
          stopMeter();
          return;
        }
      } catch {
        if (!VOICE_BROWSER_FALLBACK_ENABLED && isVoiceGatewayReady()) {
          setSpeaking(false);
          stopMeter();
          return;
        }
      }

      await playViaBrowserTts(speechText, lang);
    },
    [muted, playViaBrowserTts, playViaGateway, stop, stopMeter],
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
