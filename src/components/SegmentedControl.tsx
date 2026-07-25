import React, { useRef, useState, useLayoutEffect } from 'react';
import { Lock } from 'lucide-react';

interface SegmentedControlProps<T extends string | number> {
  options: { label: React.ReactNode; value: T; locked?: boolean }[];
  value: T;
  onChange: (val: T) => void;
  onLockedClick?: (val: T) => void;
  disabled?: boolean;
  themeTextClass?: string;
  className?: string;
  pillClassName?: string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  onLockedClick,
  disabled,
  themeTextClass = 'text-white',
  className = '',
  pillClassName = 'bg-white/10 border border-white/10 shadow-[0_0_15px_currentColor]',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; height: number; top: number; opacity: number }>({ left: 0, width: 0, height: 0, top: 0, opacity: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      
      const activeIndex = options.findIndex(opt => opt.value === value);
      if (activeIndex === -1) return;

      const container = containerRef.current;
      // We skip the first child (the sliding pill) so button index is activeIndex + 1
      const button = container.children[activeIndex + 1] as HTMLElement;
      
      if (button) {
        setPillStyle({
          left: button.offsetLeft,
          top: button.offsetTop,
          width: button.offsetWidth,
          height: button.offsetHeight,
          opacity: 1,
        });
      }
    };

    measure();
    
    const resizeObserver = new ResizeObserver(measure);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', measure);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [value, options]);

  return (
    <div className={`relative flex flex-wrap p-1.5 rounded-full ${className}`} ref={containerRef}>
      {/* The sliding pill */}
      <div 
        className={`absolute rounded-full pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-0 ${pillClassName}`}
        style={{
          left: pillStyle.left,
          top: pillStyle.top,
          width: pillStyle.width,
          height: pillStyle.height,
          opacity: pillStyle.opacity,
          color: 'inherit' // allows the shadow-[0_0_15px_currentColor] to take the parent's color if needed
        }}
      >
        {/* We can apply the theme text class internally for the shadow */}
        <div className={`w-full h-full rounded-full ${themeTextClass}`} />
      </div>
      
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => {
              if (!disabled) {
                if (opt.locked && onLockedClick) {
                  onLockedClick(opt.value);
                } else if (!opt.locked) {
                  onChange(opt.value);
                }
              }
            }}
            disabled={disabled}
            className={`relative z-10 px-3 md:px-5 py-2.5 rounded-full text-[11px] font-black tracking-widest transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex justify-center items-center gap-2 ${
              isActive 
                ? `${themeTextClass} drop-shadow-md` 
                : opt.locked 
                  ? 'text-zinc-600 hover:text-zinc-400' 
                  : disabled 
                    ? 'text-zinc-500 cursor-not-allowed' 
                    : 'text-zinc-400 hover:text-white'
            }`}
          >
            {opt.locked && <Lock size={10} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
