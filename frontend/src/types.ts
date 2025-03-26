export type CardType = 'yellow' | 'green' | 'neutral' | 'assassin';
export type TeamType = 'orange' | 'green';
export type TileColor = 'orange' | 'green' | 'beige' | 'red';

export interface Hint {
  team: string;
  clue: string;
  number: number;
}

export interface Guess {
  team: string;
  word: string;
}

export interface AIGuessResult {
  word: string;
  correct: boolean;
  color: TileColor;
}

export interface Tile {
  id: string;
  guessed: boolean;
  word: string;
  color: TileColor;
}

export interface Game {
  id: string;
  words: string[];
  tiles: { [key: string]: Tile };
  hints: Hint[];
  guesses: Guess[];
}

export interface GameState {
  id?: string;
  cards: Card[];
  current_turn: TeamType;
  orange_score: number;
  green_score: number;
  game_over: boolean;
  winner?: TeamType;
  last_hint?: Hint;
  last_guess?: string;
  current_hint: Hint | null;
  guesses_this_turn: number;
  hints: Hint[];
  guesses: Guess[];
  ai_config?: AIConfig;
}

export interface Card {
  id: string;
  word: string;
  type: CardType;
  revealed: boolean;
}

export interface AIConfig {
  model: 'gemini-1.5-pro' | 'gemini-1.5-flash-002' | 'gemini-2.0-flash-lite-001';
  temperature: number;
  use_memory: boolean;
  hint: {
    word: string;
    number: number;
  };
  reasoning: string[];
}

export interface GameHistory {
  moves: Array<{
    type: 'hint' | 'guess';
    team: TeamType;
    word: string;
    timestamp: string;
    ai_config?: AIConfig;
  }>;
  winner?: TeamType;
}

export interface AIHintResponse {
  hint: string;
  number: number;
  agent_config: AIConfig;
}

export interface AIGuessResponse {
  guesses: AIGuessResult[];
  agent_config: AIConfig;
}