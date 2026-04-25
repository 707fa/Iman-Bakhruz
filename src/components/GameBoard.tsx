import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle2, Eye, Send, XCircle } from "lucide-react";
import { Card, type LearningCard } from "./Card";

export interface CardGamePlayer {
  playerId: string;
  playerName: string;
  cards: LearningCard[];
  deckSize?: number;
  score?: number;
  isConnected?: boolean;
}

export interface AnswerCheckResult {
  isCorrect: boolean;
  answerText: string;
  distance: number;
  message: string;
}

interface GameBoardProps {
  players: CardGamePlayer[];
  currentPlayerTurn: string;
  activeAnswererId?: string;
  currentCard?: LearningCard | null;
  localPlayerId?: string;
  tablePileCount?: number;
  lastAnswer?: AnswerCheckResult | null;
  onCheckAnswer: (cardId: string, answerText: string) => AnswerCheckResult;
  onCardAnswered: (cardId: string, result: AnswerCheckResult) => void;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("С‘", "Рµ")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function getDeckSize(player: CardGamePlayer): number {
  return player.deckSize ?? player.cards.length;
}

export function GameBoard({
  players,
  currentPlayerTurn,
  activeAnswererId,
  currentCard,
  localPlayerId,
  tablePileCount = 0,
  lastAnswer,
  onCheckAnswer,
  onCardAnswered,
}: GameBoardProps) {
  const [answer, setAnswer] = useState("");
  const [isTranslationVisible, setIsTranslationVisible] = useState(false);
  const [localCheck, setLocalCheck] = useState<AnswerCheckResult | null>(null);
  const presenter = players.find((player) => player.playerId === currentPlayerTurn) ?? null;
  const answerer = players.find((player) => player.playerId === activeAnswererId) ?? players.find((player) => player.playerId !== currentPlayerTurn) ?? null;
  const visibleCard = currentCard ?? presenter?.cards[0] ?? null;
  const canAnswer = Boolean(visibleCard && (!localPlayerId || localPlayerId === activeAnswererId));

  const answerPreview = useMemo(() => {
    if (!visibleCard || !answer.trim()) return "AI waits for the answer";
    const normalizedAnswer = normalizeText(answer);
    const normalizedTarget = normalizeText(visibleCard.translation);
    if (normalizedAnswer === normalizedTarget) return "Looks correct";
    return "AI will check typos";
  }, [answer, visibleCard]);

  function submitToAi() {
    if (!visibleCard || !answer.trim()) return;

    const check = onCheckAnswer(visibleCard.id, answer);
    setLocalCheck(check);
    onCardAnswered(visibleCard.id, check);
    setAnswer("");
    setIsTranslationVisible(false);
  }

  function manualSubmit(correct: boolean) {
    if (!visibleCard) return;
    const check: AnswerCheckResult = {
      isCorrect: correct,
      answerText: answer.trim() || "spoken answer",
      distance: 0,
      message: correct ? "Teacher marked it as correct." : "Teacher marked it as incorrect.",
    };
    setLocalCheck(check);
    onCardAnswered(visibleCard.id, check);
    setAnswer("");
    setIsTranslationVisible(false);
  }

  const publicAnswer = lastAnswer ?? localCheck;
  const publicStatusLabel = publicAnswer?.isCorrect ? "Correct" : "Incorrect";

  return (
    <div className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(128,0,32,0.34),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_28%),linear-gradient(135deg,#07070a,#12121a_48%,#050507)] px-2 py-2 text-white sm:px-6 sm:py-4 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-3 xl:grid-cols-[1fr_360px]">
        <main className="relative min-h-[calc(100dvh-0.95rem)] overflow-hidden rounded-[1.3rem] border border-white/10 bg-white/[0.055] p-2.5 shadow-[0_28px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:min-h-[calc(100dvh-2rem)] sm:rounded-[2.2rem] sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.1),transparent_32%,rgba(255,255,255,0.035))]" />
          <div className="relative flex min-h-[calc(100dvh-4.75rem)] flex-col items-center justify-start gap-3 pb-[calc(9.2rem+env(safe-area-inset-bottom))] sm:min-h-[calc(100dvh-5rem)] sm:justify-center sm:gap-5 sm:pb-[calc(9.5rem+env(safe-area-inset-bottom))]">
            <div className="w-full text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Ketka classic</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-5xl">
                {presenter ? `${presenter.playerName} shows the card` : "Waiting for players"}
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-xs font-semibold text-white/60 sm:text-sm">
                {answerer
                  ? `${answerer.playerName} is answering now. If the answer is wrong, the player takes the whole bank: ${tablePileCount + 1} card${tablePileCount + 1 === 1 ? "" : "s"}.`
                  : "Choose online students, send invites, and wait for accepted players."}
              </p>
            </div>

            <div className="grid w-full max-w-2xl grid-cols-2 gap-2 xl:hidden">
              <div className="rounded-2xl border border-white/10 bg-black/24 p-3 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Presenter</p>
                <p className="mt-1 text-sm font-black">{presenter?.playerName ?? "Waiting..."}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/24 p-3 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Answering</p>
                <p className="mt-1 text-sm font-black">{answerer?.playerName ?? "Waiting..."}</p>
              </div>
            </div>

            <div className="flex w-full max-w-2xl items-center justify-between rounded-2xl border border-white/10 bg-black/24 p-2.5 backdrop-blur-xl sm:rounded-3xl sm:p-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Table bank</p>
                <p className="mt-1 text-lg font-black">{tablePileCount} card{tablePileCount === 1 ? "" : "s"}</p>
              </div>
              <div className="flex -space-x-3">
                {Array.from({ length: Math.min(tablePileCount + 1, 5) }).map((_, index) => (
                  <div
                    key={index}
                    className="h-10 w-7 rounded-md border border-amber-900/20 bg-[linear-gradient(135deg,#fff4cf,#fffdf3_46%,#e8d29a)] shadow-lg sm:h-12 sm:w-9 sm:rounded-lg"
                    style={{ transform: `rotate(${index * 5 - 8}deg)` }}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {visibleCard ? (
                <motion.div
                  key={visibleCard.id}
                  className="flex w-full justify-center px-0.5 sm:px-0"
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
              <section className="fixed inset-x-1.5 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-30 mx-auto w-auto max-w-2xl rounded-[1.1rem] border border-white/10 bg-black/75 p-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:sticky sm:bottom-2 sm:inset-x-auto sm:w-full sm:rounded-[1.7rem] sm:bg-black/35 sm:p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">Control panel</p>
                    <p className="mt-1 text-[11px] font-bold text-white/55">{canAnswer ? "Your turn to answer" : "Opponent is answering"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTranslationVisible((current) => !current)}
                    className="inline-flex min-h-11 items-center rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.13em] text-white transition hover:bg-white/15"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Flip
                  </button>
                </div>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">Student answer</span>
                  <input
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submitToAi();
                    }}
                    placeholder="Write the translation. Opponent sees only correct or incorrect."
                    className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/28 focus:border-burgundy-300/60 focus:ring-4 focus:ring-burgundy-700/20"
                  />
                </label>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <button
                    type="button"
                    onClick={submitToAi}
                    disabled={!canAnswer || !answer.trim()}
                    className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.13em] text-zinc-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-1 sm:min-h-12 sm:px-5 sm:py-3 sm:text-sm"
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    AI check
                  </button>
                  <button
                    type="button"
                    onClick={() => manualSubmit(true)}
                    disabled={!canAnswer}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-3 py-2.5 text-xs font-black text-emerald-100 transition hover:bg-emerald-400/25 disabled:opacity-45 sm:min-h-12 sm:px-4 sm:py-3 sm:text-sm"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => manualSubmit(false)}
                    disabled={!canAnswer}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-300/25 bg-red-500/15 px-3 py-2.5 text-xs font-black text-red-100 transition hover:bg-red-500/25 disabled:opacity-45 sm:min-h-12 sm:px-4 sm:py-3 sm:text-sm"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Fail
                  </button>
                </div>

                <div className="mt-3 text-sm font-bold text-white/45">{answerPreview}</div>

                {publicAnswer ? (
                  <motion.div
                    className={`mt-4 rounded-2xl border px-4 py-3 ${
                      publicAnswer.isCorrect
                        ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                        : "border-red-300/25 bg-red-500/10 text-red-100"
                    }`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="flex items-center text-sm font-black">
                      <Send className="mr-2 h-4 w-4" />
                      AI result: {publicStatusLabel}
                    </p>
                    <p className="mt-1 text-xs font-semibold opacity-75">{publicAnswer.message}</p>
                  </motion.div>
                ) : null}
              </section>
            ) : null}
          </div>
        </main>

        <aside className="hidden rounded-[1.8rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:rounded-[2rem] xl:block">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Players and stacks</p>
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
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${player.isConnected === false ? "bg-zinc-500" : "bg-emerald-400"}`} />
                        <p className="text-base font-black">{player.playerName}</p>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-white/45">
                        {isPresenter ? "Showing card" : isAnswerer ? "Answering now" : "Waiting"}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black">
                      {deckSize === 0 ? "Winner" : `${deckSize} cards`}
                    </span>
                  </div>

                  <div className="mt-4 h-16 sm:h-20">
                    <div className="relative h-full">
                      {Array.from({ length: Math.min(deckSize, 5) }).map((_, cardIndex) => (
                        <div
                          key={`${player.playerId}-stack-${cardIndex}`}
                          className="absolute h-14 w-20 rounded-xl border border-amber-900/15 bg-[linear-gradient(135deg,#fff4cf,#fffdf3_46%,#e8d29a)] shadow-lg sm:h-16 sm:w-24"
                          style={{
                            left: `${cardIndex * 10}px`,
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

        <section className="grid gap-3 xl:hidden">
          {players.map((player, index) => {
            const deckSize = getDeckSize(player);
            const isPresenter = player.playerId === currentPlayerTurn;
            const isAnswerer = player.playerId === answerer?.playerId;

            return (
              <motion.div
                key={player.playerId}
                className={`rounded-3xl border p-4 backdrop-blur-xl ${
                  isPresenter
                    ? "border-burgundy-300/55 bg-burgundy-500/18"
                    : isAnswerer
                      ? "border-cyan-300/35 bg-cyan-400/10"
                      : "border-white/10 bg-white/[0.045]"
                }`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black">{player.playerName}</p>
                    <p className="mt-1 text-xs font-semibold text-white/55">
                      {isPresenter ? "Showing card" : isAnswerer ? "Answering now" : "Waiting turn"}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black">
                    {deckSize === 0 ? "Winner" : `${deckSize} cards`}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
