import { useState } from "react";

interface KetkaCard {
  word: string;
  hint?: string;
  translation: string;
}

interface Player {
  name: string;
  cards: KetkaCard[];
}

export function AnimatedKetkaLobby() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [step, setStep] = useState<"lobby" | "cards">("lobby");
  const [myCards, setMyCards] = useState<KetkaCard[]>([]);
  const [word, setWord] = useState("");
  const [hint, setHint] = useState("");
  const [translation, setTranslation] = useState("");

  function handleAddPlayer() {
    if (playerName.trim()) {
      setPlayers([...players, { name: playerName.trim(), cards: [] }]);
      setPlayerName("");
    }
  }

  function handleStart() {
    setStep("cards");
  }

  function handleAddCard() {
    if (word && translation) {
      setMyCards([...myCards, { word, hint, translation }]);
      setWord("");
      setHint("");
      setTranslation("");
    }
  }

  if (step === "lobby") {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg text-black">
        <h2 className="text-xl font-bold mb-4">Лобби Кетка</h2>
        <div className="mb-4">
          <input
            className="border rounded px-2 py-1 mr-2"
            placeholder="Имя игрока"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            onClick={handleAddPlayer}
          >
            Добавить
          </button>
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-1">Игроки:</div>
          <ul className="list-disc pl-5">
            {players.map((p, i) => (
              <li key={i}>{p.name}</li>
            ))}
          </ul>
        </div>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={handleStart}
          disabled={players.length < 2}
        >
          Начать (минимум 2 игрока)
        </button>
      </div>
    );
  }

  // Шаг: ввод карточек учеником
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg text-black">
    <h2 className="text-xl font-bold mb-4">Добавьте свои карточки</h2>
      <div className="mb-4">
        <input
          className="border rounded px-2 py-1 mb-2 w-full"
          placeholder="Слово (англ.)"
          value={word}
          onChange={e => setWord(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 mb-2 w-full"
          placeholder="Подсказка (эмодзи или текст)"
          value={hint}
          onChange={e => setHint(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 mb-2 w-full"
          placeholder="Перевод (рус.)"
          value={translation}
          onChange={e => setTranslation(e.target.value)}
        />
        <button
          className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
          onClick={handleAddCard}
        >
          Добавить карточку
        </button>
      </div>
      <div>
        <div className="font-semibold mb-1">Ваши карточки:</div>
        <ul className="list-disc pl-5">
          {myCards.map((c, i) => (
            <li key={i}>
              <span className="font-bold">{c.word}</span> — <span>{c.hint}</span> — <span>{c.translation}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 text-xs text-gray-500">Передайте устройство следующему игроку для ввода своих карточек.</div>
    </div>
  );
}
