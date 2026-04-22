import { motion, useReducedMotion } from "framer-motion";
import type { VoiceState } from "../../types/voice";

interface VoiceOrbProps {
  state: VoiceState;
  level: number;
}

function scaleFor(state: VoiceState, level: number) {
  if (state === "muted") return 0.92;
  if (state === "error") return 0.96;
  if (state === "thinking") return 1.02 + level * 0.06;
  if (state === "speaking") return 1.06 + level * 0.18;
  if (state === "listening") return 1 + level * 0.15;
  return 1 + level * 0.05;
}

export function VoiceOrb({ state, level }: VoiceOrbProps) {
  const reducedMotion = useReducedMotion();
  const scale = scaleFor(state, level);
  const tint =
    state === "error"
      ? "from-rose-300/60 via-rose-700/55 to-zinc-900/80"
      : state === "muted"
        ? "from-zinc-400/35 via-zinc-700/45 to-zinc-900/75"
        : "from-slate-100/75 via-blue-300/50 to-violet-500/65";

  return (
    <div className="relative grid h-[20.5rem] w-[20.5rem] place-items-center sm:h-[26rem] sm:w-[26rem]">
      <motion.div
        className="absolute inset-[-16%] rounded-full bg-violet-500/20 blur-[76px]"
        animate={reducedMotion ? undefined : { opacity: [0.18, 0.38, 0.18], scale: [0.94, 1.08, 0.94] }}
        transition={{ duration: state === "speaking" ? 1.1 : 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[-2%] rounded-full border border-white/20"
        animate={
          reducedMotion
            ? undefined
            : {
                rotate: state === "thinking" ? [0, 360] : 0,
                scale: [1, 1.06, 1],
                opacity: [0.22, 0.62, 0.22],
              }
        }
        transition={{
          rotate: { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
          scale: { duration: 1.9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
          opacity: { duration: 1.9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
        }}
      />
      <motion.div
        className={`absolute inset-3 rounded-full bg-gradient-to-br blur-[56px] ${tint}`}
        animate={reducedMotion ? undefined : { scale: [0.9, 1.14, 0.9], opacity: [0.34, 0.94, 0.42] }}
        transition={{ duration: state === "speaking" ? 0.95 : 2.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[16%] rounded-full border border-white/20 bg-black/45 backdrop-blur-2xl"
        animate={reducedMotion ? undefined : { scale: [scale * 0.95, scale, scale * 0.95], opacity: [0.76, 0.95, 0.8] }}
        transition={{ duration: state === "speaking" ? 0.62 : 1.25, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className={`absolute inset-[24%] rounded-full bg-gradient-to-br ${tint}`}
        animate={reducedMotion ? undefined : { scale: [scale * 0.9, scale * 1.08, scale * 0.9], opacity: [0.68, 0.98, 0.74] }}
        transition={{ duration: state === "speaking" ? 0.54 : 1.05, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
    </div>
  );
}
