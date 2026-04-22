import { Mic, MicOff, Volume2, VolumeX, X } from "lucide-react";
import { motion } from "framer-motion";

interface VoiceControlsProps {
  micMuted: boolean;
  audioMuted: boolean;
  onToggleMic: () => void;
  onToggleAudio: () => void;
  onClose: () => void;
}

export function VoiceControls({ micMuted, audioMuted, onToggleMic, onToggleAudio, onClose }: VoiceControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <motion.button
        type="button"
        onClick={onToggleMic}
        className={`inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-md backdrop-blur transition sm:h-14 sm:w-14 ${
          micMuted ? "border-white/20 bg-zinc-900/80 text-zinc-100" : "border-burgundy-300/45 bg-burgundy-600/35 text-white"
        }`}
        whileTap={{ scale: 0.94 }}
        aria-label={micMuted ? "Start listening" : "Stop listening"}
      >
        {micMuted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </motion.button>

      <motion.button
        type="button"
        onClick={onToggleAudio}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-zinc-900/80 text-zinc-100 shadow-md backdrop-blur transition sm:h-14 sm:w-14"
        whileTap={{ scale: 0.94 }}
        aria-label={audioMuted ? "Unmute audio" : "Mute audio"}
      >
        {audioMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </motion.button>

      <motion.button
        type="button"
        onClick={onClose}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white text-zinc-900 shadow-md transition sm:h-14 sm:w-14"
        whileTap={{ scale: 0.94 }}
        aria-label="End voice"
      >
        <X className="h-5 w-5" />
      </motion.button>
    </div>
  );
}
