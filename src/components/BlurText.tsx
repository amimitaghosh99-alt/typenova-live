import React, { useRef, useMemo } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  onAnimationComplete?: () => void;
}

export const BlurText = React.memo(({
  text,
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  onAnimationComplete,
}: BlurTextProps) => {
  const elements = useMemo(
    () => (animateBy === 'words' ? text.split(' ') : text.split('')),
    [text, animateBy]
  );
  const containerRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: threshold });

  const containerVariants: Variants = useMemo(() => ({
    hidden: {},
    visible: {
      transition: {
        staggerChildren: delay / 1000,
      },
    },
  }), [delay]);

  const yOffset = direction === 'top' ? -25 : 25;

  const itemVariants: Variants = useMemo(() => ({
    hidden: {
      opacity: 0,
      filter: 'blur(10px)',
      y: yOffset,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  }), [yOffset]);

  return (
    <motion.span
      ref={containerRef}
      className={`inline-flex flex-wrap ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      onAnimationComplete={onAnimationComplete}
    >
      {elements.map((elem, index) => (
        <motion.span
          key={index}
          variants={itemVariants}
          className="inline-block transition-transform will-change-[transform,filter,opacity]"
        >
          {elem === ' ' ? '\u00A0' : elem}
          {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </motion.span>
  );
});

BlurText.displayName = 'BlurText';
