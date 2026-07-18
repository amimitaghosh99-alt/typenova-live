import { useState, useRef, useCallback, useEffect } from 'react';

export interface Particle {
  id: number;
  index: number;
  char: string;
  tx: string;
  ty: string;
  rot: string;
  color: string;
}

export const useParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup all pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  const spawnParticles = useCallback((
    charIndex: number,
    expectedChar: string,
    themeText: string,
    count: number = 3
  ) => {
    const newParticles: Particle[] = Array.from({ length: count }).map(() => ({
      id: Math.random(),
      index: charIndex,
      char: Math.random() > 0.5 ? expectedChar : ['+', '*', 'x', 'o', '.'][Math.floor(Math.random() * 5)],
      tx: (Math.random() - 0.5) * 150 + 'px',
      ty: (Math.random() - 1) * 150 + 'px',
      rot: (Math.random() - 0.5) * 360 + 'deg',
      color: [themeText, 'text-white', 'text-zinc-500'][Math.floor(Math.random() * 3)]
    }));

    setParticles(prev => [...prev, ...newParticles]);

    const timeout = setTimeout(() => {
      setParticles(prev => {
        const idsToRemove = new Set(newParticles.map(p => p.id));
        return prev.filter(p => !idsToRemove.has(p.id));
      });
    }, 600);

    timeoutsRef.current.push(timeout);
  }, []);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setParticles([]);
  }, []);

  return { particles, spawnParticles, clearAll };
};
