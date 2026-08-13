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

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <span className="text-cyan-400 font-mono">01.</span> Free &amp; Open Source
          </h4>
          <p className="text-zinc-400 text-xs leading-normal">
            TypeNova is a 100% free, open-source platform released under the <strong>MIT License</strong>. The software is provided &quot;as is&quot;, without warranty of any kind. You are free to view, fork, and modify the code on our GitHub repository.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <span className="text-cyan-400 font-mono">02.</span> Fair Play &amp; Competitive Integrity
          </h4>
          <p className="text-zinc-400 text-xs leading-normal">
            TypeNova features global leaderboards and ranked multiplayer modes. To maintain competitive integrity:
          </p>
          <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1 ml-2">
            <li>You may not use macros, bots, or automated scripts to artificially inflate your WPM or accuracy.</li>
            <li>Exploiting bugs to bypass the anti-cheat system or manipulate Elo ratings will result in a permanent ban from the leaderboards.</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <span className="text-cyan-400 font-mono">03.</span> Account Responsibility
          </h4>
          <p className="text-zinc-400 text-xs leading-normal">
            If you choose to sign in via Google, you are responsible for maintaining the security of your account. We reserve the right to suspend accounts that violate our fair play policies or attempt to disrupt the server infrastructure.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <span className="text-cyan-400 font-mono">04.</span> AI Features &amp; BYOK Policy
          </h4>
          <p className="text-zinc-400 text-xs leading-normal">
            When configuring custom AI API keys (Groq, Gemini, OpenAI) or Chrome Prompt API with our Smart Engine, your keys remain securely in your local storage and are never collected by TypeNova servers.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <span className="text-cyan-400 font-mono">05.</span> Limitation of Liability
          </h4>
          <p className="text-zinc-400 text-xs leading-normal">
            Under no circumstances shall the creators or contributors of TypeNova be held liable for any damages, data loss, or server downtime arising from your use of the platform.
          </p>
        </div>

        <p className="text-xs font-mono text-zinc-500 italic pt-2 text-center">
          *End of Line.*
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-emerald-400 font-semibold mb-1 text-xs font-mono uppercase tracking-wider">Local Keystroke Processing</div>
            <p className="text-zinc-400 text-xs">All WPM calculations, bursts, errors, and pacing curves are computed entirely on your client device.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-emerald-400 font-semibold mb-1 text-xs font-mono uppercase tracking-wider">BYOK Vault Security</div>
            <p className="text-zinc-400 text-xs">Your personal AI API keys are stored in your browser's private LocalStorage and never relayed to third parties.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <h4 className="text-white font-semibold">What We Sync When Logged In:</h4>
          <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1">
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
        <div className="grid grid-cols-1 gap-2.5">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
              <div>
                <div className="text-white font-medium text-xs">Multiplayer Relay Engine</div>
                <div className="text-zinc-500 text-[11px] font-mono">WebSocket low-latency cluster</div>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">99.98% Uptime</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
              <div>
                <div className="text-white font-medium text-xs">Supabase Database &amp; Auth</div>
                <div className="text-zinc-500 text-[11px] font-mono">Row-level security synced</div>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Operational</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"></span>
              <div>
                <div className="text-white font-medium text-xs">AI Inference Pipeline (Groq / Nano)</div>
                <div className="text-zinc-500 text-[11px] font-mono">Local &amp; Edge Fallback Ready</div>
              </div>
            </div>
            <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">&lt; 150ms P95</span>
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
      <div className="space-y-4 text-sm text-zinc-300 leading-relaxed font-sans">
        <p>
          Challenge friends or matchmake with global typists in high-speed, synchronized typing races.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-cyan-400 font-semibold text-xs font-mono mb-1">Ranked Elo Ladder</div>
            <p className="text-xs text-zinc-400">Compete in seasonal ranking tiers from Bronze to Grandmaster.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-cyan-400 font-semibold text-xs font-mono mb-1">Custom Private Rooms</div>
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
    bannerGradient: 'from-purple-950 via-slate-900 to-black',
    content: (
      <div className="space-y-4 text-sm text-zinc-300 leading-relaxed font-sans">
        <p>
          Meet <strong>Aru</strong>, your personal AI typing mentor capable of analyzing key-by-key hesitation metrics.
        </p>
        <div className="space-y-2.5">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-purple-300 font-semibold text-xs font-mono mb-1">Chrome Gemini Nano Integration</div>
            <p className="text-xs text-zinc-400">Runs 100% locally in your browser with zero latency without requiring an external API key.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-purple-300 font-semibold text-xs font-mono mb-1">Adaptive Drill Generation</div>
            <p className="text-xs text-zinc-400">Identifies your weak bigrams (e.g. &quot;tr&quot;, &quot;qu&quot;) and dynamically generates targeted practice passages.</p>
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
      <div className="space-y-4 text-sm text-zinc-300 leading-relaxed font-sans">
        <p>
          Level up your typing career with RPG quests, gear unlocks, and cybernetic hand augmentations.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-amber-400 font-semibold text-xs font-mono mb-1">CyberHands Rig</div>
            <p className="text-xs text-zinc-400">Unlock visual skins, holographic gloves, and custom keycap particle strikes.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-amber-400 font-semibold text-xs font-mono mb-1">Daily Quests &amp; EXP</div>
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
      <div className="space-y-4 text-sm text-zinc-300 leading-relaxed font-sans">
        <p>
          Real-time global rankings categorized by test duration, raw WPM, burst speed, and consistency metrics.
        </p>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <h4 className="text-white font-semibold text-xs font-mono uppercase tracking-wider text-yellow-400">Anti-Cheat Verification</h4>
          <p className="text-xs text-zinc-400">
            Every leaderboard entry undergoes algorithmic keystroke delta verification to prevent automated bots and macro injection.
          </p>
        </div>
      </div>
    )
  }
};
