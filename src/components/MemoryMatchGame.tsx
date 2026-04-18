import { useState } from "react";

interface Pair {
  id: string;
  word: string;
  translation: string;
}

const pairs: Pair[] = [
  { id: "1", word: "dog", translation: "собака" },
  { id: "2", word: "cat", translation: "кот" },
  { id: "3", word: "tree", translation: "дерево" },
  { id: "4", word: "book", translation: "книга" },
];

export function MemoryMatchGame() {
  const [cards, setCards] = useState<Array<{ id: string; type: "word" | "translation"; content: string; matched: boolean }>>([
    ...pairs.map(p => ({ id: p.id + "-w", type: "word" as const, content: p.word, matched: false })),
    ...pairs.map(p => ({ id: p.id + "-t", type: "translation" as const, content: p.translation, matched: false })),
  ].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matches, setMatches] = useState(0);

  function handleFlip(id: string) {
    if (flipped.length >= 2 || flipped.includes(id)) return;
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [id1, id2] = newFlipped;
      const card1 = cards.find(c => c.id === id1)!;
      const card2 = cards.find(c => c.id === id2)!;
      const pairId1 = card1.id.split("-")[0];
      const pairId2 = card2.id.split("-")[0];

      if (pairId1 === pairId2) {
        setCards(cards.map(c => c.id === id1 || c.id === id2 ? { ...c, matched: true } : c));
        setMatches(matches + 1);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-6 p-4 bg-white rounded-xl shadow-lg text-black">
      <div className="mb-4 text-lg font-bold">Memory Match</div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {cards.map(card => (
          <button
            key={card.id}
            className={`h-16 rounded font-semibold text-sm transition-all ${
              flipped.includes(card.id) || card.matched
                ? "bg-green-500 text-white"
                : "bg-gray-400 hover:bg-gray-500 text-transparent"
            }`}
            onClick={() => handleFlip(card.id)}
            disabled={card.matched}
          >
            {card.content}
          </button>
        ))}
      </div>
      <div className="mt-4 text-xs text-gray-500">Найдено пар: {matches}/{pairs.length}</div>
    </div>
  );
}
