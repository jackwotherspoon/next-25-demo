import React, { useState, useRef, useEffect } from "react";
import { AIConfig, TeamType, Hint, AIGuessResult } from "../types";
import {
  Sliders,
  Brain,
  MessageSquare,
  Thermometer,
  Hash,
  Send,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { requestAIGuess } from "../api/gameApi";
import { motion, AnimatePresence } from "framer-motion";

interface AIControlsProps {
  config: AIConfig;
  onConfigChange: (config: AIConfig) => void;
  onHintSubmit: (hint: string, number: number) => void;
  onAIGuess: (guesses: AIGuessResult[]) => void;
  currentTurn: TeamType;
  currentHint: Hint | null;
  gameId?: string;
  theme: "light" | "dark";
}

const AIControls: React.FC<AIControlsProps> = ({
  config,
  onConfigChange,
  onHintSubmit,
  onAIGuess,
  currentTurn,
  currentHint,
  gameId,
  theme,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReasoningMinimized, setIsReasoningMinimized] = useState(true);
  const [currentThought, setCurrentThought] = useState<string>("");
  const [isThinking, setIsThinking] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const getBgColor = () => (theme === "dark" ? "bg-[#202124]" : "bg-white");
  const getBorderColor = () =>
    theme === "dark" ? "border-white/10" : "border-black/10";
  const getTextColor = () =>
    theme === "dark" ? "text-white" : "text-gray-900";
  const getLabelColor = () =>
    theme === "dark" ? "text-gray-200" : "text-gray-700";
  const getInputBgColor = () =>
    theme === "dark" ? "bg-white/5" : "bg-gray-50";

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [config.reasoning]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onHintSubmit(config.hint.word, config.hint.number);
    onConfigChange({
      ...config,
      hint: { word: "", number: 0 },
    });
  };

  const simulateThinking = async (thoughts: string[]) => {
    setIsThinking(true);
    setIsReasoningMinimized(false);

    for (const thought of thoughts) {
      setCurrentThought("");
      for (let i = 0; i < thought.length; i++) {
        setCurrentThought((prev) => prev + thought[i]);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsThinking(false);
    setCurrentThought("");
  };

  const handleAIGuess = async () => {
    if (!gameId || !currentHint) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestAIGuess(
        gameId,
        currentTurn,
        currentHint.clue,
        currentHint.number,
        config.model,
        config.temperature
      );

      const thoughtProcess = [
        `🤔 Analyzing hint: "${currentHint.clue}" (${currentHint.number})`,
        ...response.guesses.map((guess) =>
          [
            `\n💭 Considering "${guess.word}":`,
            `   ${guess.reasoning}`,
            `   ${guess.correct ? "✅ Correct!" : "❌ Incorrect"}`,
          ].join("\n")
        ),
      ];

      await simulateThinking(thoughtProcess);

      onConfigChange({
        ...config,
        reasoning: [...config.reasoning, ...thoughtProcess],
      });

      onAIGuess(response.guesses);
    } catch (err) {
      setError("Failed to get AI guess. Please try again.");
      console.error("AI guess error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const variants = {
    circle: {
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
    },
    expanded: {
      width: "384px",
      height: "calc(100vh - 48px)",
      borderRadius: "12px",
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    <>
      <div
        className={`${getBgColor()} border ${getBorderColor()} p-6 rounded-xl ${getTextColor()} shadow-sm`}
      >
        <h2
          className={`text-2xl font-bold mb-6 flex items-center gap-2 ${
            theme === "dark" ? "text-white" : "text-[#1a73e8]"
          }`}
        >
          <Brain
            className={`w-6 h-6 ${
              theme === "dark" ? "text-white" : "text-[#1a73e8]"
            }`}
          />
          AI Configuration
        </h2>

        {error && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              theme === "dark"
                ? "bg-red-500/10 text-red-200 border-red-500/20"
                : "bg-red-50 text-red-800 border-red-100"
            } border`}
          >
            {error}
          </div>
        )}

        {currentHint ? (
          <div
            className={`mb-6 p-4 rounded-lg ${
              theme === "dark" ? "bg-white/10" : "bg-gray-100"
            }`}
          >
            <div className="text-sm font-medium mb-1">Current Hint</div>
            <div className="text-lg font-bold mb-3">
              {currentHint.clue} ({currentHint.number})
            </div>
            <button
              onClick={handleAIGuess}
              disabled={isLoading}
              className={`
                w-full px-4 py-2 rounded-lg font-medium
                transition-all duration-300
                flex items-center justify-center gap-2
                ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#34A853] hover:bg-[#2d9247] active:bg-[#267c3d]"
                }
                text-white
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <Sparkles
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Thinking..." : "Get AI Guess"}
            </button>
          </div>
        ) : (
          <div
            className={`mb-6 p-4 rounded-lg ${
              theme === "dark"
                ? "bg-yellow-500/10 text-yellow-200"
                : "bg-yellow-50 text-yellow-800"
            }`}
          >
            <div className="text-sm">
              {currentTurn === "orange" ? "Orange" : "Green"} team needs to
              provide a hint
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label
              className={`block text-sm font-medium ${getLabelColor()} mb-2`}
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#4285f4]" />
                Model
              </div>
            </label>
            <select
              value={config.model}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  model: e.target.value as AIConfig["model"],
                })
              }
              className={`w-full p-2 rounded-lg ${getInputBgColor()} border ${getBorderColor()} ${getTextColor()} focus:outline-none focus:ring-2 focus:ring-[#4285f4] focus:border-transparent`}
            >
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.0-flash-lite">
                Gemini 2.0 Flash Lite
              </option>
            </select>
          </div>

          <div>
            <label
              className={`block text-sm font-medium ${getLabelColor()} mb-2`}
            >
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-[#4285f4]" />
                Temperature: {config.temperature.toFixed(1)}
              </div>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.3"
              value={config.temperature}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  temperature: parseFloat(
                    e.target.value
                  ) as AIConfig["temperature"],
                })
              }
              className="w-full accent-[#4285f4]"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium ${getLabelColor()} mb-2`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#4285f4]" />
                  Hint Word
                </div>
              </label>
              <input
                type="text"
                value={config.hint.word}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    hint: { ...config.hint, word: e.target.value },
                  })
                }
                className={`w-full p-2 rounded-lg ${getInputBgColor()} border ${getBorderColor()} ${getTextColor()} focus:outline-none focus:ring-2 focus:ring-[#4285f4] focus:border-transparent`}
                placeholder="Enter a one-word hint..."
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium ${getLabelColor()} mb-2`}
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#4285f4]" />
                  Number of Related Words
                </div>
              </label>
              <input
                type="number"
                min="0"
                max="9"
                value={config.hint.number}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    hint: {
                      ...config.hint,
                      number: parseInt(e.target.value, 10),
                    },
                  })
                }
                className={`w-full p-2 rounded-lg ${getInputBgColor()} border ${getBorderColor()} ${getTextColor()} focus:outline-none focus:ring-2 focus:ring-[#4285f4] focus:border-transparent`}
              />
            </div>

            <button
              type="submit"
              disabled={
                !config.hint.word ||
                config.hint.number <= 0 ||
                currentHint !== null
              }
              className={`
                w-full px-4 py-2 rounded-lg font-medium
                transition-all duration-300
                flex items-center justify-center gap-2
                ${
                  currentHint
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#4285f4] hover:bg-[#3367d6] active:bg-[#2850a7]"
                }
                text-white
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <Send className="w-4 h-4" />
              Submit Hint
            </button>
          </form>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.use_memory}
              onChange={(e) =>
                onConfigChange({ ...config, use_memory: e.target.checked })
              }
              className={`rounded ${getInputBgColor()} border-[#4285f4] text-[#4285f4] focus:ring-[#4285f4] focus:ring-offset-0`}
            />
            <label className={`text-sm font-medium ${getLabelColor()}`}>
              Enable Memory
            </label>
          </div>
        </div>
      </div>

      <motion.div
        initial="circle"
        animate={isReasoningMinimized ? "circle" : "expanded"}
        variants={variants}
        className={`
          fixed bottom-6 right-6
          ${getBgColor()}
          border ${getBorderColor()}
          shadow-lg
          overflow-hidden
          z-50
        `}
      >
        <AnimatePresence mode="wait">
          {isReasoningMinimized ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsReasoningMinimized(false)}
              className={`
                w-full h-full
                flex items-center justify-center
                transition-colors duration-200
                ${theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"}
              `}
            >
              <Brain
                className={`w-6 h-6 ${
                  isThinking ? "animate-pulse text-[#4285f4]" : ""
                }`}
              />
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full flex flex-col"
            >
              <div
                className={`
                p-4 border-b ${getBorderColor()}
                flex items-center justify-between
                ${theme === "dark" ? "bg-[#2c2c2c]" : "bg-gray-50"}
              `}
              >
                <div className="flex items-center gap-2">
                  <Brain
                    className={`w-5 h-5 ${
                      isThinking ? "animate-pulse" : ""
                    } text-[#4285f4]`}
                  />
                  <h3 className="font-medium">AI Reasoning Log</h3>
                </div>
                <button
                  onClick={() => setIsReasoningMinimized(true)}
                  className={`
                    p-1.5 rounded-lg
                    transition-colors duration-200
                    ${
                      theme === "dark"
                        ? "hover:bg-white/10"
                        : "hover:bg-gray-200"
                    }
                  `}
                >
                  <motion.div
                    initial={{ rotate: 0 }}
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {config.reasoning.length === 0 && !isThinking ? (
                  <div
                    className={`text-center ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    No reasoning logs yet. The AI will show its thinking process
                    here when it makes guesses.
                  </div>
                ) : (
                  <>
                    {config.reasoning.map((log, index) => (
                      <p
                        key={index}
                        className={`font-mono text-sm ${
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {log}
                      </p>
                    ))}
                    {isThinking && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`font-mono text-sm ${
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {currentThought}
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          ▋
                        </motion.span>
                      </motion.p>
                    )}
                    <div ref={logEndRef} />
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default AIControls;
