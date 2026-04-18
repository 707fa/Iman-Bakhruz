import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { GameBoard, type CardGamePlayer } from "./GameBoard";
import type { LearningCard } from "./Card";
import { useSocket } from "../hooks/useSocket";

interface RoomState {
  roomId?: string;
  players: CardGamePlayer[];
  gameStarted: boolean;
  currentPlayerId?: string;
  activeAnswererId?: string;
  currentCard?: LearningCard | null;
  winnerId?: string;
  winnerName?: string;
}

type LobbyStep = "lobby" | "room" | "deck" | "playing";
type RoomPayload = Omit<Partial<RoomState>, "players"> & { players?: unknown[] };

const starterCards: LearningCard[] = [
  { id: "starter-1", word: "curious", translation: "любопытный", hintText: "Wants to know more", hintEmoji: "🔎" },
  { id: "starter-2", word: "brave", translation: "смелый", hintText: "Not afraid", hintEmoji: "🛡️" },
  { id: "starter-3", word: "journey", translation: "путешествие", hintText: "A long trip", hintEmoji: "🧭" },
];

function normalizePlayer(raw: unknown): CardGamePlayer {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cards = Array.isArray(source.cards) ? (source.cards as LearningCard[]) : [];
  return {
    playerId: String(source.playerId ?? source.id ?? ""),
    playerName: String(source.playerName ?? source.name ?? "Player"),
    cards,
    deckSize: Number(source.deckSize ?? cards.length),
    score: Number(source.score ?? 0),
    isConnected: source.isConnected !== false,
  };
}

export function MultiplayerKetka() {
  const socket = useSocket();
  const [step, setStep] = useState<LobbyStep>("lobby");
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [localPlayerId, setLocalPlayerId] = useState("");
  const [myDeck, setMyDeck] = useState<LearningCard[]>(starterCards);
  const [roomState, setRoomState] = useState<RoomState>({
    players: [],
    gameStarted: false,
    currentCard: null,
  });

  const currentRoomId = roomState.roomId ?? roomId;
  const canStartGame = roomState.players.length >= 2 && roomState.players.length <= 4 && roomState.players.every((player) => (player.deckSize ?? 0) > 0);

  useEffect(() => {
    if (!socket) return;

    function syncRoom(payload: RoomPayload) {
      setRoomState((current) => ({
        ...current,
        ...payload,
        players: payload.players ? payload.players.map(normalizePlayer) : current.players,
      }));
    }

    socket.on("ROOM_STATE", syncRoom);
    socket.on("PLAYERS_UPDATED", syncRoom);
    socket.on("SYNC_DECKS", syncRoom);
    socket.on("GAME_STARTED", (payload: Partial<RoomState>) => {
      syncRoom(payload);
      setStep("playing");
    });
    socket.on("GAME_STATE_UPDATED", syncRoom);
    socket.on("TURN_CHANGED", syncRoom);
    socket.on("CARD_TRANSFERRED", syncRoom);
    socket.on("PLAYER_WON", (payload: Partial<RoomState>) => {
      syncRoom({ ...payload, gameStarted: false });
      setStep("room");
    });

    return () => {
      socket.off("ROOM_STATE", syncRoom);
      socket.off("PLAYERS_UPDATED", syncRoom);
      socket.off("SYNC_DECKS", syncRoom);
      socket.off("GAME_STARTED");
      socket.off("GAME_STATE_UPDATED", syncRoom);
      socket.off("TURN_CHANGED", syncRoom);
      socket.off("CARD_TRANSFERRED", syncRoom);
      socket.off("PLAYER_WON");
    };
  }, [socket]);

  const connectionLabel = useMemo(() => (socket ? "Connected" : "Connecting..."), [socket]);

  function createRoom() {
    if (!socket || !playerName.trim()) return;
    socket.emit("CREATE_ROOM", { playerName: playerName.trim(), maxPlayers: 4 }, (response: { ok: boolean; room?: RoomState; playerId?: string; error?: string }) => {
      if (!response.ok || !response.room) {
        window.alert(response.error ?? "Could not create room");
        return;
      }

      setLocalPlayerId(response.playerId ?? "");
      setRoomId(response.room.roomId ?? "");
      setRoomState({
        ...response.room,
        players: response.room.players.map(normalizePlayer),
      });
      setStep("deck");
    });
  }

  function joinRoom() {
    if (!socket || !roomId.trim() || !playerName.trim()) return;
    socket.emit("JOIN_ROOM", { roomId: roomId.trim(), playerName: playerName.trim() }, (response: { ok: boolean; room?: RoomState; playerId?: string; error?: string }) => {
      if (!response.ok || !response.room) {
        window.alert(response.error ?? "Could not join room");
        return;
      }

      setLocalPlayerId(response.playerId ?? "");
      setRoomState({
        ...response.room,
        players: response.room.players.map(normalizePlayer),
      });
      setStep("deck");
    });
  }

  function syncDeck() {
    if (!socket || !currentRoomId) return;
    socket.emit("SYNC_DECKS", { roomId: currentRoomId, cards: myDeck }, (response: { ok: boolean; room?: RoomState; error?: string }) => {
      if (!response.ok || !response.room) {
        window.alert(response.error ?? "Could not sync deck");
        return;
      }

      setRoomState({
        ...response.room,
        players: response.room.players.map(normalizePlayer),
      });
      setStep("room");
    });
  }

  function startGame() {
    if (!socket || !currentRoomId) return;
    socket.emit("START_GAME", { roomId: currentRoomId }, (response: { ok: boolean; error?: string }) => {
      if (!response.ok) {
        window.alert(response.error ?? "Could not start game");
      }
    });
  }

  function submitAnswer(cardId: string, correct: boolean) {
    if (!socket || !currentRoomId) return;
    socket.emit("SUBMIT_ANSWER", { roomId: currentRoomId, cardId, correct }, (response: { ok: boolean; error?: string }) => {
      if (!response.ok) {
        window.alert(response.error ?? "Could not submit answer");
      }
    });
  }

  if (step === "playing" && roomState.gameStarted) {
    return (
      <GameBoard
        players={roomState.players}
        currentPlayerTurn={roomState.currentPlayerId ?? ""}
        activeAnswererId={roomState.activeAnswererId}
        currentCard={roomState.currentCard}
        localPlayerId={localPlayerId}
        onCardAnswered={submitAnswer}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(128,0,32,0.34),transparent_32%),linear-gradient(135deg,#07070a,#12121a_48%,#050507)] px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_28px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">Real-time English cards</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">Multiplayer Ketka</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold text-white/62">
                2-4 players create homework decks, show cards to each other, and race to reach zero cards.
              </p>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white/70">
              {connectionLabel}
            </span>
          </div>
        </div>

        {step === "lobby" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Create room" subtitle="Start a fresh 2-4 player session.">
              <TextInput label="Your name" value={playerName} onChange={setPlayerName} placeholder="Bekhruz" />
              <button type="button" onClick={createRoom} className="mt-4 w-full rounded-2xl bg-burgundy-700 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-burgundy-950/35 transition hover:bg-burgundy-600 disabled:opacity-45" disabled={!socket || !playerName.trim()}>
                Create room
              </button>
            </Panel>

            <Panel title="Join room" subtitle="Enter a room code from your classmate.">
              <TextInput label="Your name" value={playerName} onChange={setPlayerName} placeholder="Aisha" />
              <TextInput label="Room code" value={roomId} onChange={setRoomId} placeholder="AB12CD" />
              <button type="button" onClick={joinRoom} className="mt-4 w-full rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/15 disabled:opacity-45" disabled={!socket || !playerName.trim() || !roomId.trim()}>
                Join room
              </button>
            </Panel>
          </div>
        ) : null}

        {step === "deck" ? (
          <Panel title="Create your homework deck" subtitle={`Room ${currentRoomId}. Add at least one card before syncing.`}>
            <AddCardForm onAdd={(card) => setMyDeck((current) => [{ ...card, id: crypto.randomUUID?.() ?? `${Date.now()}` }, ...current])} />
            <CardList cards={myDeck} onRemove={(cardId) => setMyDeck((current) => current.filter((card) => card.id !== cardId))} />
            <button type="button" onClick={syncDeck} disabled={myDeck.length === 0} className="mt-4 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-emerald-950/35 transition hover:bg-emerald-500 disabled:opacity-45">
              Sync deck and enter room
            </button>
          </Panel>
        ) : null}

        {step === "room" ? (
          <Panel title={`Room ${currentRoomId}`} subtitle="Wait until every player has synced a deck, then start.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {roomState.players.map((player) => (
                <div key={player.playerId} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                  <p className="font-black">{player.playerName}</p>
                  <p className="mt-2 text-sm font-semibold text-white/55">{player.deckSize ?? player.cards.length} cards ready</p>
                </div>
              ))}
            </div>
            {roomState.winnerName ? <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">Winner: {roomState.winnerName}</p> : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setStep("deck")} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/15">
                Update my deck
              </button>
              <button type="button" onClick={startGame} disabled={!canStartGame} className="rounded-2xl bg-burgundy-700 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-burgundy-950/35 transition hover:bg-burgundy-600 disabled:opacity-45">
                Start game
              </button>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-6">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-white/55">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-burgundy-300/55 focus:ring-4 focus:ring-burgundy-700/20"
      />
    </label>
  );
}

