// src/pages/HomePage.tsx
import React, { useState, useEffect } from "react";
import { User, signOut } from "firebase/auth";
import { auth } from "../firebase"; // Adjust path if needed

// --- Game Imports ---
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
} from "../types"; // Adjust path if needed
import GameBoard from "../components/GameBoard"; // Adjust path if needed
import AIControls from "../components/AIControls"; // Adjust path if needed
import { Play, RotateCcw, Eye, EyeOff, Sun, Moon, LogOut } from "lucide-react";
import {
  createNewGame,
  mapTileColorToCardType,
  updateGameState,
} from "../api/gameApi"; // Adjust path if needed
import { WORD_LIST } from "../data/words"; // Adjust path if needed
import { useTheme } from "../contexts/ThemeContext"; // Adjust path if needed

interface HomePageProps {
  currentUser: User; // Passed from ProtectedRoute, guaranteed non-null
}

function HomePage({ currentUser }: HomePageProps) {
  const { theme, toggleTheme } = useTheme();

  // --- All your existing Game State and AI Config State ---
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
  const [loading, setLoading] = useState(false); // For game initialization
  const [error, setError] = useState<string | null>(null);
  const [aiGuessedWord, setAiGuessedWord] = useState<string | undefined>();
  const [selectedTheme, setSelectedTheme] = useState<GameTheme>("regular");
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    model: "gemini-1.5-pro",
    temperature: 0.7,
    use_memory: true,
    hint: { word: "", number: 0 },
    reasoning: [],
  });
  // ... any other state you had ...

  // --- Sign Out Handler ---
  const handleSignOut = async () => {
    try {
      setError(null); // Clear errors on sign out attempt
      await signOut(auth);
      // Redirect handled by ProtectedRoute via onAuthStateChanged in App.tsx
      // Optionally reset local game state if desired
      // setGameState({ /* initial empty state */ });
    } catch (error: any) {
      console.error("Sign out error:", error);
      setError(`Sign out failed: ${error.message}`);
    }
  };

  // --- All your existing Game Logic Functions ---
  // (Make sure they use state defined within this HomePage component)
  const shuffleArray = <T,>(array: T[]): T[] => {
    /* ... function code from your App.tsx ... */
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const updateGameStateWithAPI = async (newGameState: GameState) => {
    /* ... function code from your App.tsx ... */
    if (!newGameState.id) return;
    try {
      const tiles: { [key: string]: Tile } = {};
      newGameState.cards.forEach((card) => {
        tiles[card.word] = {
          id: card.id,
          guessed: card.revealed,
          word: card.word,
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
        tiles: tiles,
        hints: newGameState.hints,
        guesses: newGameState.guesses,
      };
      await updateGameState(newGameState.id, update);
    } catch (err: any) {
      console.error("Failed to update game state:", err);
    }
  };

  const switchTurn = (newGameState: GameState) => {
    /* ... function code from your App.tsx ... */
    newGameState.current_turn =
      newGameState.current_turn === "orange" ? "green" : "orange";
    newGameState.current_hint = null;
    newGameState.guesses_this_turn = 0;
  };

  const handleCardClick = async (index: number) => {
    /* ... function code from your App.tsx ... */
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

    // Game win/loss/turn logic
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
        newGameState.guesses_this_turn >= (gameState.current_hint?.number ?? 99)
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
        newGameState.guesses_this_turn >= (gameState.current_hint?.number ?? 99)
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
    /* ... function code from your App.tsx ... */
    if (!hint || number <= 0 || !gameState.id) return;
    const newHint: Hint = { team: gameState.current_turn, clue: hint, number };
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
    /* ... function code from your App.tsx ... */
    let currentGameState = { ...gameState };
    for (const guess of guesses) {
      const cardIndex = currentGameState.cards.findIndex(
        (card) => !card.revealed && card.word === guess.word
      );
      if (cardIndex !== -1) {
        setAiGuessedWord(guess.word);
        const newCards = [...currentGameState.cards];
        const clickedCard = { ...newCards[cardIndex], revealed: true };
        newCards[cardIndex] = clickedCard;
        const newGuessEntry: Guess = {
          team: currentGameState.current_turn,
          word: clickedCard.word,
        };
        currentGameState = {
          ...currentGameState,
          cards: newCards,
          guesses_this_turn: currentGameState.guesses_this_turn + 1,
          last_guess: clickedCard.word,
          guesses: [...currentGameState.guesses, newGuessEntry],
        };
        let turnShouldEnd = false;
        let gameOver = false;
        if (clickedCard.type === "assassin") {
          currentGameState.game_over = true;
          currentGameState.winner =
            currentGameState.current_turn === "orange" ? "green" : "orange";
          turnShouldEnd = true;
          gameOver = true;
        } else if (clickedCard.type === "yellow") {
          currentGameState.orange_score++;
          if (currentGameState.orange_score === 9) {
            currentGameState.game_over = true;
            currentGameState.winner = "orange";
            gameOver = true;
          }
          if (currentGameState.current_turn !== "orange") {
            turnShouldEnd = true;
          }
        } else if (clickedCard.type === "green") {
          currentGameState.green_score++;
          if (currentGameState.green_score === 8) {
            currentGameState.game_over = true;
            currentGameState.winner = "green";
            gameOver = true;
          }
          if (currentGameState.current_turn !== "green") {
            turnShouldEnd = true;
          }
        } else {
          turnShouldEnd = true;
        }
        if (
          !gameOver &&
          currentGameState.guesses_this_turn >=
            (currentGameState.current_hint?.number ?? 99)
        ) {
          turnShouldEnd = true;
        }
        setGameState(currentGameState);
        await updateGameStateWithAPI(currentGameState);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setAiGuessedWord(undefined);
        if (turnShouldEnd || gameOver) {
          if (!gameOver) {
            switchTurn(currentGameState);
          }
          setGameState(currentGameState);
          await updateGameStateWithAPI(currentGameState);
          break;
        }
      } else {
        console.warn(
          `AI guessed word "${guess.word}" not found or already revealed.`
        );
        break;
      }
    }
    setGameState(currentGameState);
    if (currentGameState.id) await updateGameStateWithAPI(currentGameState);
    setAiGuessedWord(undefined);
  };

  const initializeGame = async () => {
    /* ... function code from your App.tsx ... */
    setLoading(true);
    setError(null);
    setAIConfig((prev) => ({
      ...prev,
      reasoning: [],
      hint: { word: "", number: 0 },
    }));
    try {
      const gameResponse = await createNewGame(selectedTheme);
      const cards: Card[] = shuffleArray(
        Object.values(gameResponse.tiles).map((tile) => ({
          id: tile.id,
          word: tile.word,
          type: mapTileColorToCardType(tile.color),
          revealed: tile.guessed,
        }))
      );
      let initialOrangeScore = cards.filter(
        (c) => c.revealed && c.type === "yellow"
      ).length;
      let initialGreenScore = cards.filter(
        (c) => c.revealed && c.type === "green"
      ).length;
      const newGameState: GameState = {
        id: gameResponse.id,
        cards,
        current_turn: gameResponse.current_turn ?? "orange",
        orange_score: initialOrangeScore,
        green_score: initialGreenScore,
        game_over: gameResponse.game_over ?? false,
        winner: gameResponse.winner,
        current_hint: gameResponse.hints?.length
          ? gameResponse.hints[gameResponse.hints.length - 1]
          : null,
        guesses_this_turn: gameResponse.guesses_this_turn ?? 0,
        hints: gameResponse.hints ?? [],
        guesses: gameResponse.guesses ?? [],
        theme: selectedTheme,
        last_guess: gameResponse.guesses?.length
          ? gameResponse.guesses[gameResponse.guesses.length - 1]?.word
          : undefined,
      };
      setGameState(newGameState);
    } catch (err: any) {
      setError(
        `Failed to start or load game: ${err.message}. Using local fallback.`
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

  // --- useEffect for initializing game ---
  useEffect(() => {
    // Initialize game now that we know the user is logged in.
    initializeGame();
  }, [currentUser.uid]); // Depend on user ID to potentially re-init if user changes

  // --- Return the JSX for the main application ---
  // (This is the main return block from your original App.tsx, but adjusted
  //  to use the `currentUser` prop and include the sign-out button)
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "dark"
          ? "bg-[#202124] text-gray-200"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      <div
        className={`bg-gradient-to-b ${
          theme === "dark"
            ? "from-[#1a73e8]/10 to-transparent"
            : "from-[#1a73e8]/5 to-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
          {/* --- Header --- */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <img
                src="https://cloud.withgoogle.com/next/25/assets/img/lockup-cloud-25.dca34f7.png"
                alt="Secret Agents Game"
                className="h-10 sm:h-12"
              />
              <div
                className={`h-8 w-px ${
                  theme === "dark" ? "bg-white/10" : "bg-black/10"
                }`}
              ></div>
              <h1
                className={`text-3xl sm:text-4xl font-bold ${
                  theme === "dark" ? "text-white" : "text-[#1a73e8]"
                }`}
              >
                Secret Agents
              </h1>
            </div>
            {/* Controls and Auth */}
            <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2 sm:gap-4">
              {/* User Info & Sign Out */}
              <div className="flex items-center gap-2 sm:gap-3">
                <span
                  className="text-sm truncate max-w-[100px] sm:max-w-[150px]"
                  title={currentUser.email ?? currentUser.uid}
                >
                  Hi, {currentUser.displayName?.split(" ")[0] ?? "Agent"}!
                </span>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transform hover:scale-105 active:scale-95 ... ${
                    theme === "dark" ? "bg-red-500/10 ..." : "bg-red-100 ..."
                  }`}
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="flex gap-4">
                {/* Other Controls */}
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
                  onChange={(e) =>
                    setSelectedTheme(e.target.value as GameTheme)
                  }
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
                  title="Start a New Game"
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
          </div>
          {/* Error Display */}
          {error && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ... ${
                theme === "dark" ? "bg-red-500/10 ..." : "bg-red-50 ..."
              } border flex justify-between items-center`}
            >
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-2 p-1 rounded hover:bg-red-500/20"
              >
                ✕
              </button>
            </div>
          )}
          {/* --- Main Game Area --- */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_350px] gap-6 sm:gap-8">
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
              disabled={false /* Can potentially disable based on game state */}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
