import { useState } from "react";

interface KetkaCard {
  word: string;
  hint?: string;
  translation: string;
}

interface AnimatedKetkaCardProps {
  card: KetkaCard;
  onCorrect: () => void;
  onWrong: () => void;
}

export function AnimatedKetkaCard({ card, onCorrect, onWrong }: AnimatedKetkaCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<null | "correct" | "wrong">(null);

  function handleCheck() {
    if (input.trim().toLowerCase() === card.translation.toLowerCase()) {
      setStatus("correct");
      setTimeout(() => {
        setStatus(null);
        setInput("");
        setFlipped(false);
        onCorrect();
      }, 900);
    } else {
      setStatus("wrong");
      setTimeout(() => {
        setStatus(null);
        setInput("");
        setFlipped(false);
        onWrong();
      }, 900);
    }
  }

  return (
    <div className="relative w-72 h-44 mx-auto my-8 perspective">
      <div
        className={`absolute w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${flipped ? "rotate-y-180" : ""}`}
      >
        {/* Front */}
        <div className="absolute w-full h-full bg-white rounded-2xl shadow-2xl border-2 border-burgundy-700 flex flex-col justify-center items-center [backface-visibility:hidden]">
          <div className="text-2xl font-bold mb-2">{card.word}</div>
          {card.hint && (
            <div className="text-lg text-gray-600 flex items-center gap-2 mb-2">
              <span>Подсказка:</span> <span>{card.hint}</span>
            </div>
          )}
          <input
            className="w-48 border rounded px-2 py-1 mb-2 text-center"
            placeholder="Введите перевод..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCheck()}
            disabled={status !== null}
          />
          <div className="flex gap-2">
            <button
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              onClick={handleCheck}
              disabled={status !== null}
            >
              Проверить
            </button>
            <button
              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
              onClick={() => setFlipped(true)}
              disabled={flipped}
            >
              Показать перевод
            </button>
          </div>
          {status === "correct" && <div className="mt-2 text-green-700 font-bold">Верно!</div>}
          {status === "wrong" && <div className="mt-2 text-red-700 font-bold">Неверно!</div>}
        </div>
        {/* Back */}
        <div className="absolute w-full h-full bg-burgundy-700 text-white rounded-2xl shadow-2xl border-2 border-burgundy-700 flex flex-col justify-center items-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <div className="text-lg mb-2">Перевод:</div>
          <div className="text-2xl font-bold mb-4">{card.translation}</div>
          <button
            className="bg-white text-burgundy-700 px-3 py-1 rounded hover:bg-gray-200"
            onClick={() => setFlipped(false)}
          >
            Назад
          </button>
        </div>
      </div>
    </div>
  );
}

