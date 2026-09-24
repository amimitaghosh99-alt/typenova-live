import { memo } from 'react';

interface TypeNovaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animated?: boolean;
  className?: string;
}

export const TypeNovaLogo = memo(function TypeNovaLogo({
  size = 'md',
  showText = true,
  animated: _animated = true,
  className = '',
}: TypeNovaLogoProps) {
  const iconDimensions = {
    sm: { w: 32, h: 32, textClass: 'text-xl tracking-tight' },
    md: { w: 42, h: 42, textClass: 'text-2xl tracking-tight' },
    lg: { w: 54, h: 54, textClass: 'text-3xl tracking-tighter' },
    xl: { w: 68, h: 68, textClass: 'text-4xl tracking-tighter' }
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none group cursor-pointer ${className}`}>
      {/* Emblem Anchor */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-[1.04] group-active:scale-[0.96]"
        style={{
          width: iconDimensions.w,
          height: iconDimensions.h,
        }}
      >
        {/* Soft Cosmic Ambient Aura Glow behind the glass */}
        <div
          className="absolute inset-0 pointer-events-none rounded-full transition-opacity duration-300 opacity-60 group-hover:opacity-100"
          style={{
            background: 'radial-gradient(circle, rgba(0, 240, 255, 0.45) 0%, rgba(0, 150, 255, 0.15) 50%, transparent 75%)',
            filter: 'blur(8px)',
          }}
        />

        {/* High-Resolution Transparent 3D Liquid Glass Emblem */}
        <img
          src="/logo.png"
          alt="TypeNova Logo"
          className="relative z-10 w-full h-full object-contain pointer-events-none drop-shadow-[0_4px_12px_rgba(0,240,255,0.35)] transition-all duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_4px_18px_rgba(0,240,255,0.55)]"
          draggable={false}
        />
      </div>

      {/* Futuristic Styled Typography */}
      {showText && (
        <div className={`font-display-lg ${iconDimensions.textClass} font-bold flex items-center leading-none tracking-tight select-none`}>
          <span className="text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.2)] transition-colors duration-200 group-hover:text-white">
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
