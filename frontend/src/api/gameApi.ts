import {
  GameResponse,
  GameState,
  GameHistory,
  Hint,
  AIHintResponse,
  AIGuessResponse,
  TeamType,
  AIConfig,
  Card,
  CardType,
  Game,
  Tile,
  GameTheme,
} from "../types";
import { WORD_LIST } from "../data/words";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const TIMEOUT_MS = 5000; // 5 seconds timeout
const MAX_RETRIES = 2;

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

async function fetchWithTimeout(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const {
    timeout = TIMEOUT_MS,
    retries = MAX_RETRIES,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (retries > 0) {
      console.warn(`Retrying request to ${url}, ${retries} attempts remaining`);
      return fetchWithTimeout(url, { ...options, retries: retries - 1 });
    }
    throw error;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // If parsing error response fails, use default error message
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export function mapTileColorToCardType(color: string): CardType {
  switch (color) {
    case "orange":
      return "yellow";
    case "green":
      return "green";
    case "red":
      return "assassin";
    default:
      return "neutral";
  }
}

export async function createNewGame(
  theme: GameTheme = "regular"
): Promise<GameResponse> {
  try {
    const url = new URL(`${API_BASE_URL}/game`);
    url.searchParams.append("theme", theme);

    const response = await fetchWithTimeout(url.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    return handleResponse<GameResponse>(response);
  } catch (error) {
    console.error("Failed to create new game:", error);
    throw error;
  }
}

export async function getGameState(gameId: string): Promise<GameState> {
  if (!gameId) throw new Error("Game ID is required");

  const response = await fetchWithTimeout(`${API_BASE_URL}/game/${gameId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return handleResponse<GameState>(response);
}

export async function updateGameState(
  gameId: string,
  update: Partial<Game>
): Promise<GameState> {
  if (!gameId) throw new Error("Game ID is required");
  if (!update) throw new Error("Update data is required");

  const response = await fetchWithTimeout(`${API_BASE_URL}/game/${gameId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(update),
  });
  return handleResponse<GameState>(response);
}

export async function deleteGame(gameId: string): Promise<void> {
  if (!gameId) throw new Error("Game ID is required");

  const response = await fetchWithTimeout(`${API_BASE_URL}/game/${gameId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete game: ${response.status}`);
  }
}

export async function getGameHistory(gameId: string): Promise<GameHistory> {
  if (!gameId) throw new Error("Game ID is required");

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/game/${gameId}/history`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );
  return handleResponse<GameHistory>(response);
}

export async function submitHint(
  gameId: string,
  team: TeamType,
  hint: string,
  number: number
): Promise<GameState> {
  if (!gameId) throw new Error("Game ID is required");
  if (!hint) throw new Error("Hint is required");
  if (number < 0) throw new Error("Number must be positive");

  const update: Partial<Game> = {
    hints: [{ team, clue: hint, number }],
  };

  return updateGameState(gameId, update);
}

export async function submitGuess(
  gameId: string,
  team: TeamType,
  guess: string
): Promise<GameState> {
  if (!gameId) throw new Error("Game ID is required");
  if (!guess) throw new Error("Guess is required");

  const update: Partial<Game> = {
    guesses: [{ team, word: guess }],
  };

  return updateGameState(gameId, update);
}

export async function requestAIGuess(
  gameId: string,
  team: TeamType,
  hint: string,
  number: number,
  model: string,
  temperature: number
): Promise<AIGuessResponse> {
  if (!gameId) throw new Error("Game ID is required");
  if (!hint) throw new Error("Hint is required");
  if (number <= 0) throw new Error("Number must be positive");

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/game/${gameId}/guess`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        team,
        clue: hint,
        number,
        model,
        temperature,
      }),
    }
  );
  return handleResponse<AIGuessResponse>(response);
}

export async function requestAIHint(
  gameId: string,
  team: TeamType
): Promise<AIHintResponse> {
  if (!gameId) throw new Error("Game ID is required");

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/game/${gameId}/ai/hint`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ team }),
    }
  );
  return handleResponse<AIHintResponse>(response);
}
