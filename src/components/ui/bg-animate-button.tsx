import React from 'react';

interface BgAnimateButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

export const BgAnimateButton: React.FC<BgAnimateButtonProps> = ({
  children,
  active = false,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      className={`relative group overflow-hidden rounded-xl p-[2px] font-bold transition-all duration-300 focus:outline-none ${className}`}
    >
      {/* Animated Gradient Border */}
      <span className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,#00f2fe_0%,#4facfe_25%,#38bdf8_50%,#818cf8_75%,#00f2fe_100%)] animate-[spin_4s_linear_infinite] opacity-80 group-hover:opacity-100 transition-opacity" />
      
      {/* Glow Blur Effect */}
      <span className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,#00f2fe_0%,#38bdf8_50%,#00f2fe_100%)] animate-[spin_4s_linear_infinite] blur-md opacity-40 group-hover:opacity-90 transition-opacity" />

      {/* Inner Button Content */}
      <span
        className={`relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-[10px] w-full h-full text-xs transition-colors ${
          active
            ? 'bg-zinc-950/90 text-cyan-300 shadow-[inset_0_0_12px_rgba(6,182,212,0.4)] border border-cyan-400/40'
            : 'bg-zinc-950/90 text-zinc-200 group-hover:bg-zinc-900/90'
        }`}
      >
        {children}
      </span>
    </button>
  );
};

export default BgAnimateButton;
