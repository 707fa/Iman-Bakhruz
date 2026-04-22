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
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(120,119,198,0.35),transparent_42%),radial-gradient(circle_at_85%_80%,rgba(56,189,248,0.2),transparent_42%),linear-gradient(180deg,#040507_0%,#080b13_100%)]"
            animate={{ opacity: [0.92, 1, 0.92] }}
            transition={{ duration: 6.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
            <div className="mb-2 flex justify-center">
              <VoiceStatus state={state} />
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <VoiceOrb state={state} level={level} />
            </div>

            <div className="space-y-3 rounded-[1.35rem] border border-white/10 bg-black/35 p-3 backdrop-blur-xl sm:p-4">
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
