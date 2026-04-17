import { RotateCcw, Shuffle, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppStore } from "../hooks/useAppStore";
import { normalizeStudentLevelFromGroupTitle } from "../lib/studentLevel";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface KetkaCard {
  id: string;
  en: string;
  ru: string;
  uz: string;
}

const CARDS_BY_LEVEL: Record<string, KetkaCard[]> = {
  beginner: [
    { id: "b-1", en: "apple", ru: "яблоко", uz: "olma" },
    { id: "b-2", en: "book", ru: "книга", uz: "kitob" },
    { id: "b-3", en: "school", ru: "школа", uz: "maktab" },
    { id: "b-4", en: "friend", ru: "друг", uz: "do'st" },
    { id: "b-5", en: "family", ru: "семья", uz: "oila" },
    { id: "b-6", en: "water", ru: "вода", uz: "suv" },
    { id: "b-7", en: "city", ru: "город", uz: "shahar" },
    { id: "b-8", en: "teacher", ru: "учитель", uz: "o'qituvchi" },
    { id: "b-9", en: "student", ru: "ученик", uz: "o'quvchi" },
    { id: "b-10", en: "morning", ru: "утро", uz: "ertalab" },
    { id: "b-11", en: "evening", ru: "вечер", uz: "kechqurun" },
    { id: "b-12", en: "homework", ru: "домашнее задание", uz: "uy vazifasi" },
  ],
  elementary: [
    { id: "e-1", en: "improve", ru: "улучшать", uz: "yaxshilamoq" },
    { id: "e-2", en: "prepare", ru: "готовиться", uz: "tayyorlanmoq" },
    { id: "e-3", en: "discuss", ru: "обсуждать", uz: "muhokama qilmoq" },
    { id: "e-4", en: "answer", ru: "ответ", uz: "javob" },
    { id: "e-5", en: "question", ru: "вопрос", uz: "savol" },
    { id: "e-6", en: "practice", ru: "практика", uz: "mashq" },
    { id: "e-7", en: "progress", ru: "прогресс", uz: "o'sish" },
    { id: "e-8", en: "mistake", ru: "ошибка", uz: "xato" },
    { id: "e-9", en: "correct", ru: "исправлять", uz: "to'g'irlamoq" },
    { id: "e-10", en: "weekly", ru: "еженедельный", uz: "haftalik" },
    { id: "e-11", en: "schedule", ru: "расписание", uz: "jadval" },
    { id: "e-12", en: "result", ru: "результат", uz: "natija" },
  ],
  default: [
    { id: "d-1", en: "confidence", ru: "уверенность", uz: "ishonch" },
    { id: "d-2", en: "achievement", ru: "достижение", uz: "yutuq" },
    { id: "d-3", en: "discipline", ru: "дисциплина", uz: "intizom" },
    { id: "d-4", en: "motivation", ru: "мотивация", uz: "motivatsiya" },
    { id: "d-5", en: "consistency", ru: "постоянство", uz: "barqarorlik" },
    { id: "d-6", en: "responsibility", ru: "ответственность", uz: "mas'uliyat" },
    { id: "d-7", en: "opportunity", ru: "возможность", uz: "imkoniyat" },
    { id: "d-8", en: "challenge", ru: "вызов", uz: "sinov" },
    { id: "d-9", en: "solution", ru: "решение", uz: "yechim" },
    { id: "d-10", en: "strategy", ru: "стратегия", uz: "strategiya" },
    { id: "d-11", en: "presentation", ru: "презентация", uz: "taqdimot" },
    { id: "d-12", en: "feedback", ru: "обратная связь", uz: "fikr-mulohaza" },
  ],
};

function pickCardsForLevel(level: string): KetkaCard[] {
  if (level.includes("beginner")) return CARDS_BY_LEVEL.beginner;
  if (level.includes("elementary")) return CARDS_BY_LEVEL.elementary;
  return CARDS_BY_LEVEL.default;
}

function shuffleCards(list: KetkaCard[]): KetkaCard[] {
  return [...list].sort(() => Math.random() - 0.5);
}

export function KetkaFlashcardsGame() {
  const { currentStudent, state } = useAppStore();
  const level = useMemo(() => {
    const group = state.groups.find((item) => item.id === currentStudent?.groupId);
    return normalizeStudentLevelFromGroupTitle(group?.title);
  }, [state.groups, currentStudent?.groupId]);

  const [cards, setCards] = useState<KetkaCard[]>(() => shuffleCards(pickCardsForLevel(level)));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(() => new Set());

  const current = cards[index] ?? cards[0];
  const progress = cards.length > 0 ? Math.round((known.size / cards.length) * 100) : 0;

  function moveNext() {
    setFlipped(false);
    setIndex((prev) => (cards.length === 0 ? 0 : (prev + 1) % cards.length));
  }

  function markKnown() {
    if (!current) return;
    setKnown((prev) => new Set([...prev, current.id]));
    moveNext();
  }

  function markUnknown() {
    if (!current) return;
    setKnown((prev) => {
      const next = new Set(prev);
      next.delete(current.id);
      return next;
    });
    moveNext();
  }

  function restart() {
    setKnown(new Set());
    setIndex(0);
    setFlipped(false);
    setCards(shuffleCards(pickCardsForLevel(level)));
  }

  function reshuffle() {
    setCards((prev) => shuffleCards(prev));
    setIndex(0);
    setFlipped(false);
  }

  if (!current) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-charcoal/70 dark:text-zinc-300">No cards available.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="inline-flex items-center gap-2">
          <Trophy className="h-5 w-5 text-burgundy-700 dark:text-white" />
          Ketka Cards
        </CardTitle>
        <div className="inline-flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={reshuffle}>
            <Shuffle className="mr-1.5 h-3.5 w-3.5" />
            Shuffle
          </Button>
          <Button size="sm" variant="ghost" onClick={restart}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restart
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Level: {level.toUpperCase()} • Progress: {known.size}/{cards.length} ({progress}%)
        </div>

        <button
          type="button"
          onClick={() => setFlipped((prev) => !prev)}
          className="group relative block h-52 w-full rounded-3xl border border-burgundy-200 bg-white p-4 text-left shadow-soft transition hover:border-burgundy-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
        >
          <div className="relative h-full w-full [transform-style:preserve-3d] duration-500" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
            <div className="absolute inset-0 flex h-full w-full flex-col justify-between [backface-visibility:hidden]">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">Front</div>
              <p className="text-3xl font-bold text-burgundy-700 dark:text-white">{current.en}</p>
              <p className="text-xs text-charcoal/60 dark:text-zinc-400">Tap card to show translation</p>
            </div>

            <div
              className="absolute inset-0 flex h-full w-full flex-col justify-between [backface-visibility:hidden]"
              style={{ transform: "rotateY(180deg)" }}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">Back</div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-charcoal dark:text-zinc-100">{current.ru}</p>
                <p className="text-xl font-semibold text-burgundy-700 dark:text-white">{current.uz}</p>
              </div>
              <p className="text-xs text-charcoal/60 dark:text-zinc-400">Tap again to flip back</p>
            </div>
          </div>
        </button>

        <div className="grid gap-3 sm:grid-cols-3">
          <Button onClick={markKnown} className="h-11">
            I know this
          </Button>
          <Button variant="secondary" onClick={markUnknown} className="h-11">
            Need practice
          </Button>
          <Button variant="secondary" onClick={moveNext} className="h-11">
            Next card
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
