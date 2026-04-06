import { RefreshCw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface FlashcardItem {
  id: string;
  question: string;
  options: string[];
  correct: string;
}

const cards: FlashcardItem[] = [
  {
    id: "f1",
    question: "Choose correct form: She ___ to school every day.",
    options: ["go", "goes", "went", "going"],
    correct: "goes",
  },
  {
    id: "f2",
    question: "Past Simple of 'teach' is:",
    options: ["teached", "tought", "taught", "teach"],
    correct: "taught",
  },
  {
    id: "f3",
    question: "Complete: If I ___ time, I will help you.",
    options: ["have", "had", "has", "having"],
    correct: "have",
  },
  {
    id: "f4",
    question: "Choose article: ___ honest person.",
    options: ["a", "an", "the", "-"],
    correct: "an",
  },
];

function nextIndex(current: number): number {
  return (current + 1) % cards.length;
}

export function FlashcardsGame() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const card = cards[index];
  const isCorrect = selected !== null && selected === card.correct;

  const shuffledOptions = useMemo(() => {
    return [...card.options].sort((a, b) => a.localeCompare(b));
  }, [card.id]);

  function handleSelect(option: string) {
    if (selected) return;
    setSelected(option);
    if (option === card.correct) {
      setScore((prev) => prev + 1);
    }
  }

  function handleNext() {
    setIndex((prev) => nextIndex(prev));
    setSelected(null);
  }

  function handleReset() {
    setIndex(0);
    setSelected(null);
    setScore(0);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="inline-flex items-center gap-2">
          <Trophy className="h-5 w-5 text-burgundy-700 dark:text-burgundy-300" />
          Flashcard Game
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Reset
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-charcoal/70 dark:text-zinc-300">
          Score: <span className="font-semibold text-burgundy-700 dark:text-burgundy-300">{score}</span> / {cards.length}
        </p>

        <div className="rounded-2xl border border-burgundy-100 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-medium text-charcoal dark:text-zinc-100">{card.question}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {shuffledOptions.map((option) => {
            const isSelected = selected === option;
            const isRightAnswer = option === card.correct;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={[
                  "rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
                  "border-burgundy-100 bg-white hover:bg-burgundy-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                  isSelected && isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300" : "",
                  isSelected && !isCorrect ? "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/35 dark:text-rose-300" : "",
                  selected && isRightAnswer ? "border-emerald-300 dark:border-emerald-800" : "",
                ].join(" ")}
              >
                {option}
              </button>
            );
          })}
        </div>

        <Button onClick={handleNext} className="w-full">
          Next question
        </Button>
      </CardContent>
    </Card>
  );
}
