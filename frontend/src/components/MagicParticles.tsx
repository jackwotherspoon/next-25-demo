import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface MagicParticlesProps {
  isVisible: boolean;
  color: string;
}

const MagicParticles: React.FC<MagicParticlesProps> = ({ isVisible, color }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isVisible) {
      const newParticles = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        color: color === 'yellow' ? '#FBBC05' : 
               color === 'green' ? '#34A853' : 
               '#EA4335'
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [isVisible, color]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute left-1/2 top-1/2 w-3 h-3"
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0,
                opacity: 1 
              }}
              animate={{ 
                x: particle.x,
                y: particle.y,
                scale: 1,
                opacity: 0
              }}
              exit={{ 
                scale: 0,
                opacity: 0
              }}
              transition={{ 
                duration: 0.8,
                ease: "easeOut"
              }}
            >
              <div 
                className="w-full h-full rounded-full"
                style={{ backgroundColor: particle.color }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

export default MagicParticles;