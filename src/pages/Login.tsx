import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { LogIn, Fingerprint, Keyboard, Sparkles, Orbit, Hexagon, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function Login() {
  const { session, authReady, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    if (authReady && session) {
      navigate('/');
    }
  }, [authReady, session, navigate]);

  const handleLogin = async () => {
    setIsSigningIn(true);
    await signInWithGoogle();
    // In case of error or failure to redirect, reset
    setTimeout(() => setIsSigningIn(false), 3000);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden text-white font-sans selection:bg-fuchsia-500/30">
      
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="absolute top-10 left-10 text-white/5 opacity-50"><Hexagon size={120} /></div>
      <div className="absolute bottom-20 right-20 text-white/5 opacity-50"><Orbit size={180} /></div>

      {/* Main Content */}
      <div className="z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out">
        
        {/* Logo */}
        <div className="flex items-center gap-4 mb-12">
          <Keyboard size={48} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
          <h1 className="text-5xl font-black tracking-[0.2em] uppercase">
            Type<span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]">Nova</span>
          </h1>
        </div>

        {/* Login Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 md:p-14 w-[90vw] max-w-md shadow-2xl flex flex-col items-center text-center">
            
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-inner relative">
               <Fingerprint size={36} className="text-zinc-400" />
               <Sparkles size={16} className="absolute top-2 right-2 text-fuchsia-400 animate-pulse" />
            </div>

            <h2 className="text-2xl font-black tracking-widest uppercase mb-3">Authenticate</h2>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-10 max-w-[250px]">
              Sign in for free to securely sync your stats, climb the leaderboards, and race friends.
            </p>

            <button
              onClick={handleLogin}
              disabled={isSigningIn}
              className="w-full relative group/btn overflow-hidden rounded-2xl p-[2px]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 opacity-70 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <div className="relative bg-zinc-950 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl transition-all duration-300 group-hover/btn:bg-zinc-900/50">
                {isSigningIn ? (
                  <Zap size={20} className="text-white animate-pulse" />
                ) : (
                  <LogIn size={20} className="text-white" />
                )}
                <span className="font-black tracking-widest uppercase text-sm">
                  {isSigningIn ? 'Connecting...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
            
            <button 
              onClick={() => {
                localStorage.setItem('guestMode', 'true');
                navigate('/');
              }}
              className="mt-6 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
