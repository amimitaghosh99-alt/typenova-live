import { useState, useRef, useCallback, useEffect } from 'react';

export interface Particle {
  id: number;
  index: number;
  char: string;
  tx: string;
  ty: string;
  rot: string;
  color: string;
  expireAt: number;
}

export const useParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    };
  }, []);

  const spawnParticles = useCallback((
    charIndex: number,
    expectedChar: string,
    themeText: string,
    count: number = 3
  ) => {
    const now = Date.now();
    const newParticles: Particle[] = Array.from({ length: count }).map(() => ({
      id: Math.random(),
      index: charIndex,
      char: Math.random() > 0.5 ? expectedChar : ['+', '*', 'x', 'o', '.'][Math.floor(Math.random() * 5)],
      tx: (Math.random() - 0.5) * 150 + 'px',
      ty: (Math.random() - 1) * 150 + 'px',
      rot: (Math.random() - 0.5) * 360 + 'deg',
      color: [themeText, 'text-white', 'text-zinc-500'][Math.floor(Math.random() * 3)],
      expireAt: now + 600
    }));

    setParticles(prev => {
      // Lazily clean up expired particles during spawn to save state updates
      const active = prev.filter(p => p.expireAt > now);
      return [...active, ...newParticles];
    });

    // Schedule a single trailing cleanup for when the user stops typing
    if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    cleanupTimeoutRef.current = setTimeout(() => {
      setParticles(prev => prev.filter(p => p.expireAt > Date.now()));
    }, 650);
  }, []);

  const clearAll = useCallback(() => {
    if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    setParticles([]);
  }, []);

  return { particles, spawnParticles, clearAll };
};
