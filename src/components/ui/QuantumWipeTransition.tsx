import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme } from '@/data/constants';

interface QuantumWipeTransitionProps {
  pageKey: string;
  theme?: Theme;
  pillarCount?: number;
}

export const QuantumWipeTransition: React.FC<QuantumWipeTransitionProps> = ({
  pageKey,
  theme,
  pillarCount = 6,
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
      }, 540);
      return () => clearTimeout(timer);
    }
  }, [pageKey]);

  const glowColor = theme ? `rgba(${theme.glowPrimary}, 0.85)` : 'rgba(6, 182, 212, 0.85)';
  const edgeColor = theme ? `rgb(${theme.glowPrimary})` : '#06b6d4';

  const pillars = Array.from({ length: pillarCount }, (_, i) => i);

  return (
    <AnimatePresence>
      {isWiping && (
        <div className="fixed inset-0 z-[250] pointer-events-none overflow-hidden">
          {/* ── 1. Laser Blade Leading Beam ── */}
          <motion.div
            initial={{ x: '-120%', opacity: 0 }}
            animate={{ 
              x: ['-120%', '130%', '130%'],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 0.48,
              ease: [0.76, 0, 0.24, 1],
              times: [0, 0.6, 1],
            }}
            className="absolute -top-[20%] -bottom-[20%] w-32 -skew-x-12 z-20 pointer-events-none blur-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${glowColor}, #ffffff, ${glowColor}, transparent)`,
              boxShadow: `0 0 50px 20px ${glowColor}`,
            }}
          />

          {/* ── 2. Slanted Cyber Shutter Pillars ── */}
          <div className="absolute inset-0 flex -skew-x-12 scale-125 origin-center">
            {pillars.map((index) => {
              const enterDelay = index * 0.032;

              return (
                <motion.div
                  key={index}
                  initial={{ x: '-105%' }}
                  animate={{ 
                    x: ['-105%', '0%', '0%', '105%'],
                  }}
                  transition={{
                    duration: 0.52,
                    times: [0, 0.44, 0.56, 1],
                    delay: enterDelay,
                    ease: [0.76, 0, 0.24, 1],
                  }}
                  className="flex-1 h-full relative border-r transform-gpu"
                  style={{
                    backgroundColor: '#090a0f',
                    borderColor: `${glowColor}`,
                    boxShadow: `inset 0 0 40px rgba(0,0,0,0.8), -1px 0 15px ${glowColor}`,
                  }}
                >
                  {/* Neon Leading Laser Edge */}
                  <div 
                    className="absolute top-0 right-0 bottom-0 w-[2px]"
                    style={{
                      backgroundColor: edgeColor,
                      boxShadow: `0 0 16px 2px ${glowColor}`,
                    }}
                  />

                  {/* High-Tech Shutter Micro Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/60 pointer-events-none" />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
