import { useState } from "react";

const words = [
  { word: "dog", translation: "собака" },
  { word: "car", translation: "машина" },
  { word: "tree", translation: "дерево" },
  { word: "river", translation: "река" },
];

export function AiGuessGame() {
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [score, setScore] = useState(0);

  function handleCheck() {
    if (input.trim().toLowerCase() === words[current].translation.toLowerCase()) {
      setResult("Верно!");
      setScore(score + 1);
    } else {
      setResult(`Неверно! Перевод: ${words[current].translation}`);
    }
    setTimeout(() => {
      setResult("");
      setInput("");
      setCurrent((prev) => (prev + 1) % words.length);
    }, 1200);
  }

  return (
    <div className="max-w-sm mx-auto mt-6 p-4 bg-white rounded-xl shadow-lg">
      <div className="mb-4 text-lg font-bold">AI угадай слово</div>
      <div className="mb-2">{words[current].word}</div>
      <input
        className="w-full border rounded px-2 py-1 mb-2"
        placeholder="Введите перевод..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleCheck()}
      />
      <button
        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 w-full"
        onClick={handleCheck}
      >
        Проверить
      </button>
      {result && <div className="mt-2 text-center font-semibold text-blue-700">{result}</div>}
      <div className="mt-4 text-xs text-gray-500">Счёт: {score}</div>
    </div>
  );
}
