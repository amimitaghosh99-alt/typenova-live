import React from 'react';

export interface LandingCardItem {
  id: string;
  title: string;
  category: string;
  badge: string;
  tagline: string;
  icon: string;
  bannerGradient: string;
  content: React.ReactNode;
}

export const LANDING_CARDS: Record<string, LandingCardItem> = {
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    category: 'Legal Protocol',
    badge: 'MIT Open Source',
    tagline: 'Last Updated: August 2026',
    icon: 'gavel',
    bannerGradient: 'from-cyan-950 via-slate-900 to-black',
    content: (
      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-sans">
        <p className="text-zinc-200">
          Welcome to <strong className="text-white">TypeNova</strong>. By accessing or using our platform, you agree to abide by these simple rules. If you do not agree, please stick to offline typing!
        </p>

        <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[1px] before:bg-white/10 ml-2">
          
          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-cyan-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-cyan-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#22d3ee]"></div>
            
            <div className="text-white font-semibold text-sm font-display tracking-wide mb-1 flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-[10px] opacity-70">01</span>
              Free &amp; Open Source
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
              TypeNova is a 100% free, open-source platform released under the <strong>MIT License</strong>. The software is provided &quot;as is&quot;, without warranty of any kind. You are free to view, fork, and modify the code on our GitHub repository.
            </p>
          </div>

          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-cyan-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-cyan-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#22d3ee]"></div>
            
            <div className="text-white font-semibold text-sm font-display tracking-wide mb-1 flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-[10px] opacity-70">02</span>
              Fair Play &amp; Competitive Integrity
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg mb-2">
              TypeNova features global leaderboards and ranked multiplayer modes. To maintain competitive integrity:
            </p>
            <ul className="list-disc list-outside text-xs text-zinc-400 space-y-1 ml-4 max-w-lg marker:text-zinc-600">
              <li>You may not use macros, bots, or automated scripts to artificially inflate your WPM or accuracy.</li>
              <li>Exploiting bugs to bypass the anti-cheat system or manipulate Elo ratings will result in a permanent ban.</li>
            </ul>
          </div>

          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-cyan-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-cyan-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#22d3ee]"></div>
            
            <div className="text-white font-semibold text-sm font-display tracking-wide mb-1 flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-[10px] opacity-70">03</span>
              Account Responsibility
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
              If you choose to sign in via Google, you are responsible for maintaining the security of your account. We reserve the right to suspend accounts that violate our fair play policies or attempt to disrupt the server infrastructure.
            </p>
          </div>

          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-cyan-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-cyan-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#22d3ee]"></div>
            
            <div className="text-white font-semibold text-sm font-display tracking-wide mb-1 flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-[10px] opacity-70">04</span>
              AI Features &amp; BYOK Policy
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
              When configuring custom AI API keys (Groq, Gemini, OpenAI) or Chrome Prompt API with our Smart Engine, your keys remain securely in your local storage and are never collected by TypeNova servers.
            </p>
          </div>

          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-cyan-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-cyan-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#22d3ee]"></div>
            
            <div className="text-white font-semibold text-sm font-display tracking-wide mb-1 flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-[10px] opacity-70">05</span>
              Limitation of Liability
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
              Under no circumstances shall the creators or contributors of TypeNova be held liable for any damages, data loss, or server downtime arising from your use of the platform.
            </p>
          </div>

        </div>

        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em] pt-6 pb-2 text-center">
          End of Line.
        </p>
      </div>
    )
  },

  privacy: {
    id: 'privacy',
    title: 'Privacy Protocol',
    category: 'Security Architecture',
    badge: 'Zero-Telemetry',
    tagline: 'Client-First Data Privacy',
    icon: 'shield_lock',
    bannerGradient: 'from-emerald-950 via-slate-900 to-black',
    content: (
      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-sans">
        <p className="text-zinc-200">
          TypeNova was engineered with a strict <strong>zero unnecessary telemetry</strong> philosophy. Your keystrokes and typing habits belong solely to you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="relative pl-4 border-l-2 border-emerald-500/30">
            <div className="text-emerald-400 font-semibold mb-1 text-xs font-mono uppercase tracking-wider">Local Keystroke Processing</div>
            <p className="text-zinc-400 text-xs">All WPM calculations, bursts, errors, and pacing curves are computed entirely on your client device.</p>
          </div>
          <div className="relative pl-4 border-l-2 border-emerald-500/30">
            <div className="text-emerald-400 font-semibold mb-1 text-xs font-mono uppercase tracking-wider">BYOK Vault Security</div>
            <p className="text-zinc-400 text-xs">Your personal AI API keys are stored in your browser's private LocalStorage and never relayed to third parties.</p>
          </div>
        </div>

        <div className="relative pl-4 border-l-2 border-white/10 mt-6 pt-1 pb-1">
          <h4 className="text-white font-semibold text-sm mb-3">What We Sync When Logged In:</h4>
          <ul className="list-disc list-outside text-xs text-zinc-400 space-y-2 ml-4 marker:text-zinc-600">
            <li>High scores, Elo rating, and leaderboard accuracy benchmarks.</li>
            <li>Unlocked RPG achievements, CyberHands customizations, and leveling progression.</li>
            <li>Custom saved typing themes and preferences.</li>
          </ul>
        </div>
      </div>
    )
  },

  status: {
    id: 'status',
    title: 'System Status',
    category: 'Telemetry & Health',
    badge: 'All Systems Operational',
    tagline: 'Global Infrastructure Metrics',
    icon: 'sensors',
    bannerGradient: 'from-blue-950 via-slate-900 to-black',
    content: (
      <div className="space-y-4 text-sm font-sans">
        <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[1px] before:bg-white/10 ml-2 mt-2">
          
          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-emerald-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-emerald-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#34d399] animate-pulse"></div>
            
            <div className="flex items-center justify-between gap-4 mb-1">
              <div className="text-white font-medium text-sm tracking-wide">Multiplayer Relay Engine</div>
              <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded-none bg-emerald-500/10 border border-emerald-500/20 shrink-0">99.98% Uptime</span>
            </div>
            <div className="text-zinc-500 text-xs font-mono">WebSocket low-latency cluster</div>
          </div>

          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-emerald-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-emerald-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#34d399] animate-pulse"></div>
            
            <div className="flex items-center justify-between gap-4 mb-1">
              <div className="text-white font-medium text-sm tracking-wide">Supabase Database &amp; Auth</div>
              <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded-none bg-emerald-500/10 border border-emerald-500/20 shrink-0">Operational</span>
            </div>
            <div className="text-zinc-500 text-xs font-mono">Row-level security synced</div>
          </div>

          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-cyan-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-cyan-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#22d3ee] animate-pulse"></div>
            
            <div className="flex items-center justify-between gap-4 mb-1">
              <div className="text-white font-medium text-sm tracking-wide">AI Inference Pipeline (Groq / Nano)</div>
              <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded-none bg-cyan-500/10 border border-cyan-500/20 shrink-0">&lt; 150ms P95</span>
            </div>
            <div className="text-zinc-500 text-xs font-mono">Local &amp; Edge Fallback Ready</div>
          </div>

        </div>
      </div>
    )
  },

  multiplayer: {
    id: 'multiplayer',
    title: 'Multiplayer Arena',
    category: 'Competitive Racing',
    badge: 'Ranked & Casual',
    tagline: 'Real-Time Synchronous Typing Battles',
    icon: 'group',
    bannerGradient: 'from-indigo-950 via-slate-900 to-black',
    content: (
      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-sans">
        <p>
          Challenge friends or matchmake with global typists in high-speed, synchronized typing races.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="relative pl-4 border-l-2 border-indigo-500/30">
            <div className="text-indigo-400 font-semibold text-xs font-mono uppercase tracking-wider mb-1">Ranked Elo Ladder</div>
            <p className="text-xs text-zinc-400">Compete in seasonal ranking tiers from Bronze to Grandmaster.</p>
          </div>
          <div className="relative pl-4 border-l-2 border-indigo-500/30">
            <div className="text-indigo-400 font-semibold text-xs font-mono uppercase tracking-wider mb-1">Custom Private Rooms</div>
            <p className="text-xs text-zinc-400">Generate 6-digit room codes to host custom speed tests with friends.</p>
          </div>
        </div>
      </div>
    )
  },

  coach: {
    id: 'coach',
    title: 'AI Coach (Aru)',
    category: 'Adaptive Intelligence',
    badge: 'Neural Engine 2.0',
    tagline: 'Zero-Latency Real-Time Analysis',
    icon: 'psychology',
    bannerGradient: 'from-cyan-950 via-slate-900 to-black',
    content: (
      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-sans">
        <p>
          Meet <strong className="text-white">Aru</strong>, your personal AI typing mentor capable of analyzing key-by-key hesitation metrics and fatigue pacing in real time.
        </p>
        
        <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[1px] before:bg-white/10 ml-2">
          
          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-cyan-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-cyan-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#22d3ee]"></div>
            
            <div className="text-white font-semibold text-sm font-display tracking-wide mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="text-cyan-400 font-mono text-[10px] opacity-70">01</span>
                Chrome Gemini Nano (Local NPU)
              </span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Chrome Dev / Canary</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
              Runs 100% locally on your machine with zero latency and no external API key required when using Chrome Dev/Canary with the experimental Prompt API flag enabled.
            </p>
          </div>

          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-teal-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-teal-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-teal-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#2dd4bf]"></div>
            
            <div className="text-white font-semibold text-sm font-display tracking-wide mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="text-teal-400 font-mono text-[10px] opacity-70">02</span>
                BYOK Cloud Gateway
              </span>
              <span className="text-[10px] text-teal-400 font-mono tracking-widest uppercase">Standard Browsers</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
              Not on Chrome Dev? Simply connect your own free API key (like Groq or OpenRouter) in Settings. Our offline Technician bot can even guide you step-by-step to grab a free key in 30 seconds.
            </p>
          </div>

          <div className="relative pl-10">
            <div className="absolute left-[11px] top-2 w-12 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
            <div className="absolute left-[11px] top-2 w-3 h-3 border border-cyan-400/30 rotate-45 translate-x-[-6px] translate-y-[-6px]"></div>
            <div className="absolute left-[11px] top-2 w-1 h-1 bg-cyan-400 rotate-45 translate-x-[-2px] translate-y-[-2px] shadow-[0_0_10px_#22d3ee]"></div>
            
            <div className="text-white font-semibold text-sm font-display tracking-wide mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="text-cyan-400 font-mono text-[10px] opacity-70">03</span>
                Adaptive Muscle Memory Drills
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
              Live keystroke latency tracking isolates your weakest character transitions (e.g. "tr", "qu") and dynamically generates targeted practice sentences to accelerate speed gains.
            </p>
          </div>

        </div>
      </div>
    )
  },

  academy: {
    id: 'academy',
    title: 'RPG Academy',
    category: 'Progression & Gear',
    badge: 'CyberHands System',
    tagline: 'Gamified Skill Trees & Loot',
    icon: 'school',
    bannerGradient: 'from-amber-950 via-slate-900 to-black',
    content: (
      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-sans">
        <p>
          Level up your typing career with RPG quests, gear unlocks, and cybernetic hand augmentations.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="relative pl-4 border-l-2 border-amber-500/30">
            <div className="text-amber-400 font-semibold text-xs font-mono uppercase tracking-wider mb-1">CyberHands Rig</div>
            <p className="text-xs text-zinc-400">Unlock visual skins, holographic gloves, and custom keycap particle strikes.</p>
          </div>
          <div className="relative pl-4 border-l-2 border-amber-500/30">
            <div className="text-amber-400 font-semibold text-xs font-mono uppercase tracking-wider mb-1">Daily Quests &amp; EXP</div>
            <p className="text-xs text-zinc-400">Complete speed trials to earn badges, rare titles, and leveling rewards.</p>
          </div>
        </div>
      </div>
    )
  },

  leaderboards: {
    id: 'leaderboards',
    title: 'Global Leaderboards',
    category: 'Hall of Fame',
    badge: 'Anti-Cheat Verified',
    tagline: 'Top Typists Worldwide',
    icon: 'military_tech',
    bannerGradient: 'from-yellow-950 via-slate-900 to-black',
    content: (
      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed font-sans">
        <p>
          Real-time global rankings categorized by test duration, raw WPM, burst speed, and consistency metrics.
        </p>
        <div className="relative pl-4 border-l-2 border-yellow-500/30 mt-4">
          <h4 className="text-yellow-400 font-semibold text-xs font-mono uppercase tracking-wider mb-2">Anti-Cheat Verification</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Every leaderboard entry undergoes algorithmic keystroke delta verification to prevent automated bots and macro injection.
          </p>
        </div>
      </div>
    )
  }
};
