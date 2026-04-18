import { useEffect, useState } from "react";

const words = [
  { word: "apple", translation: "яблоко" },
  { word: "elephant", translation: "слон" },
  { word: "guitar", translation: "гитара" },
  { word: "mountain", translation: "гора" },
  { word: "butterfly", translation: "бабочка" },
];

export function SpeedMatchGame() {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [result, setResult] = useState("");

  useEffect(() => {
    const correct = words[current].translation;
    const wrong = words
      .filter((_, i) => i !== current)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map(w => w.translation);
    setOptions([correct, ...wrong].sort(() => Math.random() - 0.5));
  }, [current]);

  function handleCheck(selected: string) {
    if (selected === words[current].translation) {
      setResult("Верно! ✓");
      setScore(score + 1);
    } else {
      setResult("Неверно! ✗");
    }
    setTimeout(() => {
      setResult("");
      setCurrent((prev) => (prev + 1) % words.length);
    }, 800);
  }

  return (
    <div className="max-w-sm mx-auto mt-6 p-4 bg-white rounded-xl shadow-lg text-black">
      <div className="mb-4 text-lg font-bold">Speed Match</div>
      <div className="mb-4 text-2xl font-bold text-blue-600">{words[current].word}</div>
      <div className="grid grid-cols-1 gap-2 mb-4">
        {options.map((opt, i) => (
          <button
            key={i}
            className="bg-gray-200 hover:bg-blue-300 px-3 py-2 rounded"
            onClick={() => handleCheck(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {result && <div className="text-center font-bold text-blue-700">{result}</div>}
      <div className="mt-4 text-xs text-gray-500">Счёт: {score}</div>
    </div>
  );
}
