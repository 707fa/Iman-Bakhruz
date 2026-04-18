import { useState } from "react";
import type { ReactNode } from "react";
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
  onFlip?: (flipped: boolean) => void;
  forceFlipped?: boolean;
  compact?: boolean;
}

export function Card({ card, word, translation, hint, hintText, hintEmoji, onFlip, forceFlipped, compact }: CardProps) {
  const [localFlipped, setLocalFlipped] = useState(false);
  const isControlled = typeof forceFlipped === "boolean";
  const isFlipped = isControlled ? forceFlipped : localFlipped;
  const cardWord = card?.word ?? word ?? "";
  const cardTranslation = card?.translation ?? translation ?? "";
  const cardHintText = card?.hintText ?? hintText ?? hint ?? "";
  const cardHintEmoji = card?.hintEmoji ?? hintEmoji ?? "";

  function toggleFlip() {
    if (isControlled) {
      onFlip?.(!isFlipped);
      return;
    }

    setLocalFlipped((current) => {
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
      className={`group relative ${compact ? "h-44 max-w-xs" : "h-64 max-w-sm"} w-full cursor-pointer select-none [perspective:1600px]`}
      initial={{ opacity: 0, y: 24, rotateZ: -2 }}
      animate={{ opacity: 1, y: 0, rotateZ: 0 }}
      exit={{ opacity: 0, x: 180, y: -32, rotateZ: 14, scale: 0.72 }}
      transition={{ type: "spring", stiffness: 170, damping: 20 }}
      whileHover={{ y: -8, rotateZ: -1.2, scale: 1.025 }}
      whileTap={{ scale: 0.965, rotateZ: 0 }}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <PaperFace accent="front">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-amber-900/10 bg-amber-100/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-950/55">
              Front
            </span>
            {cardHintEmoji ? <span className="text-4xl drop-shadow-sm">{cardHintEmoji}</span> : <span className="text-3xl opacity-35">?</span>}
          </div>

          <div className="mt-auto">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-950/40">English word</p>
            <h2 className={`${compact ? "text-3xl" : "text-5xl"} mt-2 break-words font-black tracking-tight text-zinc-950`}>
              {cardWord || "word"}
            </h2>
          </div>

          <div className="mt-auto rounded-2xl border border-amber-950/10 bg-white/55 px-4 py-3 shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-950/45">Hint</p>
            <p className="mt-1 text-sm font-bold text-zinc-800">{cardHintText || "No hint yet"}</p>
          </div>
        </PaperFace>

        <PaperFace accent="back">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-emerald-900/10 bg-emerald-100/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-950/55">
              Back
            </span>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-950/35">Translation</span>
          </div>

          <div className="my-auto">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-950/40">Russian</p>
            <h2 className={`${compact ? "text-3xl" : "text-5xl"} mt-2 break-words font-black tracking-tight text-zinc-950`}>
              {cardTranslation || "перевод"}
            </h2>
          </div>

          <p className="rounded-2xl border border-emerald-950/10 bg-white/55 px-4 py-3 text-xs font-bold text-zinc-700 shadow-inner">
            If a student does not know this translation, the card goes into their deck.
          </p>
        </PaperFace>
      </motion.div>
    </motion.button>
  );
}

function PaperFace({ accent, children }: { accent: "front" | "back"; children: ReactNode }) {
  const back = accent === "back";

  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden rounded-[1.85rem] border p-5 text-left shadow-[0_26px_70px_rgba(0,0,0,0.34)] [backface-visibility:hidden] ${
        back
          ? "border-emerald-900/15 bg-[linear-gradient(135deg,#d7f4de,#f8fff9_48%,#b8e6c2)] [transform:rotateY(180deg)]"
          : "border-amber-900/15 bg-[linear-gradient(135deg,#fff4cf,#fffdf3_46%,#e8d29a)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:radial-gradient(circle_at_1px_1px,rgba(80,50,20,0.35)_1px,transparent_0)] [background-size:18px_18px]" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/55 blur-2xl" />
      <div className="pointer-events-none absolute bottom-3 left-4 right-4 h-px bg-black/10" />
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  );
}
