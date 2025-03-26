import React from 'react';
import { motion } from 'framer-motion';

interface SparkleProps {
  color: string;
}

const Sparkle: React.FC<SparkleProps> = ({ color }) => {
  const size = Math.random() * 4 + 2;
  
  return (
    <motion.div
      initial={{ scale: 0, rotate: Math.random() * 360 }}
      animate={{
        scale: [0, 1, 0],
        rotate: [0, 180],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 0.8,
        ease: "easeOut",
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '50%',
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
      }}
    />
  );
};

interface SparklesProps {
  isActive: boolean;
  color: string;
}

const Sparkles: React.FC<SparklesProps> = ({ isActive, color }) => {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 15 }).map((_, i) => (
        <Sparkle key={i} color={color} />
      ))}
    </div>
  );
};

export default Sparkles;