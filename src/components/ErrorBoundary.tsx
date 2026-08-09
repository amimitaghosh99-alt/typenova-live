import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in UI Component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-white/15 shadow-2xl flex flex-col items-center text-center relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-5 shadow-lg shadow-rose-950/30">
              <AlertTriangle size={28} />
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight mb-2 uppercase">
              Result Render Error
            </h2>
            <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
              An unexpected error occurred while rendering the results screen.
            </p>
            {this.state.error && (
              <div className="w-full text-left bg-black/50 p-3 rounded-lg border border-red-500/30 mb-6 overflow-auto max-h-48 text-[10px] text-red-300 font-mono">
                <div className="font-bold mb-1">{this.state.error.toString()}</div>
                <div className="whitespace-pre-wrap opacity-70">{this.state.error.stack}</div>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3.5 px-6 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> PLAY AGAIN / RETURN HOME
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
