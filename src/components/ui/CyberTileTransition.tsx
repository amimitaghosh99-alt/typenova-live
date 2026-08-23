import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme } from '@/data/constants';

interface CyberTileTransitionProps {
  pageKey: string;
  theme?: Theme;
  cols?: number;
  rows?: number;
}

export const CyberTileTransition: React.FC<CyberTileTransitionProps> = ({
  pageKey,
  theme,
  cols = 10,
  rows = 6,
}) => {
  const [isWiping, setIsWiping] = useState(false);
  const prevPageKeyRef = useRef(pageKey);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (prevPageKeyRef.current !== pageKey) {
      prevPageKeyRef.current = pageKey;
      setIsWiping(true);
      const timer = setTimeout(() => {
        setIsWiping(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [pageKey]);

  // Generate grid tiles
  const totalTiles = cols * rows;
  const tiles = Array.from({ length: totalTiles }, (_, index) => {
    const r = Math.floor(index / cols);
    const c = index % cols;
    // Diagonal wave distance
    const dist = (r + c) / (rows + cols - 2);
    return { id: index, r, c, dist };
  });

  const glowColor = theme ? `rgba(${theme.glowPrimary}, 0.6)` : 'rgba(6, 182, 212, 0.6)';
  const bgAccent = theme ? `rgba(${theme.glowPrimary}, 0.08)` : 'rgba(6, 182, 212, 0.08)';

  return (
    <AnimatePresence>
      {isWiping && (
        <div 
          className="fixed inset-0 z-[200] pointer-events-none grid overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            perspective: '1200px',
          }}
        >
          {tiles.map((tile) => {
            const enterDelay = tile.dist * 0.18;

            return (
              <motion.div
                key={tile.id}
                initial={{ 
                  scale: 0.1, 
                  opacity: 0,
                  rotateY: -90,
                  rotateX: 45,
                }}
                animate={{ 
                  scale: [0.1, 1.04, 1, 1, 0], 
                  opacity: [0, 1, 1, 0.9, 0],
                  rotateY: [-90, 0, 0, 0, 90],
                  rotateX: [45, 0, 0, 0, -45],
                }}
                transition={{
                  duration: 0.65,
                  times: [0, 0.3, 0.5, 0.7, 1],
                  delay: enterDelay,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative w-full h-full backdrop-blur-md border border-white/10 overflow-hidden transform-gpu"
                style={{
                  backgroundColor: bgAccent,
                  boxShadow: `inset 0 0 20px ${glowColor}, 0 0 10px rgba(0,0,0,0.5)`,
                }}
              >
                {/* Cyber Corner Grid Point */}
                <div 
                  className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full opacity-60"
                  style={{ backgroundColor: theme ? `rgb(${theme.glowPrimary})` : '#06b6d4' }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/30 pointer-events-none" />
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
};
