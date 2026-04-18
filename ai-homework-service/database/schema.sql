/* 
  Database Schema for User-Created Cards
  
  This schema defines the structure for storing cards created by students
  as homework for the multiplayer Ketka game.
*/

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Card Decks (Collection of cards created by a user)
CREATE TABLE card_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cards (Individual cards in a deck)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES card_decks(id) ON DELETE CASCADE,
  word VARCHAR(255) NOT NULL,
  translation VARCHAR(255) NOT NULL,
  hint_text VARCHAR(255),
  hint_emoji VARCHAR(50),
  difficulty_level ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(deck_id, word)
);

-- Game Rooms (Sessions where players play together)
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  max_players INT DEFAULT 4,
  current_players INT DEFAULT 0,
  status ENUM('waiting', 'in_progress', 'finished') DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP
);

-- Game Room Members (Players in a room)
CREATE TABLE game_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES card_decks(id) ON DELETE SET NULL,
  score INT DEFAULT 0,
  cards_remaining INT,
  status ENUM('waiting', 'playing', 'won', 'lost') DEFAULT 'waiting',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

-- Game Turn History (Tracking game moves)
CREATE TABLE game_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE SET NULL,
  answer_correct BOOLEAN,
  card_transferred_to UUID REFERENCES users(id) ON DELETE SET NULL,
  turn_number INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game Statistics (Track user performance)
CREATE TABLE game_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_games_played INT DEFAULT 0,
  total_games_won INT DEFAULT 0,
  total_cards_created INT DEFAULT 0,
  total_correct_answers INT DEFAULT 0,
  total_wrong_answers INT DEFAULT 0,
  average_score DECIMAL(5, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_cards_deck_id ON cards(deck_id);
CREATE INDEX idx_card_decks_user_id ON card_decks(user_id);
CREATE INDEX idx_game_room_members_room_id ON game_room_members(room_id);
CREATE INDEX idx_game_room_members_user_id ON game_room_members(user_id);
CREATE INDEX idx_game_turns_room_id ON game_turns(room_id);
CREATE INDEX idx_game_turns_player_id ON game_turns(player_id);
CREATE INDEX idx_game_statistics_user_id ON game_statistics(user_id);
