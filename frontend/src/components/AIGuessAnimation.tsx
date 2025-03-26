import React from 'react';
import { motion } from 'framer-motion';

interface AIGuessAnimationProps {
  isActive: boolean;
}

const AIGuessAnimation: React.FC<AIGuessAnimationProps> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{
        scale: [1.2, 1.1, 1],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: 1,
        ease: "easeOut",
      }}
      className="absolute inset-0 z-10"
    >
      <div className="absolute inset-0 rounded-xl bg-[#4285f4] opacity-30" />
      <div className="absolute inset-0 rounded-xl animate-pulse">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#4285f4] via-[#34a853] to-[#fbbc05] opacity-40" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-2xl"
          >
            🤖
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AIGuessAnimation;