import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { smoothValue } from "../lib/audio";
import { pickGatewayVoice, speakWithBestBrowserVoice } from "../lib/speech";
import { isVoiceGatewayReady, requestVoiceTts } from "../services/api/voiceGatewayApi";

function randomWave() {
  return 0.22 + Math.random() * 0.76;
}

function cleanSpeechText(text: string): string {
  return text
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/[*_`#>•]+/g, " ")
    .replace(/\s*[-–]\s+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function splitLongText(text: string, maxLength: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const next = `${current} ${word}`.trim();
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function toSpeechChunks(text: string): string[] {
  const maxLength = 260;
  const normalized = text
    .split(/\n+/)
    .map(cleanSpeechText)
    .filter(Boolean)
    .join(" ");

  if (!normalized) return [];
  if (normalized.length <= maxLength) return [normalized];

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences.length ? sentences : [normalized]) {
    if (sentence.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitLongText(sentence, maxLength));
      continue;
    }

    const next = `${current} ${sentence}`.trim();
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
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
  const playbackCancelRef = useRef<(() => void) | null>(null);
  const playbackRunRef = useRef(0);

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
    playbackRunRef.current += 1;
    playbackCancelRef.current?.();
    playbackCancelRef.current = null;

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

      const response = await requestVoiceTts({ text, lang, voice: pickGatewayVoice(lang) });
      const audio = new Audio(response.audioSrc);
      audio.preload = "auto";
      audioElRef.current = audio;
      if (response.audioSrc.startsWith("blob:")) {
        objectUrlRef.current = response.audioSrc;
      }

      await setupAudioMeter(audio);
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const settle = () => {
          if (settled) return;
          settled = true;
          playbackCancelRef.current = null;
          resolve();
        };
        playbackCancelRef.current = settle;
        audio.onended = settle;
        audio.onerror = () => {
          if (settled) return;
          settled = true;
          playbackCancelRef.current = null;
          reject(new Error("Failed to play gateway TTS audio"));
        };
        audio.play().catch(() => {
          if (settled) return;
          settled = true;
          playbackCancelRef.current = null;
          reject(new Error("Failed to play gateway TTS audio"));
        });
      });
      return true;
    },
    [setupAudioMeter],
  );

  const playViaBrowserTts = useCallback(
    async (chunks: string[], lang: string, shouldContinue: () => boolean) => {
      meterRef.current = window.requestAnimationFrame(animateSyntheticMeter);
      try {
        for (const chunk of chunks) {
          if (!shouldContinue()) break;
          await speakWithBestBrowserVoice(chunk, lang, { rate: 0.95, pitch: 1, volume: 1 });
          if (!shouldContinue()) break;
        }
      } finally {
        setSpeaking(false);
        stopMeter();
      }
    },
    [animateSyntheticMeter, stopMeter],
  );

  const play = useCallback(
    async (text: string, lang: string) => {
      if (!text.trim() || muted) return;

      stop();
      const runId = playbackRunRef.current;
      setSpeaking(true);
      const speechChunks = toSpeechChunks(text);
      if (speechChunks.length === 0) {
        setSpeaking(false);
        stopMeter();
        return;
      }

      try {
        if (isVoiceGatewayReady()) {
          for (const chunk of speechChunks) {
            if (runId !== playbackRunRef.current) return;
            await playViaGateway(chunk, lang);
            if (runId !== playbackRunRef.current) return;
            cleanupObjectUrl();
          }
          setSpeaking(false);
          stopMeter();
          return;
        }
      } catch {
        audioElRef.current = null;
        cleanupObjectUrl();
        stopMeter();
      }

      if (runId === playbackRunRef.current) {
        await playViaBrowserTts(speechChunks, lang, () => runId === playbackRunRef.current);
      }
    },
    [cleanupObjectUrl, muted, playViaBrowserTts, playViaGateway, stop, stopMeter],
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
