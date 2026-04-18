import { useState } from "react";
import { AnimatedKetkaGame } from "../components/AnimatedKetkaGame";
import { MultiplayerKetka } from "../components/MultiplayerKetka";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";

export function StudentGamesPage() {
  const [gameMode, setGameMode] = useState<"single" | "multiplayer">("single");

  if (gameMode === "multiplayer") {
    return <MultiplayerKetka />;
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Ketka Game"
        subtitle="Flip cards, learn words, and train daily vocabulary for your level."
        action={<Badge variant="soft">Student</Badge>}
      />

      <div className="flex gap-4 justify-center mb-6">
        <button
          onClick={() => setGameMode("single")}
          className="px-6 py-2 bg-burgundy-700 text-white rounded-lg font-semibold hover:bg-burgundy-800"
        >
          Single Player
        </button>
        <button
          onClick={() => setGameMode("multiplayer")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          Multiplayer (Online)
        </button>
      </div>

      <AnimatedKetkaGame />
    </div>
  );
}
