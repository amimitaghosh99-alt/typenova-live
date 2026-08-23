import React, { memo, useRef, useLayoutEffect, useEffect } from 'react';
import { Lock } from 'lucide-react';
import gsap from 'gsap';
import type { Theme } from '@/data/constants';

interface SegmentedControlProps<T extends string | number> {
  options: { label: React.ReactNode; value: T; locked?: boolean }[];
  value: T;
  onChange: (val: T) => void;
  onLockedClick?: (val: T) => void;
  disabled?: boolean;
  theme?: Theme;
  themeTextClass?: string;
  className?: string;
  pillClassName?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  bare?: boolean;
}

function SegmentedControlComponent<T extends string | number>({
  options,
  value,
  onChange,
  onLockedClick,
  disabled,
  theme,
  themeTextClass = 'text-white',
  className = '',
  pillClassName = '',
  fullWidth = false,
  size = 'md',
  bare = false,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useLayoutEffect(() => {
    if (!containerRef.current || !pillRef.current) return;

    const activeIndex = options.findIndex((opt) => opt.value === value);
    if (activeIndex === -1) {
      gsap.to(pillRef.current, { opacity: 0, duration: 0.15 });
      return;
    }

    const container = containerRef.current;
    // Child 0 is the pill, so button elements start at index 1
    const button = container.children[activeIndex + 1] as HTMLElement | undefined;
    if (!button) return;

    const targetLeft = button.offsetLeft;
    const targetTop = button.offsetTop;
    const targetWidth = button.offsetWidth;
    const targetHeight = button.offsetHeight;

    if (isInitialMount.current) {
      // Set instantly on mount without any animation or flicker
      gsap.set(pillRef.current, {
        x: targetLeft,
        y: targetTop,
        width: targetWidth,
        height: targetHeight,
        opacity: 1,
      });
      isInitialMount.current = false;
    } else {
      // Smooth, single-tween transition with power2.out
      gsap.killTweensOf(pillRef.current);
      gsap.to(pillRef.current, {
        x: targetLeft,
        y: targetTop,
        width: targetWidth,
        height: targetHeight,
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: true,
      });
    }
  }, [value, options]);

  // Recalculate on window resize only
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !pillRef.current) return;
      const activeIndex = options.findIndex((opt) => opt.value === value);
      if (activeIndex === -1) return;
      const button = containerRef.current.children[activeIndex + 1] as HTMLElement | undefined;
      if (!button) return;

      gsap.set(pillRef.current, {
        x: button.offsetLeft,
        y: button.offsetTop,
        width: button.offsetWidth,
        height: button.offsetHeight,
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [value, options]);

  const sizeClasses = {
    sm: 'p-1 text-[9px] gap-0.5',
    md: 'p-1.5 text-[11px] gap-1',
    lg: 'p-2 text-xs gap-1.5',
  }[size];

  const buttonPadding = {
    sm: 'px-3 py-1.5',
    md: 'px-4 py-2',
    lg: 'px-5 py-2.5',
  }[size];

  return (
    <div
      ref={containerRef}
      style={{ isolation: 'isolate' }}
      className={`relative inline-flex items-center rounded-full ${
        bare
          ? 'bg-transparent border-0 shadow-none'
          : 'glass-panel !bg-black/65 backdrop-blur-2xl border border-white/15 shadow-xl'
      } ${sizeClasses} ${className} ${
        fullWidth ? 'w-full flex' : ''
      }`}
    >
      {/* Liquid Glass Sliding Pill */}
      <div
        ref={pillRef}
        style={
          !pillClassName && theme
            ? {
                backgroundColor: `rgba(${theme.glowPrimary}, 0.22)`,
                borderColor: `rgba(${theme.glowPrimary}, 0.7)`,
                boxShadow: `0 0 25px rgba(${theme.glowPrimary}, 0.45), inset 0 0 12px rgba(${theme.glowPrimary}, 0.25)`,
              }
            : undefined
        }
        className={`absolute top-0 left-0 rounded-full pointer-events-none z-0 border will-change-transform ${
          pillClassName ||
          (!theme ? 'bg-cyan-400/25 border-cyan-400/70 shadow-[0_0_20px_rgba(0,219,231,0.4),inset_0_0_10px_rgba(0,219,231,0.25)]' : '')
        }`}
      />

      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
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
            style={
              isActive && theme
                ? {
                    color: `rgb(${theme.glowPrimary})`,
                    textShadow: `0 0 14px rgba(${theme.glowPrimary}, 0.8), 0 1px 2px rgba(0,0,0,0.9)`,
                  }
                : undefined
            }
            className={`relative z-10 ${buttonPadding} rounded-full font-black tracking-widest transition-colors duration-200 select-none flex justify-center items-center gap-1.5 cursor-pointer ${
              fullWidth ? 'flex-1' : ''
            } ${
              isActive
                ? `${themeTextClass} drop-shadow-md`
                : opt.locked
                ? 'text-zinc-600 hover:text-zinc-400 cursor-not-allowed'
                : disabled
                ? 'text-zinc-600 cursor-not-allowed'
                : 'text-zinc-300 hover:text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]'
            }`}
          >
            {opt.locked && <Lock size={11} className="shrink-0" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const SegmentedControl = memo(
  SegmentedControlComponent,
  (prevProps, nextProps) => {
    if (
      prevProps.value !== nextProps.value ||
      prevProps.disabled !== nextProps.disabled ||
      prevProps.bare !== nextProps.bare ||
      prevProps.theme?.name !== nextProps.theme?.name ||
      prevProps.theme?.glowPrimary !== nextProps.theme?.glowPrimary ||
      prevProps.themeTextClass !== nextProps.themeTextClass ||
      prevProps.className !== nextProps.className ||
      prevProps.pillClassName !== nextProps.pillClassName ||
      prevProps.fullWidth !== nextProps.fullWidth ||
      prevProps.size !== nextProps.size ||
      prevProps.onChange !== nextProps.onChange ||
      prevProps.onLockedClick !== nextProps.onLockedClick
    ) {
      return false;
    }
    if (prevProps.options === nextProps.options) return true;
    if (prevProps.options.length !== nextProps.options.length) return false;
    return prevProps.options.every(
      (opt, idx) =>
        opt.value === nextProps.options[idx].value &&
        opt.label === nextProps.options[idx].label &&
        opt.locked === nextProps.options[idx].locked
    );
  }
) as typeof SegmentedControlComponent;
