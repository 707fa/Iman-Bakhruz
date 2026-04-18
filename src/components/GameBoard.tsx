import { AnimatePresence, motion } from "framer-motion";
import { Card, type LearningCard } from "./Card";

export interface CardGamePlayer {
  playerId: string;
  playerName: string;
  cards: LearningCard[];
  deckSize?: number;
  score?: number;
  isConnected?: boolean;
  isCurrentTurn?: boolean;
}

interface GameBoardProps {
  players: CardGamePlayer[];
  currentPlayerTurn: string;
  activeAnswererId?: string;
  currentCard?: LearningCard | null;
  localPlayerId?: string;
  onCardAnswered: (cardId: string, correct: boolean) => void;
}

function getDeckSize(player: CardGamePlayer): number {
  return player.deckSize ?? player.cards.length;
}

export function GameBoard({ players, currentPlayerTurn, activeAnswererId, currentCard, localPlayerId, onCardAnswered }: GameBoardProps) {
  const presenter = players.find((player) => player.playerId === currentPlayerTurn) ?? null;
  const answerer =
    players.find((player) => player.playerId === activeAnswererId) ??
    players.find((player) => player.playerId !== currentPlayerTurn) ??
    null;
  const visibleCard = currentCard ?? presenter?.cards[0] ?? null;
  const canJudgeAnswer = Boolean(visibleCard && (!localPlayerId || localPlayerId === activeAnswererId || localPlayerId === currentPlayerTurn));

  return (
    <div className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(128,0,32,0.35),transparent_32%),linear-gradient(135deg,#07070a,#12121a_48%,#050507)] px-3 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100dvh-2.5rem)] max-w-7xl grid-rows-[1fr_auto] gap-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_28px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.09),transparent_35%,rgba(255,255,255,0.04))]" />

          <div className="relative grid h-full gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
            <div className="flex min-h-[30rem] flex-col items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">Current round</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                  {presenter ? `${presenter.playerName} shows a card` : "Waiting for players"}
                </h1>
                <p className="mt-3 text-sm font-semibold text-white/60">
                  {answerer ? `${answerer.playerName} answers. Correct cards disappear, failed cards move to the answerer's deck.` : "Need 2-4 players to begin."}
                </p>
              </div>

              <AnimatePresence mode="popLayout">
                {visibleCard ? (
                  <motion.div
                    key={visibleCard.id}
                    className="flex w-full justify-center"
                    initial={{ opacity: 0, x: 80, rotateZ: 6, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, rotateZ: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -160, y: -40, rotateZ: -14, scale: 0.72 }}
                    transition={{ type: "spring", stiffness: 160, damping: 22 }}
                  >
                    <Card card={visibleCard} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-deck"
                    className="rounded-3xl border border-dashed border-white/15 bg-white/[0.04] px-8 py-12 text-center text-white/55"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                  >
                    No active card. Waiting for the next turn.
                  </motion.div>
                )}
              </AnimatePresence>

              {visibleCard ? (
                <div className="flex flex-wrap justify-center gap-3">
                  <motion.button
                    type="button"
                    disabled={!canJudgeAnswer}
                    onClick={() => onCardAnswered(visibleCard.id, true)}
                    className="rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-45"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    Correct
                  </motion.button>
                  <motion.button
                    type="button"
                    disabled={!canJudgeAnswer}
                    onClick={() => onCardAnswered(visibleCard.id, false)}
                    className="rounded-2xl border border-red-300/25 bg-red-500/15 px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 shadow-lg shadow-red-950/30 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-45"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    Take card
                  </motion.button>
                </div>
              ) : null}
            </div>

            <aside className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">Room decks</p>
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
                          ? "border-burgundy-300/55 bg-burgundy-500/18 shadow-lg shadow-burgundy-950/30"
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
                            {isPresenter ? "Showing card" : isAnswerer ? "Answering" : "Waiting"}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black">
                          {deckSize === 0 ? "Winner" : `${deckSize} cards`}
                        </span>
                      </div>

                      <div className="mt-4 h-16">
                        <div className="relative h-full">
                          {Array.from({ length: Math.min(deckSize, 4) }).map((_, cardIndex) => (
                            <div
                              key={`${player.playerId}-stack-${cardIndex}`}
                              className="absolute h-14 w-24 rounded-xl border border-white/12 bg-gradient-to-br from-white/18 to-white/[0.035] shadow-lg"
                              style={{
                                left: `${cardIndex * 14}px`,
                                top: `${cardIndex * 2}px`,
                                transform: `rotate(${cardIndex * 3 - 4}deg)`,
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
        </section>
      </div>
    </div>
  );
}
