interface TypeNovaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animated?: boolean;
  className?: string;
  glow?: boolean;
}

export function TypeNovaLogo({
  size = 'md',
  showText = true,
  animated = true,
  className = '',
  glow = true
}: TypeNovaLogoProps) {
  // Dimension mapping
  const iconDimensions = {
    sm: { w: 26, h: 26, textClass: 'text-xl tracking-tight' },
    md: { w: 34, h: 34, textClass: 'text-2xl tracking-tight' },
    lg: { w: 44, h: 44, textClass: 'text-3xl tracking-tighter' },
    xl: { w: 56, h: 56, textClass: 'text-4xl tracking-tighter' }
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none group ${className}`}>
      {/* 3D Isometric Supernova Keycap SVG Emblem */}
      <div 
        className={`relative shrink-0 flex items-center justify-center transition-transform duration-300 ${
          animated ? 'group-hover:scale-105 group-hover:-translate-y-0.5' : ''
        }`}
        style={{ width: iconDimensions.w, height: iconDimensions.h }}
      >
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(0,240,255,0.25)]"
        >
          <defs>
            {/* Ambient Base Shadow */}
            <filter id="nova-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radiant Keycap Gradient Fills */}
            <linearGradient id="keyTopGrad" x1="20%" y1="10%" x2="80%" y2="90%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#080d1a" />
            </linearGradient>

            <linearGradient id="keyLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            <linearGradient id="keyRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#090d16" />
              <stop offset="100%" stopColor="#010308" />
            </linearGradient>

            {/* Neon Border Edge Gradients */}
            <linearGradient id="edgeCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7df4ff" />
              <stop offset="50%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#7df4ff" />
              <stop offset="100%" stopColor="#00f0ff" />
            </linearGradient>

            <radialGradient id="novaCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="40%" stopColor="#00f0ff" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#00f0ff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient Outer Ring/Aura */}
          {glow && (
            <circle cx="50" cy="50" r="38" fill="url(#novaCore)" opacity="0.45" />
          )}

          {/* 3D Isometric Keycap Base */}
          {/* Bottom Left Bevel Face */}
          <path 
            d="M 12 56 L 50 78 L 50 92 L 12 70 Z" 
            fill="url(#keyLeftGrad)" 
            stroke="rgba(255,255,255,0.08)" 
            strokeWidth="0.8"
          />

          {/* Bottom Right Bevel Face */}
          <path 
            d="M 50 78 L 88 56 L 88 70 L 50 92 Z" 
            fill="url(#keyRightGrad)" 
            stroke="rgba(255,255,255,0.08)" 
            strokeWidth="0.8"
          />

          {/* Top Isometric Keycap Face */}
          <path 
            d="M 50 16 L 88 38 L 50 60 L 12 38 Z" 
            fill="url(#keyTopGrad)" 
            stroke="url(#edgeCyan)" 
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Inner Inset Key Dish Highlight */}
          <path 
            d="M 50 25 L 76 40 L 50 54 L 24 40 Z" 
            fill="rgba(0, 240, 255, 0.04)" 
            stroke="rgba(125, 244, 255, 0.3)" 
            strokeWidth="1"
            strokeDasharray="1 1"
          />

          {/* Supernova Starburst Core */}
          <g transform="translate(50, 40)" filter="url(#nova-glow)">
            {/* Radiant Cross Flares */}
            <path 
              d="M 0 -15 Q 0 0 15 0 Q 0 0 0 15 Q 0 0 -15 0 Q 0 0 0 -15 Z" 
              fill="url(#starGrad)" 
              className={animated ? "transition-transform duration-700 group-hover:rotate-90 origin-center" : ""}
            />
            {/* Diagonal Star Sparkles */}
            <path 
              d="M -7 -7 Q 0 0 7 -7 Q 0 0 7 7 Q 0 0 -7 7 Q 0 0 -7 -7 Z" 
              fill="#ffffff" 
              opacity="0.9"
            />
            {/* Intense Center Particle */}
            <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
          </g>

          {/* Front Edge Light Sweep */}
          <path 
            d="M 12 38 L 50 60 L 88 38" 
            stroke="#7df4ff" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            opacity="0.9"
          />
        </svg>
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
}
