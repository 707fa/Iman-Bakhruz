import { AnimatePresence, motion } from "framer-motion";
import { VoiceControls } from "./VoiceControls";
import { VoiceOrb } from "./VoiceOrb";
import { VoiceStatus } from "./VoiceStatus";
import { VoiceTranscript } from "./VoiceTranscript";
import type { VoiceState, VoiceTranscriptItem } from "../../types/voice";

interface VoiceScreenProps {
  open: boolean;
  state: VoiceState;
  level: number;
  transcript: VoiceTranscriptItem[];
  micMuted: boolean;
  audioMuted: boolean;
  onToggleMic: () => void;
  onToggleAudio: () => void;
  onClose: () => void;
}

export function VoiceScreen({
  open,
  state,
  level,
  transcript,
  micMuted,
  audioMuted,
  onToggleMic,
  onToggleAudio,
  onClose,
}: VoiceScreenProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[160] text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(122,93,255,0.22),transparent_38%),radial-gradient(circle_at_80%_84%,rgba(80,157,255,0.16),transparent_34%),radial-gradient(circle_at_20%_88%,rgba(96,27,53,0.24),transparent_32%),linear-gradient(180deg,#030307_0%,#070913_100%)]"
            animate={{ opacity: [0.92, 1, 0.93] }}
            transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.95rem,env(safe-area-inset-top))] sm:px-6">
            <div className="mt-1 flex justify-center">
              <p className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] tracking-[0.08em] text-zinc-300 backdrop-blur">
                IMAN VOICE
              </p>
            </div>

            <div className="mt-2 flex justify-center">
              <VoiceStatus state={state} />
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-3 sm:py-5">
              <VoiceOrb state={state} level={level} />
            </div>

            <div className="space-y-3 rounded-[1.35rem] border border-white/10 bg-black/30 p-3 backdrop-blur-xl sm:p-4">
              <VoiceTranscript items={transcript} />
              <VoiceControls
                micMuted={micMuted}
                audioMuted={audioMuted}
                onToggleMic={onToggleMic}
                onToggleAudio={onToggleAudio}
                onClose={onClose}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
