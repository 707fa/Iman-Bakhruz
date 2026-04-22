export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "muted" | "error";

export interface VoiceTranscriptItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  partial?: boolean;
}
