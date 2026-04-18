import type { Server, Socket } from "socket.io";

/**
 * Database schema pseudo-code:
 *
 * user_cards {
 *   id: string;
 *   user_id: string;
 *   word: string;
 *   translation: string;
 *   hint_text?: string;
 *   hint_emoji?: string;
 *   created_at: Date;
 *   updated_at: Date;
 * }
 */

export interface HomeworkCard {
  id: string;
  word: string;
  translation: string;
  hintText?: string;
  hintEmoji?: string;
}

interface GamePlayer {
  playerId: string;
  playerName: string;
  socketId: string;
  cards: HomeworkCard[];
  score: number;
  isConnected: boolean;
}

interface GameRoom {
  roomId: string;
  players: GamePlayer[];
  maxPlayers: number;
  gameStarted: boolean;
  currentPlayerIndex: number;
}

interface JoinRoomPayload {
  roomId?: string;
  playerName: string;
  maxPlayers?: number;
}

interface SyncDecksPayload {
  roomId: string;
  cards: HomeworkCard[];
}

interface SubmitAnswerPayload {
  roomId: string;
  cardId: string;
  correct: boolean;
}

const rooms = new Map<string, GameRoom>();

export function registerCardGameSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    socket.on("CREATE_ROOM", (payload: JoinRoomPayload, reply: Ack) => {
      const playerName = normalizeName(payload.playerName);
      if (!playerName) return reply?.({ ok: false, error: "Player name is required." });

      const room: GameRoom = {
        roomId: createRoomCode(),
        players: [],
        maxPlayers: clampMaxPlayers(payload.maxPlayers),
        gameStarted: false,
        currentPlayerIndex: 0,
      };

      const player = createPlayer(socket, playerName);
      room.players.push(player);
      rooms.set(room.roomId, room);
      socket.join(room.roomId);

      reply?.({ ok: true, playerId: player.playerId, room: serializeRoom(room) });
      emitRoomState(io, room);
    });

    socket.on("JOIN_ROOM", (payload: JoinRoomPayload, reply: Ack) => {
      const roomId = String(payload.roomId ?? "").trim().toUpperCase();
      const playerName = normalizeName(payload.playerName);
      const room = rooms.get(roomId);

      if (!room) return reply?.({ ok: false, error: "Room not found." });
      if (!playerName) return reply?.({ ok: false, error: "Player name is required." });
      if (room.players.length >= room.maxPlayers) return reply?.({ ok: false, error: "Room is full." });
      if (room.gameStarted) return reply?.({ ok: false, error: "Game already started." });

      const player = createPlayer(socket, playerName);
      room.players.push(player);
      socket.join(room.roomId);

      reply?.({ ok: true, playerId: player.playerId, room: serializeRoom(room) });
      emitRoomState(io, room);
    });

    socket.on("SYNC_DECKS", (payload: SyncDecksPayload, reply: Ack) => {
      const room = rooms.get(payload.roomId);
      if (!room) return reply?.({ ok: false, error: "Room not found." });

      const player = findPlayerBySocket(room, socket);
      if (!player) return reply?.({ ok: false, error: "Player not found in this room." });
      if (room.gameStarted) return reply?.({ ok: false, error: "Decks cannot be changed after the game starts." });

      player.cards = normalizeCards(payload.cards);

      reply?.({ ok: true, room: serializeRoom(room) });
      io.to(room.roomId).emit("SYNC_DECKS", serializeRoom(room));
      emitRoomState(io, room);
    });

    socket.on("START_GAME", (payload: { roomId: string }, reply: Ack) => {
      const room = rooms.get(payload.roomId);
      if (!room) return reply?.({ ok: false, error: "Room not found." });
      if (room.players.length < 2) return reply?.({ ok: false, error: "At least 2 players are required." });
      if (room.players.length > 4) return reply?.({ ok: false, error: "A room supports up to 4 players." });
      if (room.players.some((player) => player.cards.length === 0)) {
        return reply?.({ ok: false, error: "Every player must sync at least one card." });
      }

      room.gameStarted = true;
      room.currentPlayerIndex = findNextPlayerIndex(room, -1);

      reply?.({ ok: true });
      io.to(room.roomId).emit("GAME_STARTED", serializeRoom(room));
    });

    socket.on("SUBMIT_ANSWER", (payload: SubmitAnswerPayload, reply: Ack) => {
      const room = rooms.get(payload.roomId);
      if (!room) return reply?.({ ok: false, error: "Room not found." });
      if (!room.gameStarted) return reply?.({ ok: false, error: "Game has not started." });

      const presenter = room.players[room.currentPlayerIndex];
      const answerer = getAnswerer(room);
      if (!presenter || !answerer) return reply?.({ ok: false, error: "Round is not ready." });

      const cardIndex = presenter.cards.findIndex((card) => card.id === payload.cardId);
      if (cardIndex === -1) return reply?.({ ok: false, error: "Card is no longer in the presenter deck." });

      const [card] = presenter.cards.splice(cardIndex, 1);

      if (payload.correct) {
        presenter.score += 1;
      } else {
        answerer.cards.push(card);
        io.to(room.roomId).emit("CARD_TRANSFERRED", {
          ...serializeRoom(room),
          transferredCardId: card.id,
          fromPlayerId: presenter.playerId,
          toPlayerId: answerer.playerId,
        });
      }

      const winner = room.players.find((player) => player.cards.length === 0);
      if (winner) {
        room.gameStarted = false;
        reply?.({ ok: true, winnerId: winner.playerId });
        io.to(room.roomId).emit("PLAYER_WON", {
          ...serializeRoom(room),
          winnerId: winner.playerId,
          winnerName: winner.playerName,
        });
        return;
      }

      room.currentPlayerIndex = findNextPlayerIndex(room, room.currentPlayerIndex);

      reply?.({ ok: true });
      io.to(room.roomId).emit("GAME_STATE_UPDATED", serializeRoom(room));
      io.to(room.roomId).emit("TURN_CHANGED", serializeRoom(room));
    });

    socket.on("disconnect", () => {
      for (const [roomId, room] of rooms.entries()) {
        const player = findPlayerBySocket(room, socket);
        if (!player) continue;

        player.isConnected = false;
        socket.leave(roomId);

        if (room.players.every((item) => !item.isConnected)) {
          rooms.delete(roomId);
          continue;
        }

        emitRoomState(io, room);
      }
    });
  });
}

