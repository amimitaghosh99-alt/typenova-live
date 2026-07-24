import { X, Sparkles, Bug, Zap, PenTool } from 'lucide-react';
import { CHANGELOG } from '@/data/changelog';
import type { Theme } from '@/data/constants';

interface ChangelogModalProps {
  theme: Theme;
  onClose: () => void;
}

export function ChangelogModal({ theme, onClose }: ChangelogModalProps) {
  const getIconForType = (type: string) => {
    switch (type) {
      case 'feature': return <Sparkles size={14} className="text-emerald-400" />;
      case 'fix': return <Bug size={14} className="text-red-400" />;
      case 'perf': return <Zap size={14} className="text-amber-400" />;
      case 'tweak': return <PenTool size={14} className="text-sky-400" />;
      default: return null;
    }
  };

  const getLabelForType = (type: string) => {
    switch (type) {
      case 'feature': return 'NEW';
      case 'fix': return 'FIX';
      case 'perf': return 'FAST';
      case 'tweak': return 'TWEAK';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col lucid-scale" 
        style={{ '--delay': '0ms' } as React.CSSProperties} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-8 pb-6 border-b border-zinc-800/70">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-1">Update Log</h2>
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">What's new in TypeNova</p>
          </div>
          <button onClick={onClose} className="p-3 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all border border-white/5">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-8 pt-6 space-y-12">
          {CHANGELOG.map((release, i) => (
            <div key={release.version} className="relative">
              {i !== CHANGELOG.length - 1 && (
                <div className="absolute top-12 left-[19px] bottom-[-48px] w-0.5 bg-zinc-800/50" />
              )}
              
              <div className="flex gap-6 relative z-10">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-zinc-950 ${i === 0 ? theme.solid : 'bg-zinc-800'}`}>
                    {i === 0 ? <Zap size={16} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-zinc-600" />}
                  </div>
                </div>
                
                <div className="flex-1 pb-4">
                  <div className="flex items-baseline gap-3 mb-1">
                    <h3 className={`text-xl font-black uppercase tracking-widest ${i === 0 ? theme.text : 'text-white'}`}>
                      {release.version}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{release.date}</span>
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6">{release.title}</h4>
                  
                  <div className="space-y-4">
                    {release.changes.map((change, j) => (
                      <div key={j} className="flex gap-4">
                        <div className="flex flex-col items-center mt-0.5">
                          {getIconForType(change.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                              {getLabelForType(change.type)}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            {change.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
