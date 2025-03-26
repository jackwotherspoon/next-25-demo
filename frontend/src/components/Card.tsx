import React, { useState, useEffect } from 'react';
import { Card as CardType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import Sparkles from './Sparkles';
import AIGuessAnimation from './AIGuessAnimation';

interface CardProps {
  card: CardType;
  onClick: () => void;
  showAll?: boolean;
  theme: 'light' | 'dark';
  isAIGuess?: boolean;
  needsHint?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  card, 
  onClick, 
  showAll = false, 
  theme, 
  isAIGuess = false,
  needsHint = false
}) => {
  const [showSparkles, setShowSparkles] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    if (isAIGuess && !card.revealed) {
      setShowSparkles(true);
      setIsSelected(true);
      const timer = setTimeout(() => {
        setShowSparkles(false);
        setIsSelected(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAIGuess, card.revealed]);

  useEffect(() => {
    if (card.revealed) {
      setIsSelected(true);
      const timer = setTimeout(() => {
        setIsSelected(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [card.revealed]);

  const getBackgroundColor = () => {
    if (!card.revealed && !showAll) {
      return theme === 'dark'
        ? 'bg-white/5 hover:bg-white/10'
        : 'bg-white hover:bg-gray-50';
    }
    switch (card.type) {
      case 'yellow': return 'bg-[#FBBC05]';
      case 'green': return 'bg-[#34A853]';
      case 'assassin': return 'bg-[#EA4335]';
      default: return theme === 'dark' ? 'bg-[#9AA0A6]' : 'bg-gray-200';
    }
  };

  const getTextColor = () => {
    if (!card.revealed && !showAll) {
      return theme === 'dark' ? 'text-white' : 'text-gray-900';
    }
    if (card.type === 'yellow') return 'text-gray-900';
    return (card.type === 'assassin' || card.type === 'green') ? 'text-white' : 'text-gray-900';
  };

  const getBorderColor = () => {
    return theme === 'dark' ? 'border-white/10' : 'border-black/10';
  };

  const getSparkleColor = () => {
    switch (card.type) {
      case 'yellow': return '#FBBC05';
      case 'green': return '#34A853';
      case 'assassin': return '#EA4335';
      default: return theme === 'dark' ? '#9AA0A6' : '#E5E7EB';
    }
  };

  const handleClick = () => {
    if (!card.revealed && !needsHint) {
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 1000);
      onClick();
    }
  };

  return (
    <div className="relative group">
      <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${isSelected ? 'animate-rainbow-border' : ''}`}>
        <div className={`
          absolute inset-0 rounded-xl
          ${isSelected ? 'animate-rainbow-glow' : ''}
        `} />
      </div>
      <AIGuessAnimation isActive={isAIGuess && !card.revealed} />
      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(needsHint)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          ${getBackgroundColor()}
          ${getTextColor()}
          w-full aspect-[3/2]
          rounded-xl
          transition-all
          duration-300
          hover:scale-105
          flex
          items-center
          justify-center
          text-center
          p-4
          font-bold
          border
          ${getBorderColor()}
          disabled:opacity-80
          disabled:cursor-not-allowed
          disabled:hover:scale-100
          shadow-sm
          relative
          overflow-hidden
          ${needsHint ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${isSelected ? 'z-10' : ''}
        `}
        disabled={card.revealed}
        initial={isAIGuess ? { scale: 1 } : false}
        animate={isAIGuess ? { 
          scale: [1, 1.1, 1],
          transition: { duration: 0.3 }
        } : false}
      >
        <Sparkles
          isActive={showSparkles}
          color={getSparkleColor()}
        />
        {card.word}
      </motion.button>
      
      {showTooltip && (
        <div className={`
          absolute -top-12 left-1/2 transform -translate-x-1/2
          px-3 py-2 rounded-lg text-sm font-medium
          ${theme === 'dark' 
            ? 'bg-white/10 text-white' 
            : 'bg-gray-800 text-white'
          }
          whitespace-nowrap
          z-50
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
        `}>
          Provide a hint first
          <div className={`
            absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2
            border-8 border-transparent
            ${theme === 'dark'
              ? 'border-t-white/10'
              : 'border-t-gray-800'
            }
          `}></div>
        </div>
      )}
    </div>
  );
};

export default Card;