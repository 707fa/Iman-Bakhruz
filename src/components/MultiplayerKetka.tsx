import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Brain, CopyPlus, Gamepad2, Plus, Sparkles, Trash2, UsersRound, Zap } from "lucide-react";
import { Card, type LearningCard } from "./Card";
import { GameBoard, type CardGamePlayer } from "./GameBoard";
import { useAppStore } from "../hooks/useAppStore";
import { Button } from "./ui/button";

type ArenaTab = "homework" | "lobby" | "ketka" | "speed" | "memory" | "emoji";

interface LocalPlayer extends CardGamePlayer {
  isHuman?: boolean;
}

const STORAGE_KEY = "ketka-homework-deck-v2";
const fallbackDeck: LearningCard[] = [
  { id: "seed-car", word: "car", translation: "машина", hintText: "fast transport", hintEmoji: "🚗" },
  { id: "seed-honest", word: "honest", translation: "честный", hintText: "does not lie", hintEmoji: "🤝" },
  { id: "seed-journey", word: "journey", translation: "путешествие", hintText: "long trip", hintEmoji: "🧭" },
  { id: "seed-brave", word: "brave", translation: "смелый", hintText: "not afraid", hintEmoji: "🛡️" },
];

const aiWords = [
  ["confident", "уверенный", "believes in himself", "🦁"],
  ["schedule", "расписание", "lessons and time", "🗓️"],
  ["improve", "улучшать", "make better", "📈"],
  ["polite", "вежливый", "good manners", "🙏"],
  ["choice", "выбор", "one of options", "🎯"],
] satisfies Array<[string, string, string, string]>;

