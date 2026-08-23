import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { motion, type Transition } from 'framer-motion';

interface AnimatedHeightProps {
  children: React.ReactNode;
  className?: string;
  expandDuration?: number;
  shrinkDuration?: number;
  transition?: Transition;
}

export const AnimatedHeight: React.FC<AnimatedHeightProps> = ({
  children,
  className = '',
  expandDuration = 0.55,
  shrinkDuration = 0.8,
  transition,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const prevHeightRef = useRef<number | 'auto'>('auto');
  const isInitialMount = useRef(true);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const newHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      if (newHeight > 0) {
        setHeight(newHeight);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isShrinking =
    typeof height === 'number' &&
    typeof prevHeightRef.current === 'number' &&
    height < prevHeightRef.current;

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isInitialMount.current && height !== 'auto') {
      isInitialMount.current = false;
      return;
    }
    if (prevHeightRef.current !== 'auto' && prevHeightRef.current !== height) {
      setIsAnimating(true);
    }
    prevHeightRef.current = height;
  }, [height]);

  // Dual-mode transition:
  // When shrinking: buttery-soft feathered landing with expo ease-out [0.16, 1, 0.3, 1]
  // When expanding: smooth cubic easeOut [0.16, 1, 0.3, 1]
  const defaultTransition: Transition = isInitialMount.current
    ? { duration: 0 }
    : isShrinking
    ? {
        duration: shrinkDuration,
        ease: [0.16, 1, 0.3, 1],
      }
    : {
        duration: expandDuration,
        ease: [0.16, 1, 0.3, 1],
      };

  return (
    <motion.div
      animate={{ height }}
      transition={transition || defaultTransition}
      onAnimationComplete={() => setIsAnimating(false)}
      className={`${isAnimating ? 'overflow-hidden' : 'overflow-visible'} will-change-[height] ${className}`}
    >
      <div ref={containerRef} className="w-full relative">
        {children}
      </div>
    </motion.div>
  );
};
