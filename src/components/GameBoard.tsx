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
  onCardAnswered: (cardId: string, correct: boolean, answerText?: string) => void;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
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
  const canAnswer = Boolean(visibleCard && (!localPlayerId || localPlayerId === activeAnswererId || localPlayerId === currentPlayerTurn));

  const answerPreview = useMemo(() => {
    if (!visibleCard || !answer.trim()) return "AI ждет ответ";
    const normalizedAnswer = normalizeText(answer);
    const normalizedTarget = normalizeText(visibleCard.translation);
    if (normalizedAnswer === normalizedTarget) return "Похоже правильно";
    return "AI проверит опечатки";
  }, [answer, visibleCard]);

  function submitToAi() {
    if (!visibleCard || !answer.trim()) return;

    const check = onCheckAnswer(visibleCard.id, answer);
    setLocalCheck(check);
    onCardAnswered(visibleCard.id, check.isCorrect, answer);
    setAnswer("");
    setIsTranslationVisible(false);
  }

  function manualSubmit(correct: boolean) {
    if (!visibleCard) return;
    const check: AnswerCheckResult = {
      isCorrect: correct,
      answerText: answer.trim() || "устный ответ",
      distance: 0,
      message: correct ? "Учитель отметил как правильно." : "Учитель отметил как ошибку.",
    };
    setLocalCheck(check);
    onCardAnswered(visibleCard.id, correct, check.answerText);
    setAnswer("");
    setIsTranslationVisible(false);
  }

  const publicAnswer = lastAnswer ?? localCheck;

  return (
    <div className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(128,0,32,0.34),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_28%),linear-gradient(135deg,#07070a,#12121a_48%,#050507)] px-3 py-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[1fr_360px]">
        <main className="relative min-h-[calc(100dvh-2rem)] overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_28px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:rounded-[2.2rem] sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.1),transparent_32%,rgba(255,255,255,0.035))]" />
          <div className="relative flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-5">
            <div className="w-full text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Ketka classic</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                {presenter ? `${presenter.playerName} показывает карточку` : "Ждем игроков"}
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold text-white/60">
                {answerer
                  ? `${answerer.playerName} отвечает. Если ошибся, забирает весь банк: ${tablePileCount + 1} карточек.`
                  : "Выбери онлайн учеников, отправь запрос и дождись принятия."}
              </p>
            </div>

            <div className="flex w-full max-w-2xl items-center justify-between rounded-3xl border border-white/10 bg-black/24 p-3 backdrop-blur-xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Банк стола</p>
                <p className="mt-1 text-lg font-black">{tablePileCount} уже прошли</p>
              </div>
              <div className="flex -space-x-3">
                {Array.from({ length: Math.min(tablePileCount + 1, 5) }).map((_, index) => (
                  <div
                    key={index}
                    className="h-12 w-9 rounded-lg border border-amber-900/20 bg-[linear-gradient(135deg,#fff4cf,#fffdf3_46%,#e8d29a)] shadow-lg"
                    style={{ transform: `rotate(${index * 5 - 8}deg)` }}
                  />
                ))}
              </div>
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
                  Нет активной карточки.
                </motion.div>
              )}
            </AnimatePresence>

            {visibleCard ? (
              <section className="w-full max-w-2xl rounded-[1.7rem] border border-white/10 bg-black/28 p-4 backdrop-blur-xl">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Ответ ученика</span>
                  <input
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submitToAi();
                    }}
                    placeholder="Напиши перевод. AI проверит тихо, соперник увидит сам ответ."
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/28 focus:border-burgundy-300/60 focus:ring-4 focus:ring-burgundy-700/20"
                  />
                </label>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <button
                    type="button"
                    onClick={submitToAi}
                    disabled={!canAnswer || !answer.trim()}
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-zinc-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    AI check
                  </button>
                  <button
                    type="button"
                    onClick={() => manualSubmit(true)}
                    disabled={!canAnswer}
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/25 disabled:opacity-45"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => manualSubmit(false)}
                    disabled={!canAnswer}
                    className="inline-flex items-center justify-center rounded-2xl border border-red-300/25 bg-red-500/15 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-500/25 disabled:opacity-45"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Fail
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm font-bold">
                  <p className="text-white/45">{answerPreview}</p>
                  <button
                    type="button"
                    onClick={() => setIsTranslationVisible((current) => !current)}
                    className="inline-flex items-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-white transition hover:bg-white/15"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Flip
                  </button>
                </div>

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
                      Ответ был: “{publicAnswer.answerText}”
                    </p>
                    <p className="mt-1 text-xs font-semibold opacity-75">{publicAnswer.message}</p>
                  </motion.div>
                ) : null}
              </section>
            ) : null}
          </div>
        </main>

        <aside className="rounded-[1.8rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:rounded-[2rem]">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Игроки и стопки</p>
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
                        {isPresenter ? "Показывает" : isAnswerer ? "Отвечает" : "Ждет"}
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
      </div>
    </div>
  );
}
