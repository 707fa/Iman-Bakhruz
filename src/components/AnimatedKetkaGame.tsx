import { useState } from "react";
import { AnimatedKetkaCard } from "./AnimatedKetkaCard";

interface KetkaCard {
  word: string;
  hint?: string;
  translation: string;
}

// Пример: слова и подсказки задаёт учитель
const initialCards: KetkaCard[] = [
  { word: "car", hint: "fast 🚗", translation: "машина" },
  { word: "apple", hint: "fruit 🍎", translation: "яблоко" },
  { word: "cat", hint: "animal 🐱", translation: "кот" },
  { word: "book", hint: "read 📖", translation: "книга" },
  { word: "sun", hint: "day ☀️", translation: "солнце" },
];

export function AnimatedKetkaGame() {
  const [cards, setCards] = useState<KetkaCard[]>([...initialCards]);
  const [current, setCurrent] = useState(0);
  const [myCards, setMyCards] = useState<KetkaCard[]>([]);
  const [finished, setFinished] = useState(false);

  function handleCorrect() {
    const newCards = cards.filter((_, i) => i !== current);
    if (newCards.length === 0) {
      setFinished(true);
      return;
    }
    setCards(newCards);
    setCurrent(0);
  }

  function handleWrong() {
    setMyCards([...myCards, cards[current]]);
    const newCards = cards.filter((_, i) => i !== current);
    if (newCards.length === 0) {
      setFinished(true);
      return;
    }
    setCards(newCards);
    setCurrent(0);
  }

  if (finished) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Игра окончена!</h2>
        <p>У вас осталось карточек: {myCards.length}</p>
        <p>{myCards.length === 0 ? "Вы победили!" : "Попробуйте ещё раз!"}</p>
      </div>
    );
  }

  return (
    <div>
      <AnimatedKetkaCard
        card={cards[current]}
        onCorrect={handleCorrect}
        onWrong={handleWrong}
      />
      <div className="mt-4 text-xs text-gray-500 text-center">Карточек осталось: {cards.length}</div>
      <div className="mt-1 text-xs text-gray-500 text-center">Ваши карточки: {myCards.length}</div>
    </div>
  );
}
