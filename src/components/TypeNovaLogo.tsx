import { memo, useRef, useCallback, useEffect } from 'react';

interface TypeNovaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animated?: boolean;
  className?: string;
}

export const TypeNovaLogo = memo(function TypeNovaLogo({
  size = 'md',
  showText = true,
  animated = true,
  className = '',
}: TypeNovaLogoProps) {
  const iconDimensions = {
    sm: { w: 32, h: 32, textClass: 'text-xl tracking-tight' },
    md: { w: 42, h: 42, textClass: 'text-2xl tracking-tight' },
    lg: { w: 54, h: 54, textClass: 'text-3xl tracking-tighter' },
    xl: { w: 68, h: 68, textClass: 'text-4xl tracking-tighter' }
  }[size];

  const tiltRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);
  const isHovering = useRef(false);

  // ── 3D Magnetic Tilt (Zero lag, zero blur, direct GPU transforms) ──
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!animated || !tiltRef.current) return;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const el = tiltRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 220;

      if (dist > maxDist) {
        if (isHovering.current) {
          isHovering.current = false;
          el.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
          el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)';
        }
        return;
      }

      isHovering.current = true;
      el.style.transition = 'none';
      const strength = 1 - dist / maxDist;
      const maxAngle = 16;
      const ry = (dx / maxDist) * maxAngle * strength;
      const rx = -(dy / maxDist) * maxAngle * strength;
      const scale = 1 + strength * 0.08;

      el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(${Math.round(strength * 10)}px) scale(${scale.toFixed(3)})`;
    });
  }, [animated]);

  // ── Liquid Wobble on Click ────────────────────────────────────────
  const handleClick = useCallback(() => {
    const el = tiltRef.current;
    if (!animated || !el || el.classList.contains('logo-wobble')) return;
    el.classList.add('logo-wobble');
  }, [animated]);

  const handleAnimEnd = useCallback((e: React.AnimationEvent) => {
    if (e.animationName === 'logo-wobble') {
      tiltRef.current?.classList.remove('logo-wobble');
    }
  }, []);

  useEffect(() => {
    if (!animated) return;
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [animated, handleMouseMove]);

  return (
    <div className={`inline-flex items-center gap-3 select-none group ${className}`}>
      {/* Interactive 3D Anchor */}
      <div
        ref={tiltRef}
        onClick={handleClick}
        onAnimationEnd={handleAnimEnd}
        className="relative shrink-0 flex items-center justify-center cursor-pointer"
        style={{
          width: iconDimensions.w,
          height: iconDimensions.h,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'subpixel-antialiased',
        }}
      >
        {/* Soft Cosmic Ambient Aura Glow behind the glass (circular, non-rectangular) */}
        {animated && (
          <div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0, 240, 255, 0.45) 0%, rgba(0, 150, 255, 0.15) 50%, transparent 75%)',
              filter: 'blur(6px)',
              animation: 'logo-aura-pulse 3s ease-in-out infinite',
              transform: 'translateZ(-10px)',
            }}
          />
        )}

        {/* High-Resolution Transparent 3D Liquid Glass Emblem */}
        <img
          src="/logo.png"
          alt="TypeNova Logo"
          className="relative z-10 w-full h-full object-contain pointer-events-none drop-shadow-[0_4px_12px_rgba(0,240,255,0.35)] transition-all duration-300 group-hover:brightness-110"
          draggable={false}
          style={{
            transform: 'translateZ(5px)',
          }}
        />
      </div>

      {/* Futuristic Styled Typography */}
      {showText && (
        <div className={`font-display-lg ${iconDimensions.textClass} font-bold flex items-center leading-none tracking-tight select-none`}>
          <span className="text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.2)]">
            Type
          </span>
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,240,255,0.4)] ml-[1px]">
            Nova
          </span>
        </div>
      )}
    </div>
  );
});
