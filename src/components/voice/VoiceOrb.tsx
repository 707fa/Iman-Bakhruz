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
    <div className="relative grid h-[18rem] w-[18rem] place-items-center sm:h-[23rem] sm:w-[23rem]">
      <motion.div
        className="absolute inset-[-12%] rounded-full bg-violet-500/15 blur-[64px]"
        animate={reducedMotion ? undefined : { opacity: [0.2, 0.36, 0.2], scale: [0.95, 1.07, 0.95] }}
        transition={{ duration: state === "speaking" ? 1.3 : 2.7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border border-white/20"
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
          rotate: { duration: 11, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
          scale: { duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
          opacity: { duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
        }}
      />
      <motion.div
        className={`absolute inset-3 rounded-full bg-gradient-to-br blur-[48px] ${tint}`}
        animate={reducedMotion ? undefined : { scale: [0.92, 1.12, 0.92], opacity: [0.35, 0.92, 0.4] }}
        transition={{ duration: state === "speaking" ? 1.15 : 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[17%] rounded-full border border-white/20 bg-black/45 backdrop-blur-2xl"
        animate={reducedMotion ? undefined : { scale: [scale * 0.95, scale, scale * 0.95], opacity: [0.76, 0.95, 0.8] }}
        transition={{ duration: state === "speaking" ? 0.72 : 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className={`absolute inset-[25%] rounded-full bg-gradient-to-br ${tint}`}
        animate={reducedMotion ? undefined : { scale: [scale * 0.9, scale * 1.08, scale * 0.9], opacity: [0.68, 0.98, 0.74] }}
        transition={{ duration: state === "speaking" ? 0.6 : 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
    </div>
  );
}
