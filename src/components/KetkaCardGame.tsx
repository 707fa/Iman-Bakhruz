import { useState } from "react";

interface Card {
  word: string;
  hint?: string;
  translation: string;
}

const initialCards: Card[] = [
  { word: "apple", hint: "fruit 🍎", translation: "яблоко" },
  { word: "cat", hint: "animal 🐱", translation: "кот" },
  { word: "book", hint: "read 📖", translation: "книга" },
  { word: "sun", hint: "day ☀️", translation: "солнце" },
];

export function KetkaCardGame() {
  const [cards, setCards] = useState<Card[]>([...initialCards]);
  const current = 0;
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [message, setMessage] = useState("");

  if (cards.length === 0) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Игра окончена!</h2>
        <p>У вас осталось карточек: {myCards.length}</p>
        <p>{myCards.length === 0 ? "Вы победили!" : "Попробуйте ещё раз!"}</p>
      </div>
    );
  }

  const card = cards[current];

  function handleCheck() {
    if (answer.trim().toLowerCase() === card.translation.toLowerCase()) {
      setMessage("Верно! Карточка уходит.");
      setCards(cards.filter((_, i) => i !== current));
      setAnswer("");
      setRevealed(false);
      setTimeout(() => setMessage(""), 1000);
    } else {
      setMessage("Неверно! Карточка забирается.");
      setMyCards([...myCards, card]);
      setCards(cards.filter((_, i) => i !== current));
      setAnswer("");
      setRevealed(false);
      setTimeout(() => setMessage(""), 1000);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-6 p-4 bg-white rounded-xl shadow-lg">
      <div className="mb-4">
        <div className="text-lg font-bold">{card.word}</div>
        {card.hint && (
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <span>Подсказка:</span> <span>{card.hint}</span>
          </div>
        )}
      </div>
      <input
        className="w-full border rounded px-2 py-1 mb-2"
        placeholder="Введите перевод..."
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleCheck()}
        disabled={revealed}
      />
      <div className="flex gap-2 mb-2">
        <button
          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          onClick={handleCheck}
          disabled={revealed}
        >
          Проверить
        </button>
        <button
          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
          onClick={() => setRevealed(true)}
          disabled={revealed}
        >
          Показать перевод
        </button>
      </div>
      {revealed && (
        <div className="mb-2 p-2 bg-gray-100 rounded text-center font-semibold">
          Перевод: {card.translation}
        </div>
      )}
      {message && <div className="text-center text-sm font-bold text-blue-700">{message}</div>}
      <div className="mt-4 text-xs text-gray-500">Карточек осталось: {cards.length}</div>
      <div className="mt-1 text-xs text-gray-500">Ваши карточки: {myCards.length}</div>
    </div>
  );
}
