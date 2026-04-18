import { useState } from "react";

const cards = [
  { word: "banana", hint: "🍌", translation: "банан" },
  { word: "train", hint: "🚆", translation: "поезд" },
  { word: "star", hint: "⭐", translation: "звезда" },
  { word: "milk", hint: "🥛", translation: "молоко" },
];

export function EmojiHintGame() {
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [score, setScore] = useState(0);

  function handleCheck() {
    if (input.trim().toLowerCase() === cards[current].translation.toLowerCase()) {
      setResult("Верно!");
      setScore(score + 1);
    } else {
      setResult(`Неверно! Перевод: ${cards[current].translation}`);
    }
    setTimeout(() => {
      setResult("");
      setInput("");
      setCurrent((prev) => (prev + 1) % cards.length);
    }, 1200);
  }

  return (
    <div className="max-w-sm mx-auto mt-6 p-4 bg-white rounded-xl shadow-lg">
      <div className="mb-4 text-lg font-bold">Угадай по эмодзи</div>
      <div className="mb-2 text-2xl">{cards[current].hint}</div>
      <div className="mb-2">{cards[current].word}</div>
      <input
        className="w-full border rounded px-2 py-1 mb-2"
        placeholder="Введите перевод..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleCheck()}
      />
      <button
        className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 w-full"
        onClick={handleCheck}
      >
        Проверить
      </button>
      {result && <div className="mt-2 text-center font-semibold text-purple-700">{result}</div>}
      <div className="mt-4 text-xs text-gray-500">Счёт: {score}</div>
    </div>
  );
}
