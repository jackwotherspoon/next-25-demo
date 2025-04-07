import React, { useState, useEffect } from "react";
import {
  GameState,
  AIConfig,
  Card,
  CardType,
  Game,
  Tile,
  Hint,
  Guess,
  AIGuessResult,
  GameTheme,
} from "./types";
import GameBoard from "./components/GameBoard";
import AIControls from "./components/AIControls";
import { Play, RotateCcw, Eye, EyeOff, Sun, Moon } from "lucide-react";
import {
  createNewGame,
  mapTileColorToCardType,
  updateGameState,
} from "./api/gameApi";
import { WORD_LIST } from "./data/words";
import { useTheme } from "./contexts/ThemeContext";

function App() {
  const { theme, toggleTheme } = useTheme();
  const [gameState, setGameState] = useState<GameState>({
    cards: [],
    current_turn: "orange",
    orange_score: 0,
    green_score: 0,
    game_over: false,
    current_hint: null,
    guesses_this_turn: 0,
    hints: [],
    guesses: [],
    theme: "regular",
  });

  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiGuessedWord, setAiGuessedWord] = useState<string | undefined>();
  const [selectedTheme, setSelectedTheme] = useState<GameTheme>("regular");

  const [aiConfig, setAIConfig] = useState<AIConfig>({
    model: "gemini-1.5-pro",
    temperature: 0.6,
    use_memory: true,
    hint: {
      word: "",
      number: 0,
    },
    reasoning: [],
  });

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const updateGameStateWithAPI = async (newGameState: GameState) => {
    if (!newGameState.id) return;

    try {
      const tiles: { [key: string]: Tile } = {};
      newGameState.cards.forEach((card) => {
        tiles[card.word] = {
          id: card.id,
          word: card.word,
          guessed: card.revealed,
          color:
            card.type === "yellow"
              ? "orange"
              : card.type === "green"
              ? "green"
              : card.type === "assassin"
              ? "red"
              : "beige",
        };
      });

      const update: Partial<Game> = {
        id: newGameState.id,
        tiles,
        hints: newGameState.hints,
        guesses: newGameState.guesses,
        theme: newGameState.theme,
      };

      await updateGameState(newGameState.id, update);
    } catch (err) {
      console.error("Failed to update game state:", err);
    }
  };

  const switchTurn = (newGameState: GameState) => {
    newGameState.current_turn =
      newGameState.current_turn === "orange" ? "green" : "orange";
    newGameState.current_hint = null;
    newGameState.guesses_this_turn = 0;
  };

  const handleCardClick = async (index: number) => {
    if (
      gameState.game_over ||
      gameState.cards[index].revealed ||
      !gameState.current_hint
    )
      return;

    const newCards = [...gameState.cards];
    const clickedCard = newCards[index];
    clickedCard.revealed = true;

    const newGuess: Guess = {
      team: gameState.current_turn,
      word: clickedCard.word,
    };

    let newGameState = {
      ...gameState,
      cards: newCards,
      guesses_this_turn: gameState.guesses_this_turn + 1,
      last_guess: clickedCard.word,
      guesses: [...gameState.guesses, newGuess],
    };

    if (clickedCard.type === "assassin") {
      newGameState.game_over = true;
      newGameState.winner =
        gameState.current_turn === "orange" ? "green" : "orange";
      switchTurn(newGameState);
    } else if (clickedCard.type === "yellow") {
      newGameState.orange_score++;
      if (newGameState.orange_score === 9) {
        newGameState.game_over = true;
        newGameState.winner = "orange";
      }
      if (
        gameState.current_turn !== "orange" ||
        newGameState.guesses_this_turn >= (gameState.current_hint?.number || 0)
      ) {
        switchTurn(newGameState);
      }
    } else if (clickedCard.type === "green") {
      newGameState.green_score++;
      if (newGameState.green_score === 8) {
        newGameState.game_over = true;
        newGameState.winner = "green";
      }
      if (
        gameState.current_turn !== "green" ||
        newGameState.guesses_this_turn >= (gameState.current_hint?.number || 0)
      ) {
        switchTurn(newGameState);
      }
    } else {
      switchTurn(newGameState);
    }

    setGameState(newGameState);
    await updateGameStateWithAPI(newGameState);
  };

  const handleHintSubmit = async (hint: string, number: number) => {
    if (!hint || number <= 0 || !gameState.id) return;

    const newHint: Hint = {
      team: gameState.current_turn,
      clue: hint,
      number,
    };

    const newGameState = {
      ...gameState,
      current_hint: newHint,
      last_hint: newHint,
      hints: [...gameState.hints, newHint],
      guesses_this_turn: 0,
    };

    setGameState(newGameState);
    await updateGameStateWithAPI(newGameState);
  };

  const handleAIGuess = async (guesses: AIGuessResult[]) => {
    let currentGameState = { ...gameState };

    for (const guess of guesses) {
      const cardIndex = currentGameState.cards.findIndex(
        (card) => card.word === guess.word
      );

      if (cardIndex !== -1) {
        setAiGuessedWord(guess.word);

        const newCards = [...currentGameState.cards];
        const clickedCard = newCards[cardIndex];
        clickedCard.revealed = true;

        const newGuess: Guess = {
          team: currentGameState.current_turn,
          word: clickedCard.word,
        };

        currentGameState = {
          ...currentGameState,
          cards: newCards,
          guesses_this_turn: currentGameState.guesses_this_turn + 1,
          last_guess: clickedCard.word,
          guesses: [...currentGameState.guesses, newGuess],
        };

        if (clickedCard.type === "assassin") {
          currentGameState.game_over = true;
          currentGameState.winner =
            currentGameState.current_turn === "orange" ? "green" : "orange";
          switchTurn(currentGameState);
          break;
        } else if (clickedCard.type === "yellow") {
          currentGameState.orange_score++;
          if (currentGameState.orange_score === 9) {
            currentGameState.game_over = true;
            currentGameState.winner = "orange";
            break;
          }
          if (currentGameState.current_turn !== "orange") {
            switchTurn(currentGameState);
            break;
          }
        } else if (clickedCard.type === "green") {
          currentGameState.green_score++;
          if (currentGameState.green_score === 8) {
            currentGameState.game_over = true;
            currentGameState.winner = "green";
            break;
          }
          if (currentGameState.current_turn !== "green") {
            switchTurn(currentGameState);
            break;
          }
        } else {
          switchTurn(currentGameState);
          break;
        }

        // Check if we've reached the maximum number of guesses
        if (
          currentGameState.guesses_this_turn >=
          (currentGameState.current_hint?.number || 0)
        ) {
          switchTurn(currentGameState);
          break;
        }

        setGameState(currentGameState);
        await updateGameStateWithAPI(currentGameState);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setAiGuessedWord(undefined);
      }
    }

    // Ensure final state is updated
    setGameState(currentGameState);
    await updateGameStateWithAPI(currentGameState);
    setAiGuessedWord(undefined);
  };

  const initializeGame = async () => {
    setLoading(true);
    setError(null);

    // Reset AI config reasoning
    setAIConfig((prev) => ({
      ...prev,
      reasoning: [],
      hint: { word: "", number: 0 },
    }));

    try {
      const gameResponse = await createNewGame(selectedTheme);

      const cards: Card[] = shuffleArray(
        Object.entries(gameResponse.tiles).map(([id, tile]) => ({
          id: tile.id,
          word: tile.word,
          type: mapTileColorToCardType(tile.color),
          revealed: tile.guessed,
        }))
      );

      const newGameState: GameState = {
        id: gameResponse.id,
        cards,
        current_turn: "orange",
        orange_score: 0,
        green_score: 0,
        game_over: false,
        current_hint: null,
        guesses_this_turn: 0,
        hints: [],
        guesses: [],
        theme: selectedTheme,
      };

      setGameState(newGameState);
      await updateGameStateWithAPI(newGameState);
    } catch (err) {
      setError(
        "An error occurred while setting up the game. Using local word list as fallback."
      );
      console.error("Error initializing game:", err);

      const fallbackWords = shuffleArray([...WORD_LIST]).slice(0, 25);

      const types: CardType[] = shuffleArray([
        ...Array(9).fill("yellow"),
        ...Array(8).fill("green"),
        ...Array(7).fill("neutral"),
        "assassin",
      ]);

      const cards: Card[] = fallbackWords.map((word, index) => ({
        id: `local-${index}`,
        word,
        type: types[index],
        revealed: false,
      }));

      setGameState({
        cards,
        current_turn: "orange",
        orange_score: 0,
        green_score: 0,
        game_over: false,
        current_hint: null,
        guesses_this_turn: 0,
        hints: [],
        guesses: [],
        theme: selectedTheme,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeGame();
  }, []);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "dark" ? "bg-[#202124]" : "bg-gray-50"
      }`}
    >
      <div
        className={`bg-gradient-to-b ${
          theme === "dark"
            ? "from-[#1a73e8]/10 to-transparent"
            : "from-[#1a73e8]/5 to-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center gap-6">
              <img
                src="https://cloud.withgoogle.com/next/25/assets/img/lockup-cloud-25.dca34f7.png"
                alt="Google Cloud Next '25"
                className="h-12"
              />
              <div
                className={`h-8 w-px ${
                  theme === "dark" ? "bg-white/10" : "bg-black/10"
                }`}
              ></div>
              <h1
                className={`text-4xl font-bold ${
                  theme === "dark" ? "text-white" : "text-[#1a73e8]"
                }`}
              >
                Secret Agents
              </h1>
            </div>
            <div className="flex gap-4">
              <button
                onClick={toggleTheme}
                className={`
                  p-3 rounded-xl
                  transition-all duration-300 ease-in-out
                  flex items-center justify-center
                  transform hover:scale-105 active:scale-95
                  ${
                    theme === "dark"
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }
                `}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value as GameTheme)}
                className={`
                  px-4 rounded-xl font-medium text-sm
                  transition-all duration-300 ease-in-out
                  border border-transparent
                  ${
                    theme === "dark"
                      ? "bg-white/10 text-white hover:bg-white/20 hover:border-white/10"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:border-black/10"
                  }
                `}
              >
                <option value="regular">Regular Theme</option>
                <option value="easter">Easter Theme</option>
                <option value="christmas">Christmas Theme</option>
                <option value="technology">Technology Theme</option>
              </select>
              <button
                onClick={() => setShowAll(!showAll)}
                className={`
                  px-6 py-3 rounded-xl font-medium text-sm
                  transition-all duration-300 ease-in-out
                  flex items-center gap-3
                  ${
                    showAll
                      ? "bg-[#FBBC05] hover:bg-[#e5ab04] text-gray-900"
                      : "bg-[#34A853] hover:bg-[#2d9247] text-white"
                  }
                  transform hover:scale-105 active:scale-95
                  border border-transparent
                  ${
                    theme === "dark"
                      ? "hover:border-white/10"
                      : "hover:border-black/10"
                  }
                `}
              >
                {showAll ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
                {showAll ? "Hide Cards" : "Reveal Cards"}
              </button>
              <button
                onClick={initializeGame}
                disabled={loading}
                className={`
                  px-6 py-3 rounded-xl font-medium text-sm
                  transition-all duration-300 ease-in-out
                  flex items-center gap-3
                  bg-[#1a73e8] hover:bg-[#1557b0] text-white
                  transform hover:scale-105 active:scale-95
                  border border-transparent
                  ${
                    theme === "dark"
                      ? "hover:border-white/10"
                      : "hover:border-black/10"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <RotateCcw
                  className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Starting..." : "New Game"}
              </button>
            </div>
          </div>

          {error && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                theme === "dark"
                  ? "bg-red-500/10 text-red-200 border-red-500/20"
                  : "bg-red-50 text-red-800 border-red-100"
              } border`}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <GameBoard
              gameState={gameState}
              onCardClick={handleCardClick}
              showAll={showAll}
              theme={theme}
              aiGuessedWord={aiGuessedWord}
            />
            <AIControls
              config={aiConfig}
              onConfigChange={setAIConfig}
              onHintSubmit={handleHintSubmit}
              onAIGuess={handleAIGuess}
              currentTurn={gameState.current_turn}
              currentHint={gameState.current_hint}
              gameId={gameState.id}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
