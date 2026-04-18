import { useState } from "react";
import { motion } from "framer-motion";

export interface LearningCard {
  id: string;
  word: string;
  translation: string;
  hintText?: string;
  hintEmoji?: string;
}

interface CardProps {
  card?: LearningCard;
  word?: string;
  translation?: string;
  hint?: string;
  hintText?: string;
  hintEmoji?: string;
  cardId?: string;
  onFlip?: (flipped: boolean) => void;
}

export function Card({ card, word, translation, hint, hintText, hintEmoji, onFlip }: CardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardWord = card?.word ?? word ?? "";
  const cardTranslation = card?.translation ?? translation ?? "";
  const cardHintText = card?.hintText ?? hintText ?? hint ?? "";
  const cardHintEmoji = card?.hintEmoji ?? hintEmoji ?? "";

  function toggleFlip() {
    setIsFlipped((current) => {
      const next = !current;
      onFlip?.(next);
      return next;
    });
  }

  return (
    <motion.button
      type="button"
      aria-pressed={isFlipped}
      onClick={toggleFlip}
      className="group relative h-56 w-full max-w-sm cursor-pointer select-none [perspective:1400px]"
      initial={{ opacity: 0, y: 18, rotateX: -8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, y: -26, scale: 0.92, rotateZ: -4 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      whileHover={{ y: -6, scale: 1.025 }}
      whileTap={{ scale: 0.965 }}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-6 text-left shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl [backface-visibility:hidden] dark:bg-zinc-950/65">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-burgundy-500/25 blur-3xl" />
          <div className="absolute -bottom-16 left-6 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                English
              </span>
              {cardHintEmoji ? <span className="text-3xl drop-shadow-lg">{cardHintEmoji}</span> : null}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Your word</p>
              <h2 className="mt-2 break-words text-4xl font-black tracking-tight text-white sm:text-5xl">{cardWord}</h2>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Hint</p>
              <p className="mt-1 text-sm font-semibold text-white/82">{cardHintText || "No hint provided"}</p>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-emerald-950/45 p-6 text-left shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="absolute -left-16 top-4 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between">
            <span className="w-fit rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100/75">
              Russian
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/50">Translation</p>
              <h2 className="mt-2 break-words text-4xl font-black tracking-tight text-emerald-50 sm:text-5xl">
                {cardTranslation}
              </h2>
            </div>

            <p className="text-xs font-semibold text-emerald-100/55">Click again to return to the English side.</p>
          </div>
        </div>
      </motion.div>
    </motion.button>
  );
}
