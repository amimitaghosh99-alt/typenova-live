import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { KineticKeyboard } from '@/components/KineticKeyboard';
import { ExpandableInfoModal } from '@/components/ExpandableInfoModal';
import { TypeNovaLogo } from '@/components/TypeNovaLogo';
import { BlurText } from '@/components/BlurText';
import { recordConsent, revokeConsent, hasValidConsent } from '@/lib/consent';
import { CHANGELOG } from '@/data/changelog';
import { Download, MessageSquare, ArrowUpRight } from 'lucide-react';

export function Login() {
  const { session, authReady, signInWithGoogle } = useAuth();
  const { isInstallable, installApp } = usePWAInstall();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [hasAgreed, setHasAgreed] = useState<boolean>(() => hasValidConsent());
  
  useEffect(() => {
    if (authReady && session) {
      navigate('/');
    }
  }, [authReady, session, navigate]);

  const handleLogin = async () => {
    if (isSigningIn) return;
    if (!hasAgreed) {
      setHasAgreed(true);
      recordConsent('hero_checkbox');
    }
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (result?.error) {
        console.warn('[Login] OAuth error:', result.error);
        setIsSigningIn(false);
      }
      setTimeout(() => setIsSigningIn(false), 8000);
    } catch {
      setIsSigningIn(false);
    }
  };

  const handleGuest = () => {
    if (!hasAgreed) {
      setHasAgreed(true);
      recordConsent('hero_checkbox');
    }
    localStorage.setItem('guestMode', 'true');
    navigate('/');
  };

  const openCard = (id: string) => {
    setIsMobileMenuOpen(false);
    setActiveCardId(id);
  };

  const handleModalClose = () => {
    setActiveCardId(null);
    // Sync acceptance state from localStorage if user accepted inside modal
    if (localStorage.getItem('typenova_terms_accepted') === 'true') {
      setHasAgreed(true);
    }
  };

  return (
    <div 
      className="fixed inset-0 w-screen h-screen overflow-hidden text-on-background bg-[#080809] font-body-md text-body-md antialiased dark flex flex-col justify-between"
      style={{ backgroundColor: '#080809' }}
    >

      {/* Expandable Aceternity Card Modal */}
      <ExpandableInfoModal 
        activeId={activeCardId} 
        onClose={handleModalClose} 
      />
      
      {/* Top Navigation */}
      <header className="w-full bg-[#080809]/60 backdrop-blur-2xl z-50 border-b border-white/5 hidden md:flex justify-between items-center px-6 lg:px-12 py-4 shrink-0 transition-all duration-300">
        <div className="flex items-center gap-3 select-none">
          <TypeNovaLogo size="md" />
        </div>
        <nav className="flex gap-6 lg:gap-8 items-center font-label-mono text-label-mono z-50">
          <button 
            onClick={() => openCard('multiplayer')} 
            className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide cursor-pointer focus:outline-none text-xs"
          >
            Multiplayer
          </button>
          <button 
            onClick={() => openCard('coach')} 
            className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide cursor-pointer focus:outline-none text-xs"
          >
            AI Coach
          </button>
          <button 
            onClick={() => openCard('academy')} 
            className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide cursor-pointer focus:outline-none text-xs"
          >
            RPG Academy
          </button>
          <button 
            onClick={() => openCard('leaderboards')} 
            className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide cursor-pointer focus:outline-none text-xs"
          >
            Leaderboards
          </button>
          <button 
            onClick={() => openCard('changelog')} 
            className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide cursor-pointer focus:outline-none text-xs"
          >
            Changelog
          </button>
          <button 
            onClick={() => openCard('contact')} 
            className="text-cyan-400 hover:text-cyan-300 transition-all duration-300 tracking-wide cursor-pointer focus:outline-none text-xs flex items-center gap-1.5 font-semibold"
          >
            <MessageSquare size={13} />
            <span>Contact</span>
          </button>
        </nav>
        <div className="hidden md:flex items-center gap-3 z-50">
          {isInstallable && (
            <button
              onClick={installApp}
              className="flex items-center gap-2 font-label-mono text-xs text-primary-fixed hover:text-white transition-all border border-cyan-400/40 hover:border-cyan-400 px-3.5 py-1.5 rounded-full backdrop-blur-md bg-cyan-400/10 hover:bg-cyan-400/20 shadow-[0_0_15px_rgba(0,219,233,0.2)] group cursor-pointer"
            >
              <Download size={13} className="text-cyan-400 group-hover:-translate-y-0.5 transition-transform" />
              <span className="font-semibold tracking-wide uppercase text-[11px]">Install</span>
            </button>
          )}
          <a 
            href="https://github.com/amimitaghosh99-alt/typenova-live" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-label-mono text-xs text-secondary-fixed hover:text-white transition-all border border-secondary-fixed/30 hover:border-secondary-fixed/60 px-3.5 py-1.5 rounded-full backdrop-blur-md bg-secondary-fixed/5 hover:bg-secondary-fixed/15 shadow-[0_0_15px_rgba(125,244,255,0.15)] group"
          >
            <svg className="w-3.5 h-3.5 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="font-semibold tracking-wide text-[11px]">GitHub</span>
            <span className="text-secondary-fixed/60 font-normal">★</span>
          </a>
        </div>
      </header>

      {/* Mobile Top Navigation */}
      <header className="md:hidden w-full bg-[#080809]/60 backdrop-blur-2xl z-50 border-b border-white/5 px-5 py-4 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 select-none">
            <TypeNovaLogo size="sm" />
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-on-surface hover:text-white transition-colors p-1">
            <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
        {isMobileMenuOpen && (
          <nav className="flex flex-col gap-4 items-center font-label-mono text-label-mono w-full mt-4 pt-4 border-t border-white/10 animate-fade-in-up">
            <button onClick={() => openCard('multiplayer')} className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide text-xs">Multiplayer</button>
            <button onClick={() => openCard('coach')} className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide text-xs">AI Coach</button>
            <button onClick={() => openCard('academy')} className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide text-xs">RPG Academy</button>
            <button onClick={() => openCard('leaderboards')} className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide text-xs">Leaderboards</button>
            <button onClick={() => openCard('changelog')} className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide text-xs">Changelog</button>
            <button onClick={() => openCard('contact')} className="text-cyan-400 hover:text-white transition-all duration-300 tracking-wide text-xs font-semibold">Contact &amp; Support</button>
            <button onClick={() => openCard('faq')} className="text-on-surface-variant hover:text-white transition-all duration-300 tracking-wide text-xs">FAQ</button>
            {isInstallable && (
              <button onClick={() => { setIsMobileMenuOpen(false); installApp(); }} className="text-cyan-400 hover:text-white transition-all duration-300 tracking-wide flex items-center gap-2 font-semibold uppercase text-xs">
                <Download size={14} />
                <span>Install App</span>
              </button>
            )}
            <a className="text-secondary-fixed hover:text-white transition-all duration-300 tracking-wide flex items-center gap-2 font-semibold text-xs" href="https://github.com/amimitaghosh99-alt/typenova-live" target="_blank" rel="noreferrer">
              <span>★ Star on GitHub</span>
            </a>
          </nav>
        )}
      </header>


      {/* Main Hero Section */}
      <main className="flex-1 relative flex items-center justify-center px-6 md:px-16 z-10">
        <section className="flex flex-col items-center justify-center text-center w-full relative">
          
          {/* 3D Kinetic Keyboard positioned directly in hero */}
          <KineticKeyboard />

          <div className="relative z-10 flex flex-col items-center max-w-5xl">
            {/* Double-Bezel Hardware Version Capsule */}
            <button 
              type="button"
              onClick={() => openCard('changelog')} 
              className="relative p-[1px] rounded-full bg-gradient-to-r from-cyan-500/30 via-white/10 to-indigo-500/20 hover:from-cyan-400/60 hover:via-white/20 hover:to-indigo-400/40 shadow-[0_0_20px_rgba(0,219,233,0.15)] hover:shadow-[0_0_35px_rgba(0,219,233,0.3)] transition-all duration-500 cursor-pointer group mb-8 opacity-0 animate-fade-in-up delay-100"
              title="Click to view full Changelog & Version History"
            >
              <div className="px-4 py-1.5 rounded-full bg-[#080b11]/90 backdrop-blur-xl flex items-center gap-3 select-none">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                </span>
                <span className="font-label-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  System Online <strong className="text-white font-bold">{CHANGELOG[0]?.version || 'v2.8.0'}</strong>
                </span>
                <span className="w-px h-3 bg-white/15" />
                <span className="font-label-mono text-[11px] uppercase tracking-wider text-cyan-400/90 group-hover:text-cyan-300 flex items-center gap-1.5">
                  Changelog
                  <div className="w-4 h-4 rounded-full bg-white/5 group-hover:bg-cyan-400/10 border border-white/10 group-hover:border-cyan-400/30 flex items-center justify-center transition-all">
                    <ArrowUpRight size={10} className="text-zinc-400 group-hover:text-cyan-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </span>
              </div>
            </button>

            <h1 className="font-display-lg text-headline-xl-mobile md:text-[84px] text-white max-w-5xl leading-[1.05] tracking-tighter text-glow-premium drop-shadow-[0_8px_32px_rgba(0,0,0,0.9)] [text-shadow:_0_4px_24px_rgba(0,0,0,0.95)] flex flex-col items-center justify-center text-center">
              <BlurText text="The Next-Gen" delay={45} className="inline-flex justify-center" />
              <BlurText text="Gamified Typing Platform" delay={45} className="inline-flex justify-center mt-1" />
            </h1>
            <p className="font-body-lg text-xl text-on-surface-variant max-w-3xl mt-6 leading-relaxed font-light opacity-0 animate-fade-in-up delay-300 drop-shadow-md">
              100% Free &amp; Open Source. Engineered for speed. Train with elite AI, compete globally, and upgrade your CyberHands in an uncompromising, high-fidelity environment.
            </p>

            {/* Action Buttons Section */}
            <div className="flex flex-col sm:flex-row items-center gap-5 mt-10 w-full max-w-2xl justify-center opacity-0 animate-fade-in-up delay-400">
              {/* Ultra-Premium Radiant Google Sign-In Button */}
              <button 
                onClick={handleLogin} 
                disabled={isSigningIn} 
                className="relative group p-[1px] rounded-2xl overflow-hidden transition-all duration-500 z-50 hover:scale-[1.03] active:scale-[0.98] shadow-[0_0_35px_rgba(0,240,255,0.35),0_0_80px_rgba(0,240,255,0.15)] hover:shadow-[0_0_60px_rgba(0,240,255,0.6),0_0_100px_rgba(0,240,255,0.3)] cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {/* Luminous Animated Border Gradient */}
                <div className="absolute inset-0 transition-all duration-500 bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 opacity-90 group-hover:opacity-100 animate-pulse-subtle"></div>
                
                {/* Inner Core Surface */}
                <div className="relative px-7 py-3.5 rounded-[15px] backdrop-blur-xl flex items-center justify-center gap-3 transition-colors duration-300 bg-[#090d14]/90 group-hover:bg-[#0c121e]/80 text-white">
                  <svg className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="font-sans font-semibold text-[15px] tracking-tight">
                    {isSigningIn ? 'Authenticating...' : 'Sign in with Google'}
                  </span>
                  <span className="material-symbols-outlined text-lg transition-transform duration-300 text-cyan-300 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </button>

              {/* Ultra-Premium Frosted Obsidian Guest Button */}
              <button 
                onClick={handleGuest} 
                className="relative group px-7 py-3.5 rounded-2xl backdrop-blur-xl border transition-all duration-300 flex items-center justify-center gap-3 z-50 bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.12] hover:border-white/[0.28] hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl transition-colors duration-300 text-zinc-400 group-hover:text-cyan-300">
                  sports_esports
                </span>
                <span className="font-sans font-medium text-[15px] tracking-tight transition-colors duration-300 text-zinc-200 group-hover:text-white">
                  Play as Guest
                </span>
              </button>
            </div>

            {/* Agreement Checkbox Row directly under the buttons */}
            <div className="flex items-center justify-center gap-2.5 mt-5 opacity-0 animate-fade-in-up delay-500 z-50">
              <input 
                type="checkbox" 
                id="hero-agree-checkbox"
                checked={hasAgreed}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasAgreed(checked);
                  if (checked) {
                    recordConsent('hero_checkbox');
                  } else {
                    revokeConsent();
                  }
                }}
                className="w-4 h-4 rounded border border-white/30 bg-black/40 text-cyan-400 focus:ring-cyan-400 focus:ring-offset-black accent-cyan-400 cursor-pointer transition-all hover:border-cyan-400"
              />
              <label htmlFor="hero-agree-checkbox" className="text-xs text-zinc-400 select-none cursor-pointer font-sans">
                I agree to the{' '}
                <button 
                  type="button" 
                  onClick={() => openCard('terms')} 
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium cursor-pointer transition-colors"
                >
                  Terms of Service
                </button>
                {' '}&amp;{' '}
                <button 
                  type="button" 
                  onClick={() => openCard('privacy')} 
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium cursor-pointer transition-colors"
                >
                  Privacy Protocol
                </button>
              </label>
            </div>
          </div>
        </section>
      </main>


      {/* Footer */}
      <footer className="w-full bg-transparent border-t border-white/5 flex flex-col md:flex-row justify-between items-center px-6 lg:px-12 py-5 gap-4 z-10 backdrop-blur-sm shrink-0">
        <div className="font-label-mono text-label-caps text-on-surface-variant text-xs opacity-70 hover:opacity-100 transition-opacity tracking-widest text-center flex items-center gap-2">
          <span>© {new Date().getFullYear()} TYPENOVA</span>
          <span className="text-white/20">•</span>
          <span>MIT LICENSE</span>
          <span className="text-white/20">•</span>
          <button onClick={() => openCard('changelog')} className="text-secondary-fixed hover:underline cursor-pointer">
            {CHANGELOG[0]?.version || 'v2.8.0'}
          </button>
        </div>
        <nav className="flex flex-wrap justify-center items-center gap-5 lg:gap-7 font-label-mono text-label-caps tracking-wider relative z-50 text-xs">
          <button 
            onClick={() => openCard('contact')} 
            className="text-cyan-400 hover:text-white transition-colors cursor-pointer focus:outline-none flex items-center gap-1 font-semibold"
          >
            <MessageSquare size={12} />
            <span>Contact &amp; Support</span>
          </button>
          <button 
            onClick={() => openCard('faq')} 
            className="text-on-surface-variant hover:text-white transition-colors cursor-pointer focus:outline-none"
          >
            FAQ
          </button>
          <button 
            onClick={() => openCard('changelog')} 
            className="text-on-surface-variant hover:text-white transition-colors cursor-pointer focus:outline-none"
          >
            Changelog
          </button>
          <button 
            onClick={() => openCard('status')} 
            className="text-on-surface-variant hover:text-white transition-colors cursor-pointer focus:outline-none"
          >
            Status
          </button>
          <button 
            onClick={() => openCard('terms')} 
            className="text-on-surface-variant hover:text-white transition-colors cursor-pointer focus:outline-none"
          >
            Terms
          </button>
          <button 
            onClick={() => openCard('privacy')} 
            className="text-on-surface-variant hover:text-white transition-colors cursor-pointer focus:outline-none"
          >
            Privacy
          </button>
          <a 
            className="text-secondary-fixed hover:text-white transition-colors flex items-center gap-1 font-medium" 
            href="https://github.com/amimitaghosh99-alt/typenova-live" 
            target="_blank" 
            rel="noreferrer"
          >
            <span>★</span> Star
          </a>
        </nav>
      </footer>
    </div>
  );
}