function AddCardForm({ onAdd }: { onAdd: (card: Omit<LearningCard, "id">) => void }) {
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [hintText, setHintText] = useState("");
  const [hintEmoji, setHintEmoji] = useState("");

  function addCard() {
    if (!word.trim() || !translation.trim()) return;
    onAdd({
      word: word.trim(),
      translation: translation.trim(),
      hintText: hintText.trim() || undefined,
      hintEmoji: hintEmoji.trim() || undefined,
    });
    setWord("");
    setTranslation("");
    setHintText("");
    setHintEmoji("");
  }

  return (
    <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
      <TextInput label="English word" value={word} onChange={setWord} placeholder="resilient" />
      <TextInput label="Russian translation" value={translation} onChange={setTranslation} placeholder="стойкий" />
      <TextInput label="Hint text" value={hintText} onChange={setHintText} placeholder="Does not give up" />
      <TextInput label="Hint emoji" value={hintEmoji} onChange={setHintEmoji} placeholder="💪" />
      <button type="button" onClick={addCard} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/15 sm:col-span-2">
        Add card
      </button>
    </div>
  );
}

function CardList({ cards, onRemove }: { cards: LearningCard[]; onRemove: (cardId: string) => void }) {
  return (
    <div className="mt-4 grid gap-2">
      {cards.map((card) => (
        <div key={card.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
          <div>
            <p className="font-black">{card.word}</p>
            <p className="text-sm font-semibold text-white/55">
              {card.translation}
              {card.hintEmoji ? ` ${card.hintEmoji}` : ""}
            </p>
          </div>
          <button type="button" onClick={() => onRemove(card.id)} className="rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-100 hover:bg-red-500/20">
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
