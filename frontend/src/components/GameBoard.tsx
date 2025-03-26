import React, { useState } from 'react';
import { GameState } from '../types';
import Card from './Card';

interface GameBoardProps {
  gameState: GameState;
  onCardClick: (index: number) => void;
  showAll?: boolean;
  theme: 'light' | 'dark';
  aiGuessedWord?: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  gameState, 
  onCardClick, 
  showAll = false, 
  theme,
  aiGuessedWord 
}) => {
  const remainingOrange = 9 - gameState.orange_score;
  const remainingGreen = 8 - gameState.green_score;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className={`flex-1 p-4 rounded-xl transition-all duration-300 ${
          gameState.current_turn === 'orange'
            ? 'bg-[#FBBC05] text-gray-900 shadow-lg scale-105'
            : theme === 'dark'
              ? 'bg-white/5'
              : 'bg-white/50'
        }`}>
          <div className="font-bold text-lg mb-1">Orange Team</div>
          <div className="text-sm">
            {remainingOrange} {remainingOrange === 1 ? 'tile' : 'tiles'} remaining
          </div>
        </div>

        <div className={`mx-4 text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          VS
        </div>

        <div className={`flex-1 p-4 rounded-xl text-right transition-all duration-300 ${
          gameState.current_turn === 'green'
            ? 'bg-[#34A853] text-white shadow-lg scale-105'
            : theme === 'dark'
              ? 'bg-white/5'
              : 'bg-white/50'
        }`}>
          <div className="font-bold text-lg mb-1">Green Team</div>
          <div className="text-sm">
            {remainingGreen} {remainingGreen === 1 ? 'tile' : 'tiles'} remaining
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {gameState.cards.map((card, index) => (
          <Card
            key={index}
            card={card}
            onClick={() => onCardClick(index)}
            showAll={showAll}
            theme={theme}
            isAIGuess={card.word === aiGuessedWord}
            needsHint={!gameState.current_hint && !card.revealed}
          />
        ))}
      </div>

      {gameState.game_over && (
        <div className="mt-6 text-center">
          <div className={`inline-block px-6 py-3 rounded-xl border ${
            theme === 'dark'
              ? 'bg-white/5 border-white/10 text-white'
              : 'bg-white border-black/10 text-[#1a73e8]'
          }`}>
            <span className="text-2xl font-bold">
              Game Over! {gameState.winner && `${gameState.winner.toUpperCase()} team wins!`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameBoard;