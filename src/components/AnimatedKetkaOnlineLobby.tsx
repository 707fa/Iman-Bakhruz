import { useState } from "react";

interface KetkaCard {
  word: string;
  hint?: string;
  translation: string;
}

interface Player {
  id: string;
  name: string;
  cards: KetkaCard[];
}

// MOCK: В реальной версии тут будет WebSocket или API
const mockPlayers: Player[] = [
  { id: "1", name: "Алиса", cards: [] },
  { id: "2", name: "Бекзод", cards: [] },
  { id: "3", name: "Саша", cards: [] },
];

export function AnimatedKetkaOnlineLobby() {
  const [myName, setMyName] = useState("");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [selected, setSelected] = useState<string[]>([]);

  function handleJoin() {
    if (myName.trim()) {
      setJoined(true);
      setPlayers([...players, { id: Date.now().toString(), name: myName.trim(), cards: [] }]);
    }
  }

  function handleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleStartGame() {
    // Здесь будет логика старта игры с выбранными игроками
    alert(`Игра начнётся с: ${selected.map(id => players.find(p => p.id === id)?.name).join(", ")}`);
  }

  if (!joined) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg text-black">
        <h2 className="text-xl font-bold mb-4">Войти в онлайн-лобби</h2>
        <input
          className="border rounded px-2 py-1 mr-2"
          placeholder="Ваше имя"
          value={myName}
          onChange={e => setMyName(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          onClick={handleJoin}
        >
          Войти
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg text-black">
      <h2 className="text-xl font-bold mb-4">Выберите соперников</h2>
      <div className="mb-4">
        <div className="font-semibold mb-1">Игроки онлайн:</div>
        <ul className="list-disc pl-5">
          {players.filter(p => p.name !== myName).map((p) => (
            <li key={p.id} className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => handleSelect(p.id)}
              />
              <span>{p.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <button
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        onClick={handleStartGame}
        disabled={selected.length === 0}
      >
        Начать игру
      </button>
    </div>
  );
}