function readDeck(): LearningCard[] {
  if (typeof window === "undefined") return fallbackDeck;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return fallbackDeck;
  try {
    const parsed = JSON.parse(raw) as LearningCard[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallbackDeck;
  } catch {
    return fallbackDeck;
  }
}

function saveDeck(cards: LearningCard[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function cloneDeckForOpponent(deck: LearningCard[], name: string): LearningCard[] {
  const safeDeck = deck.length ? deck : fallbackDeck;
  return shuffle(safeDeck).slice(0, Math.min(8, Math.max(3, safeDeck.length))).map((card, index) => ({
    ...card,
    id: `${name}-${index}-${card.id}`,
  }));
}

export function MultiplayerKetka() {
  const { state, currentStudent } = useAppStore();
  const [tab, setTab] = useState<ArenaTab>("homework");
  const [deck, setDeck] = useState<LearningCard[]>(() => readDeck());
  const [form, setForm] = useState({ word: "", translation: "", hintText: "", hintEmoji: "" });
  const [selectedOpponentIds, setSelectedOpponentIds] = useState<string[]>([]);
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [winnerName, setWinnerName] = useState("");
  const [memoryOpened, setMemoryOpened] = useState<string[]>([]);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedScore, setSpeedScore] = useState(0);

  useEffect(() => {
    saveDeck(deck);
  }, [deck]);

  const classmates = useMemo(() => {
    const myGroupId = currentStudent?.groupId;
    const sameGroup = state.students.filter((student) => student.id !== currentStudent?.id && (!myGroupId || student.groupId === myGroupId));
    const fallback = [
      { id: "demo-aisha", fullName: "Aisha Demo", groupId: myGroupId ?? "" },
      { id: "demo-umar", fullName: "Umar Demo", groupId: myGroupId ?? "" },
      { id: "demo-madina", fullName: "Madina Demo", groupId: myGroupId ?? "" },
    ];
    return sameGroup.length ? sameGroup : fallback;
  }, [currentStudent, state.students]);

  const currentPlayer = players[currentPlayerIndex];
  const answerer = players.find((player) => player.playerId !== currentPlayer?.playerId);
  const activeCard = currentPlayer?.cards[0] ?? null;
  const canStart = selectedOpponentIds.length >= 1 && selectedOpponentIds.length <= 3 && deck.length > 0;

  function addCard() {
    if (!form.word.trim() || !form.translation.trim()) return;
    setDeck((current) => [
      {
        id: makeId("card"),
        word: form.word.trim(),
        translation: form.translation.trim(),
        hintText: form.hintText.trim() || undefined,
        hintEmoji: form.hintEmoji.trim() || undefined,
      },
      ...current,
    ]);
    setForm({ word: "", translation: "", hintText: "", hintEmoji: "" });
  }

  function addAiCards() {
    setDeck((current) => [
      ...aiWords.map(([word, translation, hintText, hintEmoji]) => ({
        id: makeId("ai"),
        word,
        translation,
        hintText,
        hintEmoji,
      })),
      ...current,
    ]);
  }

  function toggleOpponent(studentId: string) {
    setSelectedOpponentIds((current) => {
      if (current.includes(studentId)) return current.filter((id) => id !== studentId);
      if (current.length >= 3) return current;
      return [...current, studentId];
    });
  }

  function startKetka() {
    const me: LocalPlayer = {
      playerId: currentStudent?.id ?? "me",
      playerName: currentStudent?.fullName ?? "Me",
      cards: shuffle(deck).map((card) => ({ ...card, id: `me-${card.id}` })),
      deckSize: deck.length,
      score: 0,
      isHuman: true,
    };
    const opponents = selectedOpponentIds.map((id) => {
      const student = classmates.find((item) => item.id === id);
      const name = student?.fullName ?? "Player";
      const cards = cloneDeckForOpponent(deck, name);
      return {
        playerId: id,
        playerName: name,
        cards,
        deckSize: cards.length,
        score: 0,
      };
    });

    setPlayers([me, ...opponents]);
    setWinnerName("");
    setCurrentPlayerIndex(0);
    setTab("ketka");
  }

  function resolveAnswer(cardId: string, correct: boolean) {
    setPlayers((current) => {
      const next = current.map((player) => ({ ...player, cards: [...player.cards] }));
      const presenter = next[currentPlayerIndex];
      const nextAnswererIndex = next.findIndex((player) => player.playerId !== presenter.playerId);
      const cardIndex = presenter.cards.findIndex((card) => card.id === cardId);
      if (cardIndex === -1) return current;
      const [card] = presenter.cards.splice(cardIndex, 1);
      presenter.score = (presenter.score ?? 0) + (correct ? 1 : 0);

      if (!correct && nextAnswererIndex >= 0) {
        next[nextAnswererIndex].cards.push({ ...card, id: `${next[nextAnswererIndex].playerId}-taken-${card.id}` });
      }

      const winner = next.find((player) => player.cards.length === 0);
      if (winner) {
        setWinnerName(winner.playerName);
      }

      return next.map((player) => ({ ...player, deckSize: player.cards.length }));
    });

    setCurrentPlayerIndex((current) => {
      if (players.length === 0) return 0;
      for (let offset = 1; offset <= players.length; offset += 1) {
        const nextIndex = (current + offset) % players.length;
        if ((players[nextIndex]?.cards.length ?? 0) > 0) return nextIndex;
      }
      return current;
    });
  }

  const memoryCards = useMemo(() => shuffle(deck.slice(0, 6).flatMap((card) => [
    { id: `${card.id}-word`, pair: card.id, label: card.word },
    { id: `${card.id}-translation`, pair: card.id, label: card.translation },
  ])), [deck]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-burgundy-100 bg-[radial-gradient(circle_at_top_left,rgba(128,0,32,0.18),transparent_35%),linear-gradient(135deg,#111014,#1a1114_45%,#08080b)] p-5 text-white shadow-lift sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Ketka Arena</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Онлайн кетка для английского</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold text-white/65">
              Ученики дома создают свои карточки, на уроке выбирают 1-3 соперников и играют: не знаешь перевод — забираешь карточку себе.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-white/10 p-2 backdrop-blur-xl">
            <Stat label="Cards" value={deck.length} />
            <Stat label="Players" value={selectedOpponentIds.length + 1} />
            <Stat label="Mode" value="2-4" />
          </div>
        </div>
      </section>

      <nav className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <TabButton active={tab === "homework"} onClick={() => setTab("homework")} icon={<CopyPlus className="h-4 w-4" />}>Homework cards</TabButton>
        <TabButton active={tab === "lobby"} onClick={() => setTab("lobby")} icon={<UsersRound className="h-4 w-4" />}>Choose players</TabButton>
        <TabButton active={tab === "ketka"} onClick={() => setTab("ketka")} icon={<Gamepad2 className="h-4 w-4" />}>Ketka classic</TabButton>
        <TabButton active={tab === "speed"} onClick={() => setTab("speed")} icon={<Zap className="h-4 w-4" />}>Speed</TabButton>
        <TabButton active={tab === "memory"} onClick={() => setTab("memory")} icon={<Brain className="h-4 w-4" />}>Memory</TabButton>
        <TabButton active={tab === "emoji"} onClick={() => setTab("emoji")} icon={<Sparkles className="h-4 w-4" />}>Emoji hint</TabButton>
      </nav>

      {tab === "homework" ? (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Panel title="Создать домашнюю карточку" subtitle="Ученик сам пишет слово, подсказку, emoji и перевод. Это его homework deck.">
            <CardForm form={form} setForm={setForm} onAdd={addCard} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button type="button" onClick={addAiCards} variant="secondary">
                <Bot className="mr-2 h-4 w-4" />
                AI ideas
              </Button>
              <Button type="button" onClick={() => setDeck([])} variant="ghost">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear deck
              </Button>
            </div>
          </Panel>

          <Panel title="Моя стопка карточек" subtitle="Так они будут выглядеть на уроке: настоящие листочки, flip front/back и подсказки.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {deck.map((card) => (
                  <motion.div key={card.id} layout>
                    <Card card={card} compact />
                    <button
                      type="button"
                      onClick={() => setDeck((current) => current.filter((item) => item.id !== card.id))}
                      className="mt-2 w-full rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                    >
                      Remove
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "lobby" ? (
        <Panel title="Выбери соперников из группы" subtitle="Можно играть 2, 3 или 4 человека. В реальном онлайне эти игроки подключаются со своих телефонов, здесь уже готов classroom flow.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {classmates.map((student) => {
              const active = selectedOpponentIds.includes(student.id);
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => toggleOpponent(student.id)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    active
                      ? "border-burgundy-500 bg-burgundy-50 text-burgundy-950 shadow-soft dark:bg-burgundy-950/35 dark:text-white"
                      : "border-burgundy-100 bg-white hover:border-burgundy-300 dark:border-zinc-800 dark:bg-zinc-950"
                  }`}
                >
                  <p className="font-black">{student.fullName}</p>
                  <p className="mt-1 text-sm text-charcoal/55 dark:text-zinc-400">{active ? "Добавлен в игру" : "Нажми, чтобы добавить"}</p>
                </button>
              );
            })}
          </div>
          <Button type="button" disabled={!canStart} onClick={startKetka} className="mt-5 w-full">
            <Gamepad2 className="mr-2 h-4 w-4" />
            Start Ketka Classic
          </Button>
        </Panel>
      ) : null}

      {tab === "ketka" ? (
        players.length > 0 ? (
          <div className="overflow-hidden rounded-[2rem]">
            {winnerName ? (
              <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100">
                <p className="font-black">Победитель: {winnerName}. У него не осталось карточек.</p>
              </div>
            ) : null}
            <GameBoard
              players={players}
              currentPlayerTurn={currentPlayer?.playerId ?? ""}
              activeAnswererId={answerer?.playerId}
              currentCard={activeCard}
              localPlayerId={currentStudent?.id ?? "me"}
              onCardAnswered={resolveAnswer}
            />
          </div>
        ) : (
          <Panel title="Сначала выбери игроков" subtitle="Перейди в Choose players, добавь 1-3 соперников и запусти игру.">
            <Button type="button" onClick={() => setTab("lobby")}>Open lobby</Button>
          </Panel>
        )
      ) : null}

      {tab === "speed" ? (
        <Panel title="Speed Translation" subtitle="Быстро выбери правильный перевод. Можно играть как разминку перед Ketka Classic.">
          <SpeedGame deck={deck} index={speedIndex} setIndex={setSpeedIndex} score={speedScore} setScore={setSpeedScore} />
        </Panel>
      ) : null}

      {tab === "memory" ? (
        <Panel title="Memory Match" subtitle="Найди пары: английское слово и русский перевод.">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {memoryCards.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMemoryOpened((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current.slice(-1), item.id])}
                className="min-h-24 rounded-3xl border border-burgundy-100 bg-white p-4 text-lg font-black shadow-soft transition hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {memoryOpened.includes(item.id) ? item.label : "Ketka"}
              </button>
            ))}
          </div>
        </Panel>
      ) : null}

      {tab === "emoji" ? (
        <Panel title="Emoji Hint" subtitle="Смотри только emoji и подсказку, угадывай английское слово.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {deck.slice(0, 9).map((card) => (
              <div key={card.id} className="rounded-[2rem] border border-burgundy-100 bg-white p-5 text-center shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-5xl">{card.hintEmoji ?? "💡"}</p>
                <p className="mt-3 text-sm font-bold text-charcoal/60 dark:text-zinc-400">{card.hintText ?? "No hint"}</p>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-black text-burgundy-700 dark:text-burgundy-200">Show answer</summary>
                  <p className="mt-2 text-2xl font-black">{card.word}</p>
                </details>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function CardForm({ form, setForm, onAdd }: {
  form: { word: string; translation: string; hintText: string; hintEmoji: string };
  setForm: (next: { word: string; translation: string; hintText: string; hintEmoji: string }) => void;
  onAdd: () => void;
}) {
  return (
    <div className="grid gap-3">
      <TextInput label="English word" value={form.word} onChange={(word) => setForm({ ...form, word })} placeholder="car" />
      <TextInput label="Hint text" value={form.hintText} onChange={(hintText) => setForm({ ...form, hintText })} placeholder="fast / transport" />
      <TextInput label="Hint emoji" value={form.hintEmoji} onChange={(hintEmoji) => setForm({ ...form, hintEmoji })} placeholder="🚗" />
      <TextInput label="Back side translation" value={form.translation} onChange={(translation) => setForm({ ...form, translation })} placeholder="машина" />
      <Button type="button" onClick={onAdd} className="mt-1">
        <Plus className="mr-2 h-4 w-4" />
        Add to my deck
      </Button>
    </div>
  );
}

function SpeedGame({ deck, index, setIndex, score, setScore }: {
  deck: LearningCard[];
  index: number;
  setIndex: (next: number) => void;
  score: number;
  setScore: (next: number) => void;
}) {
  const card = deck[index % Math.max(deck.length, 1)] ?? fallbackDeck[0];
  const options = useMemo(() => shuffle([card.translation, ...shuffle(deck.filter((item) => item.id !== card.id)).slice(0, 3).map((item) => item.translation)]), [card, deck]);

  function choose(option: string) {
    if (option === card.translation) setScore(score + 1);
    setIndex((index + 1) % Math.max(deck.length, 1));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card card={card} compact />
      <div className="grid gap-3">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-charcoal/50 dark:text-zinc-500">Score: {score}</p>
        {options.map((option) => (
          <button key={option} type="button" onClick={() => choose(option)} className="rounded-3xl border border-burgundy-100 bg-white px-5 py-4 text-left text-xl font-black shadow-soft transition hover:-translate-y-1 hover:border-burgundy-300 dark:border-zinc-800 dark:bg-zinc-950">
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-burgundy-100 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
      <h2 className="text-2xl font-black text-charcoal dark:text-white">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-charcoal/60 dark:text-zinc-400">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-charcoal/45 dark:text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-burgundy-100 bg-burgundy-50/45 px-4 py-3 text-sm font-bold text-charcoal outline-none transition placeholder:text-charcoal/30 focus:border-burgundy-400 focus:ring-4 focus:ring-burgundy-200/45 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600"
      />
    </label>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-[0.1em] transition ${
        active
          ? "border-burgundy-700 bg-burgundy-700 text-white shadow-soft"
          : "border-burgundy-100 bg-white text-charcoal hover:border-burgundy-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}
