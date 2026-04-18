import { useState } from "react";

const questions = [
  {
    word: "apple",
    options: ["яблоко", "апельсин", "банан", "груша"],
    correct: "яблоко",
  },
  {
    word: "cat",
    options: ["кот", "собака", "птица", "рыба"],
    correct: "кот",
  },
  {
    word: "blue",
    options: ["красный", "синий", "жёлтый", "зелёный"],
    correct: "синий",
  },
  {
    word: "mountain",
    options: ["гора", "река", "озеро", "лес"],
    correct: "гора",
  },
];

export function QuizGame() {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState("");

  function handleAnswer(answer: string) {
    if (answer === questions[current].correct) {
      setResult("Верно!");
      setScore(score + 1);
    } else {
      setResult(`Неверно! Правильный ответ: ${questions[current].correct}`);
    }
    setTimeout(() => {
      setResult("");
      setCurrent((prev) => (prev + 1) % questions.length);
    }, 1200);
  }

  const q = questions[current];

  return (
    <div className="max-w-sm mx-auto mt-6 p-4 bg-white rounded-xl shadow-lg text-black">
      <div className="mb-4 text-lg font-bold">Quiz</div>
      <div className="mb-4 text-2xl font-bold text-red-600">{q.word}</div>
      <div className="grid grid-cols-1 gap-2 mb-4">
        {q.options.map((opt, i) => (
          <button
            key={i}
            className="bg-gray-200 hover:bg-red-300 px-3 py-2 rounded"
            onClick={() => handleAnswer(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {result && <div className="text-center font-bold text-red-700">{result}</div>}
      <div className="mt-4 text-xs text-gray-500">Счёт: {score}/{questions.length}</div>
    </div>
  );
}
