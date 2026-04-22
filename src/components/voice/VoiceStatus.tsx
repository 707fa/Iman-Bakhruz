import type { VoiceState } from "../../types/voice";

interface VoiceStatusProps {
  state: VoiceState;
}

const LABELS: Record<VoiceState, string> = {
  idle: "Ready",
  listening: "Listening...",
  thinking: "Thinking...",
  speaking: "Speaking...",
  muted: "Muted",
  error: "Error",
};

export function VoiceStatus({ state }: VoiceStatusProps) {
  return (
    <p className="text-center text-sm font-medium text-zinc-300" aria-live="polite">
      {LABELS[state]}
    </p>
  );
}
