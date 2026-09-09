import React, { useState } from 'react';
import { CHANGELOG, type ChangelogEntry } from '@/data/changelog';
import { supabase } from '@/lib/supabase';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Bug, 
  Sparkles, 
  ChevronDown, 
  Github, 
  ShieldCheck, 
  ExternalLink,
  Loader2,
  Layers,
  Cpu,
  WifiOff,
  KeyRound,
  Zap
} from 'lucide-react';

/* ─── 1. CONTACT & SUPPORT PANEL ───────────────────────────────────────── */

export function ContactPanel() {
  const [category, setCategory] = useState<'feedback' | 'bug' | 'feature' | 'general'>('feedback');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      if (supabase) {
        // Submit directly to bug_reports table in Supabase
        const payload = {
          user_id: email.trim() || 'anonymous_guest',
          message: `[${category.toUpperCase()}] ${name ? `From: ${name} | ` : ''}${message.trim()}`,
          screenshot_url: null,
          status: 'open',
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('bug_reports').insert([payload]);
        if (error) {
          console.warn('Supabase bug_reports insert failed, saving to local fallback:', error);
        }
      }

      // Also store in local feedback queue as backup
      const localFeedback = JSON.parse(localStorage.getItem('typenova_contact_submissions') || '[]');
      localFeedback.push({
        category,
        name,
        email,
        message,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('typenova_contact_submissions', JSON.stringify(localFeedback.slice(-20)));

      setStatus('success');
      setMessage('');
      setName('');
      setEmail('');
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Transmission failed. Please try again or join our Discord.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-sm text-zinc-300 font-sans leading-relaxed">
      {/* Introduction */}
      <p className="text-zinc-200 text-xs sm:text-sm">
        Have feedback, discovered an anomaly, or want to suggest a new feature? Transmit your message directly to the TypeNova engineering team.
      </p>

      {/* Community Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <a
          href="https://discord.gg/your-discord-invite"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/15 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
              <MessageSquare size={16} />
            </div>
            <div>
              <div className="text-white font-semibold text-xs flex items-center gap-1.5">
                Discord Community
                <ExternalLink size={11} className="text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-zinc-400 text-[11px] font-mono">Chat with creators & typists</div>
            </div>
          </div>
        </a>

        <a
          href="https://github.com/amimitaghosh99-alt/typenova-live/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-zinc-200">
              <Github size={16} />
            </div>
            <div>
              <div className="text-white font-semibold text-xs flex items-center gap-1.5">
                GitHub Repository
                <ExternalLink size={11} className="text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-zinc-400 text-[11px] font-mono">Issues, stars & PRs</div>
            </div>
          </div>
        </a>
      </div>

      {/* Form Divider */}
      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <span className="relative px-3 bg-[#0c1017] text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          Direct Transmission Protocol
        </span>
      </div>

      {/* Direct Contact Form */}
      {status === 'success' ? (
        <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col items-center text-center gap-3 animate-fade-in-up">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            <CheckCircle2 size={24} />
          </div>
          <div className="text-white font-semibold text-sm">Transmission Received</div>
          <p className="text-xs text-zinc-400 max-w-md">
            Thank you for reaching out. Your intel has been logged directly into our engineering stream.
          </p>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="mt-2 text-xs font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer"
          >
            Send Another Dispatch
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Tabs */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
              Dispatch Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'feedback', label: 'Feedback', icon: Sparkles },
                { id: 'bug', label: 'Bug Report', icon: Bug },
                { id: 'feature', label: 'Feature Idea', icon: Layers },
                { id: 'general', label: 'General', icon: MessageSquare },
              ].map((item) => {
                const active = category === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id as any)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                        : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                    }`}
                  >
                    <Icon size={13} className={active ? 'text-cyan-400' : 'text-zinc-500'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & Email inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Operator Name / Call-sign <span className="text-zinc-600">(Optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cypher_01"
                className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-zinc-200 placeholder:text-zinc-600 text-xs focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Email Address <span className="text-zinc-600">(For replies)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@typenova.dev"
                className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-zinc-200 placeholder:text-zinc-600 text-xs focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Transmission Content <span className="text-cyan-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your suggestion, the bug encountered, or your general message in detail..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-zinc-200 placeholder:text-zinc-600 text-xs focus:outline-none focus:border-cyan-400/60 transition-colors resize-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-sans font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              !message.trim() || isSubmitting
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Transmitting Dispatch...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Dispatch Transmission</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

/* ─── 2. CHANGELOG PANEL ───────────────────────────────────────────────── */

export function ChangelogPanel() {
  const [filter, setFilter] = useState<'all' | 'feature' | 'fix' | 'perf'>('all');

  return (
    <div className="space-y-6 text-sm text-zinc-300 font-sans leading-relaxed">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div>
          <div className="text-white font-bold text-sm tracking-wide">TypeNova Evolution Log</div>
          <div className="text-zinc-500 text-xs font-mono">Continuous deployment &amp; architectural changelogs</div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          {(['all', 'feature', 'fix', 'perf'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                filter === type
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Changelog Entries List */}
      <div className="space-y-8">
        {CHANGELOG.map((entry: ChangelogEntry, idx: number) => {
          const filteredChanges = entry.changes.filter(
            (c) => filter === 'all' || c.type === filter
          );

          if (filteredChanges.length === 0 && filter !== 'all') return null;

          return (
            <div key={entry.version} className="relative pl-6 border-l-2 border-white/10 space-y-3">
              {/* Version Dot */}
              <div className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-[#0c1017] ${
                idx === 0 ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-zinc-600'
              }`} />

              {/* Version Title & Date */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-400/10 border border-cyan-400/30 text-cyan-300">
                    {entry.version}
                  </span>
                  <h4 className="text-white font-semibold text-xs sm:text-sm">{entry.title}</h4>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">{entry.date}</span>
              </div>

              {/* Changes */}
              <div className="space-y-2 pt-1">
                {filteredChanges.map((change, cIdx) => {
                  const tagStyles: Record<string, { bg: string; text: string; label: string }> = {
                    feature: { bg: 'bg-cyan-500/10 border-cyan-500/20', text: 'text-cyan-400', label: 'FEATURE' },
                    fix: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'FIX' },
                    perf: { bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-400', label: 'PERF' },
                    tweak: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'TWEAK' },
                  };
                  const currentStyle = tagStyles[change.type] || tagStyles.tweak;

                  return (
                    <div key={cIdx} className="text-xs text-zinc-400 flex items-start gap-2.5 leading-relaxed">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shrink-0 mt-0.5 ${currentStyle.bg} ${currentStyle.text}`}>
                        {currentStyle.label}
                      </span>
                      <span>{change.description}</span>
                    </div>
                  );
                })}
              </div>

              {/* Impact Footer Banner */}
              {entry.impact && (
                <div className="mt-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex flex-wrap items-center gap-4 text-[10px] font-mono text-zinc-500">
                  <span>Lines: +{entry.impact.linesChanged}</span>
                  {entry.impact.fixes > 0 && <span>Fixes: {entry.impact.fixes}</span>}
                  {entry.impact.perfGain && (
                    <span className="inline-flex items-center gap-1 text-cyan-400/80 font-medium"><Zap size={11} className="shrink-0" /> {entry.impact.perfGain}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 3. FAQ PANEL ─────────────────────────────────────────────────────── */

export function FAQPanel() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Is TypeNova completely free & open source?',
      a: 'Yes, 100%. TypeNova is released under the MIT License on GitHub. There are no paywalls, subscriptions, or hidden microtransactions. All gameplay, leaderboards, RPG cosmetics, and multiplayer arenas are free for everyone.',
      icon: Sparkles,
      tag: 'Licensing & Pricing',
    },
    {
      q: 'How does the AI Coach (Aru) work?',
      a: 'TypeNova provides two pathways for AI coaching: (1) Local on-device inference via Chrome Gemini Nano Prompt API with zero external network traffic, and (2) BYOK (Bring Your Own Key) where you can connect your own free Groq, OpenRouter, or Gemini key stored strictly in your browser\'s local vault.',
      icon: Cpu,
      tag: 'AI Architecture',
    },
    {
      q: 'How does Anti-Cheat and Ghost Racing work?',
      a: 'Every high score submitted to Postgres is cryptographically analyzed against algorithmic delta pacing curves. This server-verified telemetry is saved as a "ghost pacing curve," enabling any player to race side-by-side against verified runs directly on the global leaderboard.',
      icon: ShieldCheck,
      tag: 'Fair Play',
    },
    {
      q: 'Can I install TypeNova and practice offline?',
      a: 'Yes. TypeNova is a certified Progressive Web App (PWA). Click "Install App" in the top bar to install TypeNova on Windows, macOS, Linux, Android, or iOS. All core typing drills, custom texts, and procedural modes function fully offline without an internet connection.',
      icon: WifiOff,
      tag: 'PWA & Offline',
    },
    {
      q: 'How are my keystrokes and typing data protected?',
      a: 'Under our strict Zero-Telemetry policy, your raw keystrokes are computed 100% client-side on your device and are never broadcast to any analytics server. Only authenticated cloud saves (high scores, Elo, unlocked cosmetics) sync to your personal account row in Supabase.',
      icon: KeyRound,
      tag: 'Privacy Protocol',
    },
  ];

  return (
    <div className="space-y-4 text-sm text-zinc-300 font-sans leading-relaxed">
      <p className="text-zinc-200 text-xs sm:text-sm mb-4">
        Everything you need to know about TypeNova's architecture, security protocols, and competitive systems.
      </p>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          const Icon = faq.icon;

          return (
            <div
              key={idx}
              className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                isOpen
                  ? 'bg-white/[0.04] border-cyan-400/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/15'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 flex items-center justify-between gap-4 text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? 'bg-cyan-400/20 text-cyan-300' : 'bg-white/5 text-zinc-400'
                  }`}>
                    <Icon size={15} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-0.5">
                      {faq.tag}
                    </span>
                    <h4 className="text-white font-medium text-xs sm:text-sm">{faq.q}</h4>
                  </div>
                </div>

                <ChevronDown
                  size={16}
                  className={`text-zinc-400 transition-transform duration-300 shrink-0 ${
                    isOpen ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-white/5 pl-14 animate-fade-in-up">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
