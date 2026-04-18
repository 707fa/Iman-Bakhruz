import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, type LearningCard } from "./Card";

export interface CardGamePlayer {
  playerId: string;
  playerName: string;
  cards: LearningCard[];
  deckSize?: number;
  score?: number;
  isConnected?: boolean;
}

interface GameBoardProps {
  players: CardGamePlayer[];
  currentPlayerTurn: string;
  activeAnswererId?: string;
  currentCard?: LearningCard | null;
  localPlayerId?: string;
  onCardAnswered: (cardId: string, correct: boolean, answerText?: string) => void;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replaceAll("ё", "е");
}

function getDeckSize(player: CardGamePlayer): number {
  return player.deckSize ?? player.cards.length;
}

export function GameBoard({ players, currentPlayerTurn, activeAnswererId, currentCard, localPlayerId, onCardAnswered }: GameBoardProps) {
  const [answer, setAnswer] = useState("");
  const [isTranslationVisible, setIsTranslationVisible] = useState(false);
  const presenter = players.find((player) => player.playerId === currentPlayerTurn) ?? null;
  const answerer = players.find((player) => player.playerId === activeAnswererId) ?? players.find((player) => player.playerId !== currentPlayerTurn) ?? null;
  const visibleCard = currentCard ?? presenter?.cards[0] ?? null;
  const canJudgeAnswer = Boolean(visibleCard && (!localPlayerId || localPlayerId === activeAnswererId || localPlayerId === currentPlayerTurn));

  const answerState = useMemo(() => {
    if (!visibleCard || !answer.trim()) return "idle";
    return normalizeText(answer) === normalizeText(visibleCard.translation) ? "correct" : "checking";
  }, [answer, visibleCard]);

  function submit(correct: boolean) {
    if (!visibleCard) return;
    onCardAnswered(visibleCard.id, correct, answer);
    setAnswer("");
    setIsTranslationVisible(false);
  }

  function autoCheck() {
    if (!visibleCard) return;
    submit(normalizeText(answer) === normalizeText(visibleCard.translation));
  }

  return (
    <div className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(128,0,32,0.34),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_28%),linear-gradient(135deg,#07070a,#12121a_48%,#050507)] px-3 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[1fr_370px]">
        <main className="relative min-h-[calc(100dvh-2.5rem)] overflow-hidden rounded-[2.2rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_28px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.1),transparent_32%,rgba(255,255,255,0.035))]" />
          <div className="relative flex min-h-[calc(100dvh-6rem)] flex-col items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Ketka classic</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                {presenter ? `${presenter.playerName} shows a card` : "Waiting for players"}
              </h1>
              <p className="mt-3 text-sm font-semibold text-white/60">
                {answerer ? `${answerer.playerName} answers. Wrong answer means the card flies into their deck.` : "Choose 2-4 players and start the room."}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {visibleCard ? (
                <motion.div
                  key={visibleCard.id}
                  className="flex w-full justify-center"
                  initial={{ opacity: 0, x: 120, y: 18, rotateZ: 9, scale: 0.88 }}
                  animate={{ opacity: 1, x: 0, y: 0, rotateZ: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 220, y: -85, rotateZ: 18, scale: 0.62 }}
                  transition={{ type: "spring", stiffness: 155, damping: 20 }}
                >
                  <Card card={visibleCard} forceFlipped={isTranslationVisible} onFlip={setIsTranslationVisible} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="rounded-3xl border border-dashed border-white/15 bg-white/[0.04] px-8 py-12 text-center text-white/55"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                >
                  No active card.
                </motion.div>
              )}
            </AnimatePresence>

            {visibleCard ? (
              <section className="w-full max-w-2xl rounded-[1.7rem] border border-white/10 bg-black/28 p-4 backdrop-blur-xl">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Student answer</span>
                  <input
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") autoCheck();
                    }}
                    placeholder="Напиши перевод или скажи его вслух и отметь результат"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/28 focus:border-burgundy-300/60 focus:ring-4 focus:ring-burgundy-700/20"
                  />
                </label>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={autoCheck}
                    disabled={!canJudgeAnswer || !answer.trim()}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-zinc-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Check typed answer
                  </button>
                  <button
                    type="button"
                    onClick={() => submit(true)}
                    disabled={!canJudgeAnswer}
                    className="rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-emerald-100 transition hover:bg-emerald-400/25 disabled:opacity-45"
                  >
                    Correct
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTranslationVisible(true);
                      submit(false);
                    }}
                    disabled={!canJudgeAnswer}
                    className="rounded-2xl border border-red-300/25 bg-red-500/15 px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-red-100 transition hover:bg-red-500/25 disabled:opacity-45"
                  >
                    Wrong: take card
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTranslationVisible((current) => !current)}
                    className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-white transition hover:bg-white/15"
                  >
                    Flip
                  </button>
                </div>

                <p className={`mt-3 text-sm font-bold ${answerState === "correct" ? "text-emerald-200" : "text-white/45"}`}>
                  {answerState === "correct" ? "Looks correct. Press Correct or Enter to remove the card." : "Tip: teacher can still decide manually if spelling is close."}
                </p>
              </section>
            ) : null}
          </div>
        </main>

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Players and decks</p>
          <div className="mt-4 space-y-3">
            {players.map((player, index) => {
              const deckSize = getDeckSize(player);
              const isPresenter = player.playerId === currentPlayerTurn;
              const isAnswerer = player.playerId === answerer?.playerId;

              return (
                <motion.div
                  key={player.playerId}
                  className={`rounded-3xl border p-4 transition ${
                    isPresenter
                      ? "border-burgundy-300/55 bg-burgundy-500/18"
                      : isAnswerer
                        ? "border-cyan-300/35 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.045]"
                  }`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.045 }}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black">{player.playerName}</p>
                      <p className="mt-1 text-xs font-semibold text-white/45">
                        {isPresenter ? "Showing" : isAnswerer ? "Answering" : "Waiting"}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black">
                      {deckSize === 0 ? "Winner" : `${deckSize} cards`}
                    </span>
                  </div>

                  <div className="mt-4 h-20">
                    <div className="relative h-full">
                      {Array.from({ length: Math.min(deckSize, 5) }).map((_, cardIndex) => (
                        <div
                          key={`${player.playerId}-stack-${cardIndex}`}
                          className="absolute h-16 w-24 rounded-xl border border-amber-900/15 bg-[linear-gradient(135deg,#fff4cf,#fffdf3_46%,#e8d29a)] shadow-lg"
                          style={{
                            left: `${cardIndex * 12}px`,
                            top: `${cardIndex * 3}px`,
                            transform: `rotate(${cardIndex * 3 - 5}deg)`,
                            zIndex: cardIndex,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
