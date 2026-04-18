/* Backend Setup Guide for Multiplayer Ketka Game */

## Installation & Setup

### 1. Install Dependencies

```bash
cd ai-homework-service
npm install socket.io express cors uuid
npm install -D @types/node @types/express typescript
```

### 2. Update Server Configuration

In `ai-homework-service/src/server.js` or `app.js`:

```javascript
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { setupGameSockets } from "./sockets/gameSocket.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Initialize game sockets
setupGameSockets(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 3. Environment Variables

Add to `.env` in `ai-homework-service/`:

```
FRONTEND_URL=http://localhost:5173
PORT=3000
```

### 4. Frontend Environment Variable

Add to `.env` in root:

```
VITE_API_URL=http://localhost:3000
```

### 5. Database Setup (PostgreSQL)

Run the schema file:

```bash
psql -U postgres -d your_database -f ai-homework-service/database/schema.sql
```

### 6. Import Socket Hook in Pages

To use the multiplayer game in your pages:

```typescript
import { MultiplayerKetka } from "../components/MultiplayerKetka";

export function StudentGamesPage() {
  return <MultiplayerKetka />;
}
```

## Game Flow

1. **Create/Join Room**: Players create a room or join with room ID
2. **Submit Cards**: Each player adds their homework cards (word, translation, hint)
3. **Start Game**: Once all players submit cards, game begins
4. **Play**: 
   - Current player's card is shown
   - Other players guess
   - Correct guess = card removed
   - Wrong guess = card transferred to wrong player
5. **Win**: First player with 0 cards wins

## Socket Events

### Client → Server

- `CREATE_ROOM`: { roomName, playerName, maxPlayers }
- `JOIN_ROOM`: { roomId, playerName }
- `SUBMIT_CARDS`: { roomId, cards: Card[] }
- `START_GAME`: { roomId }
- `SUBMIT_ANSWER`: { roomId, cardId, correct }

### Server → Client

- `PLAYERS_UPDATED`: { players: PlayerInfo[] }
- `GAME_STARTED`: { currentPlayerId, currentPlayerName }
- `TURN_CHANGED`: { currentPlayerId, currentPlayerName }
- `GAME_STATE_UPDATED`: { players, currentPlayerId }
- `PLAYER_WON`: { playerId, playerName }

## Performance & Scaling

- Use Redis for session management in production
- Implement room cleanup for inactive games (30+ minutes)
- Add rate limiting to prevent spam
- Monitor socket connections with socket.io-client debug logs

## Testing

```bash
# Terminal 1
cd ai-homework-service
npm run dev

# Terminal 2
cd root
npm run dev

# Open http://localhost:5173 in multiple browsers
```