type Ack = ((payload: { ok: boolean; error?: string; playerId?: string; room?: SerializedRoom; winnerId?: string }) => void) | undefined;

interface SerializedRoom {
  roomId: string;
  players: Array<{
    playerId: string;
    playerName: string;
    deckSize: number;
    score: number;
    isConnected: boolean;
  }>;
  gameStarted: boolean;
  currentPlayerId?: string;
  activeAnswererId?: string;
  currentCard?: HomeworkCard | null;
  winnerId?: string;
  winnerName?: string;
}

function createPlayer(socket: Socket, playerName: string): GamePlayer {
  return {
    playerId: socket.id,
    socketId: socket.id,
    playerName,
    cards: [],
    score: 0,
    isConnected: true,
  };
}

function createRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function clampMaxPlayers(value?: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  return Math.min(4, Math.max(2, Math.trunc(parsed)));
}

function normalizeName(value: string): string {
  return String(value ?? "").trim().slice(0, 40);
}

function normalizeCards(cards: HomeworkCard[]): HomeworkCard[] {
  if (!Array.isArray(cards)) return [];

  return cards
    .map((card) => ({
      id: String(card.id || createRoomCode()),
      word: String(card.word ?? "").trim(),
      translation: String(card.translation ?? "").trim(),
      hintText: card.hintText ? String(card.hintText).trim() : undefined,
      hintEmoji: card.hintEmoji ? String(card.hintEmoji).trim() : undefined,
    }))
    .filter((card) => card.word && card.translation)
    .slice(0, 60);
}

function findPlayerBySocket(room: GameRoom, socket: Socket): GamePlayer | undefined {
  return room.players.find((player) => player.socketId === socket.id);
}

function findNextPlayerIndex(room: GameRoom, fromIndex: number): number {
  for (let offset = 1; offset <= room.players.length; offset += 1) {
    const nextIndex = (fromIndex + offset + room.players.length) % room.players.length;
    if (room.players[nextIndex]?.cards.length > 0 && room.players[nextIndex]?.isConnected) {
      return nextIndex;
    }
  }

  return room.currentPlayerIndex;
}

function getAnswerer(room: GameRoom): GamePlayer | undefined {
  const presenter = room.players[room.currentPlayerIndex];
  return room.players.find((player) => player.playerId !== presenter?.playerId && player.isConnected);
}

function serializeRoom(room: GameRoom): SerializedRoom {
  const presenter = room.players[room.currentPlayerIndex];
  const answerer = getAnswerer(room);
  const winner = room.players.find((player) => player.cards.length === 0);

  return {
    roomId: room.roomId,
    players: room.players.map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      deckSize: player.cards.length,
      score: player.score,
      isConnected: player.isConnected,
    })),
    gameStarted: room.gameStarted,
    currentPlayerId: presenter?.playerId,
    activeAnswererId: answerer?.playerId,
    currentCard: presenter?.cards[0] ?? null,
    winnerId: winner?.playerId,
    winnerName: winner?.playerName,
  };
}

function emitRoomState(io: Server, room: GameRoom) {
  io.to(room.roomId).emit("ROOM_STATE", serializeRoom(room));
}
