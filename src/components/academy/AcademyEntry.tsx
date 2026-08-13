import { memo } from 'react';
import { GraduationCap } from 'lucide-react';

interface AcademyEntryProps {
  onClick: () => void;
}

export const AcademyEntry = memo(function AcademyEntry({ onClick }: AcademyEntryProps) {
  return (
    <button
      onClick={onClick}
      className="relative group flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/25 text-amber-400 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:shadow-[0_0_28px_rgba(245,158,11,0.25)] hover:border-amber-400/50 hover:bg-amber-500/[0.13] hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      {/* Subtle inner glow on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-400/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative bg-amber-500/20 p-1.5 rounded-lg border border-amber-400/20 group-hover:border-amber-400/40 transition-colors">
        <GraduationCap size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
      </div>

      <div className="relative flex flex-col items-start text-left">
        <span className="text-[8px] font-black text-amber-500/60 tracking-[0.25em] uppercase leading-none mb-0.5">New to typing?</span>
        <span className="font-black text-[11px] tracking-widest uppercase leading-none text-amber-300 group-hover:text-amber-200 transition-colors">
          Academy
        </span>
      </div>
    </button>
  );
});
