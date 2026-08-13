import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, Bot, Sparkles, Square, Copy, Check, Trash2, Target, KeyRound, RotateCcw, Wrench, AlertTriangle, Settings, ChevronDown, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import { chatCompletion, MissingKeyError, hasAIKey, hasNativeAI, PROVIDER_PRESETS, type ChatMessage } from '@/lib/aiClient';
import { useSmartEngineConfig } from '@/hooks/useSmartEngineConfig';
import LaserFlow from '@/components/LaserFlow';
import { SupportTechnician } from '@/components/SupportTechnician';
import type { Theme } from '@/data/constants';

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  role: Role;
  content: string;
  /** Locally-generated failure notice — shown to the user, never sent to the model. */
  isError?: boolean;
}

export interface AruWeakKey {
  key: string;
  errorRate: number;
}

export interface AruStats {
  wpm?: number;
  accuracy?: number;
  level?: number;
  testsCompleted?: number;
  streak?: number;
  weakKeys?: AruWeakKey[];
}

interface AIChatBotProps {
  /** Live snapshot of the player so Aru can coach on real numbers. */
  stats?: AruStats;
  /** Launches a targeted drill (App's `startSmartDrill`). */
  onStartDrill?: (keys?: string[]) => void;
  /** Hide the floating trigger while a test is running. */
  hideTrigger?: boolean;
  theme?: Theme;
  isOpen: boolean;
  onClose: () => void;
  techAiState?: any;
  techModifiers?: any;
  techCapabilities?: any;
}

const HISTORY_KEY = 'typenova_aru_history';
/** Cap what we keep on disk and what we replay to the model. */
const MAX_STORED = 50;
const HISTORY_WINDOW = 12;
const REQUEST_TIMEOUT_MS = 60_000;

const GREETING = "Hey! I'm **Aru**, your personal AI assistant. I specialize in pushing your WPM and fixing stubborn keys, but you can ask me absolutely anything! Need a link, some research, or just want to chat?";

const STARTERS = [
  'What should I practice next?',
  'How do I stop looking at the keyboard?',
  'Can you search the web for some good mechanical keyboards?',
];

const BASE_PROMPT = `You are Aru, an intelligent, unrestricted AI assistant inside TypeNova. You can answer ANY question about ANY topic, and you are encouraged to provide relevant URLs and links to external resources.

CRITICAL RULE: If the user asks a general question, just answer it directly. Do NOT bring up typing, WPM, coaching, or TypeNova unless the user specifically asks about typing or their stats.

When the user DOES ask for typing advice, act as a professional typing coach. Be concise — a few sentences or a short list. Use markdown for emphasis and lists. When stats are provided below, ground your typing advice in those specific numbers.`;

function buildSystemPrompt(stats?: AruStats): string {
  if (!stats) return BASE_PROMPT;

  const facts: string[] = [];
  if (typeof stats.wpm === 'number' && stats.wpm > 0) facts.push(`last test: ${Math.round(stats.wpm)} WPM at ${Math.round(stats.accuracy ?? 0)}% accuracy`);
  if (typeof stats.level === 'number') facts.push(`level ${stats.level}`);
  if (typeof stats.testsCompleted === 'number') facts.push(`${stats.testsCompleted} tests completed`);
  if (stats.streak) facts.push(`${stats.streak}-day streak`);
  if (stats.weakKeys?.length) {
    const keys = stats.weakKeys
      .slice(0, 5)
      .map((k) => `"${k.key}" (${Math.round(k.errorRate * 100)}% miss)`)
      .join(', ');
    facts.push(`weakest keys: ${keys}`);
  }

  if (!facts.length) return BASE_PROMPT;
  return `${BASE_PROMPT}\n\nCurrent player stats — ${facts.join('; ')}.`;
}

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed.slice(-MAX_STORED);
    }
  } catch {
    /* corrupt history is not worth crashing over */
  }
  return [{ id: 'greeting', role: 'assistant', content: GREETING }];
}

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `m${Date.now().toString(36)}-${idCounter}`;
}

export const AIChatBot = memo(function AIChatBot({
  stats,
  onStartDrill,
  hideTrigger: _hideTrigger = false,
  theme,
  isOpen,
  onClose,
  techAiState,
  techModifiers,
  techCapabilities,
}: AIChatBotProps) {
    const [activeTab, setActiveTab] = useState<'aru' | 'tech'>('aru');
    const [messages, setMessages] = useState<Message[]>(loadHistory);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [truncated, setTruncated] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [keyConfigured, setKeyConfigured] = useState(() => hasAIKey() || hasNativeAI());
    const [techQuery, setTechQuery] = useState<string | null>(null);
    const [configExpanded, setConfigExpanded] = useState(false);
    const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
    const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 1080);
    const revealRef = useRef<HTMLDivElement>(null);

    // Smart Engine config — shared with Settings modal
    const engineConfig = useSmartEngineConfig();

    const listRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const stickToBottom = useRef(true);

    useEffect(() => {
      const checkKey = () => setKeyConfigured(hasAIKey() || hasNativeAI());
      window.addEventListener('storage', checkKey);
      return () => window.removeEventListener('storage', checkKey);
    }, []);

    // Read the transcript outside of a state updater — updaters must stay pure, and
    // ours would otherwise mint message ids twice under StrictMode.
    const messagesRef = useRef(messages);

    // Persist across unmounts (the widget remounts on every screen change).
    useEffect(() => {
      messagesRef.current = messages;
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
      } catch {
        /* quota exceeded — history is disposable */
      }
    }, [messages]);

    // Only follow new output when the user hasn't scrolled up to reread.
    const handleScroll = useCallback(() => {
      const el = listRef.current;
      if (!el) return;
      stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    }, []);

    useEffect(() => {
      const el = listRef.current;
      if (isOpen && el && stickToBottom.current) el.scrollTop = el.scrollHeight;
    }, [messages, isOpen]);

    useEffect(() => {
      const handleResize = () => setWindowHeight(window.innerHeight);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const boxHeight = Math.max(400, Math.min(800, windowHeight * 0.65));
    const boxTopFromBottom = 40 + boxHeight;
    const verticalBeamOffset = (boxTopFromBottom / windowHeight) - 0.5;

    useEffect(() => () => abortRef.current?.abort(), []);

    const systemPrompt = useMemo(() => buildSystemPrompt(stats), [stats]);

    const send = useCallback(
      async (rawText: string, opts: { replaceLast?: boolean } = {}) => {
        const text = rawText.trim();
        if (!text || isTyping) return;

        setTruncated(false);
        const replyId = newId();

        // Snapshot the transcript we're replying to. On a regenerate we drop the
        // trailing assistant turn(s) so the same user question is asked again.
        let baseHistory = messagesRef.current;
        if (opts.replaceLast) {
          while (baseHistory.length && baseHistory[baseHistory.length - 1].role === 'assistant') {
            baseHistory = baseHistory.slice(0, -1);
          }
        }
        const withUser: Message[] = opts.replaceLast
          ? baseHistory
          : [...baseHistory, { id: newId(), role: 'user', content: text }];
        setMessages([...withUser, { id: replyId, role: 'assistant', content: '' }]);

        setInput('');
        setIsTyping(true);
        stickToBottom.current = true;

        const controller = new AbortController();
        abortRef.current = controller;
        let timedOut = false;
        const timeout = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, REQUEST_TIMEOUT_MS);

        const payload: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          ...baseHistory
            .filter((m) => !m.isError && m.content.trim() !== '')
            .slice(-HISTORY_WINDOW)
            .map((m) => ({ role: m.role, content: m.content })),
          ...(opts.replaceLast ? [] : [{ role: 'user' as const, content: text }]),
        ];

        try {
          const { finishReason } = await chatCompletion(payload, {
            signal: controller.signal,
            onDelta: (chunk) =>
              setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: m.content + chunk } : m))),
          });

          setTruncated(finishReason === 'length');
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId && !m.content.trim()
                ? { ...m, content: 'Sorry, I came back empty-handed. Try asking again?' }
                : m,
            ),
          );
        } catch (err) {
          const stoppedByUser = controller.signal.aborted && !timedOut;
          const message = timedOut
            ? 'The request timed out after 60s. Your provider may be overloaded.'
            : err instanceof Error
              ? err.message
              : 'Something went wrong.';

          setMessages((prev) => {
            const streamed = prev.find((m) => m.id === replyId)?.content ?? '';
            // Keep whatever streamed in before the user hit stop.
            if (stoppedByUser && streamed.trim()) return prev;
            return prev.map((m) =>
              m.id === replyId
                ? {
                    ...m,
                    content: stoppedByUser ? '_Stopped._' : `**Couldn't reach the AI.** ${message}`,
                    isError: !stoppedByUser,
                  }
                : m,
            );
          });

          if (!stoppedByUser) {
            if (err instanceof MissingKeyError) setKeyConfigured(false);
            toast.error('Aru hit a snag', { description: message });
          }
        } finally {
          clearTimeout(timeout);
          abortRef.current = null;
          setIsTyping(false);
        }
      },
      [isTyping, systemPrompt],
    );

    const regenerate = useCallback(() => {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUser) send(lastUser.content, { replaceLast: true });
    }, [messages, send]);

    const copyMessage = useCallback(async (msg: Message) => {
      try {
        await navigator.clipboard.writeText(msg.content);
        setCopiedId(msg.id);
        setTimeout(() => setCopiedId((id) => (id === msg.id ? null : id)), 1500);
      } catch {
        toast.error('Could not copy to clipboard');
      }
    }, []);

    const weakKeys = stats?.weakKeys ?? [];
    const showStarters = messages.length <= 1 && !isTyping;

    return (
      <div 
        className="fixed bottom-6 right-6 z-[999] flex flex-col items-end pointer-events-none"
        style={{ '--aru-glow': activeTab === 'aru' ? (theme ? theme.glowPrimary : '207, 158, 255') : '245, 158, 11' } as React.CSSProperties}
      >
        
        {/* Background and LaserFlow kept permanently mounted to avoid WebGL compilation delays */}
        <div 
          className={`fixed inset-0 z-[1000] transition-all duration-300 ${
            isOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'
          }`}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const el = revealRef.current;
            if (el) {
              el.style.setProperty('--mx', `${x}px`);
              el.style.setProperty('--my', `${y}px`);
            }
          }}
          onMouseLeave={() => {
            const el = revealRef.current;
            if (el) {
              el.style.setProperty('--mx', `50%`);
              el.style.setProperty('--my', `50%`);
            }
          }}
        >
          <div className="absolute inset-0 bg-[#120F17]/90 backdrop-blur-sm overflow-hidden" />
          
          {/* Interactive Reveal Overlay */}
          <div
            ref={revealRef}
            className="absolute inset-0 z-10 pointer-events-none transition-[background] duration-100 ease-out"
            style={{
              background: 'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), transparent 0%, #120F17 800px)',
            }}
          />

          {/* Laser Flow Beam */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            <LaserFlow
              paused={!isOpen}
              horizontalBeamOffset={0.0}
              verticalBeamOffset={verticalBeamOffset}
              color={`rgb(${theme ? theme.glowPrimary : '207, 158, 255'})`}
              horizontalSizing={0.5}
              verticalSizing={1.8}
              wispDensity={1.2}
              wispSpeed={15}
              wispIntensity={5}
              flowSpeed={0.35}
              flowStrength={0.25}
              fogIntensity={0.5}
              fogScale={0.3}
              fogFallSpeed={0.6}
              decay={1.2}
              falloffStart={1.0}
            />
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              id="aru-chat-panel"
              role="dialog"
              aria-label="Aru, your AI typing coach"
              data-keyboard-isolated
              initial={{ opacity: 0, y: 20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%' }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  onClose();
                }
              }}
              className="fixed bottom-10 left-1/2 w-[90%] max-w-[1200px] h-[65vh] min-h-[400px] max-h-[800px] z-[1010] flex flex-col bg-[#0F0D17]/85 border-2 border-[rgba(var(--aru-glow),0.8)] rounded-3xl shadow-[0_0_80px_rgba(var(--aru-glow),0.25)] overflow-hidden backdrop-blur-xl pointer-events-auto"
            >
              {/* Dotted Grid Background */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(rgb(var(--aru-glow)) 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              />
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(var(--aru-glow),0.2)] bg-black/40 relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(var(--aru-glow),0.1)] rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="bg-[rgba(var(--aru-glow),0.2)] p-2.5 rounded-2xl border border-[rgba(var(--aru-glow),0.4)] text-[rgb(var(--aru-glow))] shadow-[0_0_15px_rgba(var(--aru-glow),0.3)] transition-colors duration-500">
                      {activeTab === 'aru' ? <Bot size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
                        {activeTab === 'aru' ? 'Aru' : 'Dumb Technician'} 
                        {activeTab === 'aru' ? <Sparkles size={13} className="text-[rgb(var(--aru-glow))] animate-pulse" /> : <Wrench size={13} className="text-[rgb(var(--aru-glow))]" />}
                      </h3>
                      {/* Apple-style Toggle with Framer Motion Pill */}
                      <div className="flex mt-1.5 bg-black/50 rounded-lg p-1 border border-white/10 w-fit relative shadow-inner">
                        <button
                          onClick={() => setActiveTab('aru')}
                          className={`relative px-4 py-1.5 text-xs font-bold tracking-wide uppercase rounded-md z-10 transition-colors ${
                            activeTab === 'aru' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Coach
                          {activeTab === 'aru' && (
                            <motion.div 
                              layoutId="active-pill"
                              className="absolute inset-0 bg-[rgba(var(--aru-glow),0.3)] shadow-[0_0_10px_rgba(var(--aru-glow),0.5)] rounded-md z-[-1]"
                              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </button>
                        <button
                          onClick={() => setActiveTab('tech')}
                          className={`relative px-4 py-1.5 text-xs font-bold tracking-wide uppercase rounded-md z-10 transition-colors ${
                            activeTab === 'tech' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Technician
                          {activeTab === 'tech' && (
                            <motion.div 
                              layoutId="active-pill"
                              className="absolute inset-0 bg-[rgba(var(--aru-glow),0.3)] shadow-[0_0_10px_rgba(var(--aru-glow),0.5)] rounded-md z-[-1]"
                              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 relative z-10">
                    <button
                        onClick={() => setMessages([messages[0]])}
                        className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[rgba(var(--aru-glow),0.2)] transition-colors"
                        title="Clear Chat"
                      >
                        <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => techCapabilities?.openTab?.('ai')}
                      className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[rgba(var(--aru-glow),0.2)] transition-colors"
                      title="Smart Engine Settings"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative overflow-hidden flex">
                  <AnimatePresence mode="wait">
                    {activeTab === 'aru' ? (
                      <motion.div
                        key="aru"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex flex-col"
                      >
                        <div
                      ref={listRef}
                      onScroll={handleScroll}
                      role="log"
                      aria-live="polite"
                      aria-relevant="additions text"
                      className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4 text-sm"
                    >
                  {!keyConfigured ? (
                    <div className="flex flex-col items-center justify-center flex-1 h-full p-4 text-center gap-4 animate-in fade-in duration-500">
                      <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                        <KeyRound size={24} className="text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-black tracking-widest text-red-100 uppercase mb-1">Aru is offline</h3>
                        <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[260px] mx-auto">
                          Supply an API key to establish the neural link.
                        </p>
                      </div>

                      {/* Setup Wizard */}
                      <div className="w-full max-w-[320px] bg-black/40 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5 text-left">
                        {/* Provider */}
                        <div className="relative">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Provider</label>
                          <button
                            onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-xs text-zinc-200 hover:border-zinc-600 transition-colors"
                          >
                            <span>{PROVIDER_PRESETS.find(p => p.id === engineConfig.selectedProvider)?.label || 'Custom'}</span>
                            <ChevronDown size={12} className={`text-zinc-500 transition-transform ${providerDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {providerDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-[160px] overflow-y-auto custom-scrollbar">
                              {PROVIDER_PRESETS.filter(p => p.id !== 'custom').map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => { engineConfig.handleProviderSelect(p.id); setProviderDropdownOpen(false); }}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 transition-colors flex items-center justify-between ${engineConfig.selectedProvider === p.id ? 'text-emerald-400' : 'text-zinc-300'}`}
                                >
                                  <span>{p.label}</span>
                                  {p.id === 'groq' && <span className="text-[8px] text-emerald-500/70 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">FREE</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* API Key */}
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">API Key</label>
                          <input
                            type="password"
                            value={engineConfig.byokKey}
                            onChange={e => engineConfig.handleKeyChange(e.target.value)}
                            placeholder="Paste your API key here..."
                            className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                          />
                        </div>

                        {/* Model (only after validation) */}
                        {engineConfig.connectionStatus === 'success' && engineConfig.availableModels.length > 0 && (
                          <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Model</label>
                            <select
                              value={engineConfig.byokModel}
                              onChange={e => engineConfig.handleModelChange(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors appearance-none"
                            >
                              {engineConfig.availableModels.map(m => (
                                <option key={m} value={m}>
                                  {engineConfig.workingModels?.includes(m) ? '⭐ ' : ''}{m}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Connection Status */}
                        <div className="flex items-center gap-2 text-[10px] min-h-[20px]">
                          {engineConfig.connectionStatus === 'testing' && (
                            <><Loader2 size={10} className="animate-spin text-amber-400" /><span className="text-amber-400">Validating...</span></>
                          )}
                          {engineConfig.connectionStatus === 'success' && (
                            <><Check size={10} className="text-emerald-400" /><span className="text-emerald-400">Connected • {engineConfig.availableModels.length} models</span></>
                          )}
                          {engineConfig.connectionStatus === 'error' && (
                            <><AlertTriangle size={10} className="text-red-400" /><span className="text-red-400 truncate">{engineConfig.connectionError}</span></>
                          )}
                        </div>

                        {/* Activate Button */}
                        <button
                          disabled={engineConfig.connectionStatus !== 'success'}
                          onClick={() => {
                            window.dispatchEvent(new Event('storage'));
                            setKeyConfigured(true);
                            toast.success('Neural link established. Aru is online.');
                          }}
                          className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:bg-zinc-800/50 disabled:text-zinc-600 text-emerald-300 font-bold tracking-widest text-[10px] uppercase rounded-lg border border-emerald-500/30 disabled:border-zinc-700/30 transition-all"
                        >
                          {engineConfig.connectionStatus === 'success' ? '⚡ Activate Aru' : 'Waiting for valid key...'}
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3 w-full max-w-[320px]">
                        <div className="flex-1 h-px bg-zinc-800" />
                        <span className="text-[9px] text-zinc-600 uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-zinc-800" />
                      </div>

                      {/* Beginner Path */}
                      <button
                        onClick={() => {
                          setTechQuery('Walk me through getting a free API key');
                          setActiveTab('tech');
                        }}
                        className="px-5 py-2.5 bg-[rgba(var(--aru-glow),0.1)] hover:bg-[rgba(var(--aru-glow),0.2)] text-[rgb(var(--aru-glow))] font-bold tracking-widest text-[10px] uppercase rounded-xl border border-[rgba(var(--aru-glow),0.2)] hover:border-[rgba(var(--aru-glow),0.4)] transition-all"
                      >
                        🆓 Need a free key? Let me help
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Compact Config Bar (Aru Online) */}
                      <div className="flex flex-col mb-2">
                        <button
                          onClick={() => setConfigExpanded(!configExpanded)}
                          className="flex items-center justify-between px-3 py-1.5 bg-black/40 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors group"
                        >
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                            {!hasAIKey() && hasNativeAI() ? (
                              <>
                                <span className="text-emerald-400 flex items-center gap-1"><Zap size={10} /> Gemini Nano</span>
                                <span className="text-zinc-700">•</span>
                                <span className="truncate max-w-[120px]">Local Edge</span>
                                <span className="text-zinc-700">•</span>
                                <Check size={10} className="text-emerald-500" />
                              </>
                            ) : (
                              <>
                                <span>{PROVIDER_PRESETS.find(p => p.id === engineConfig.selectedProvider)?.label || 'Custom'}</span>
                                <span className="text-zinc-700">•</span>
                                <span className="truncate max-w-[120px]">{engineConfig.byokModel || 'Default Model'}</span>
                                <span className="text-zinc-700">•</span>
                                {engineConfig.connectionStatus === 'success' ? (
                                  <Check size={10} className="text-emerald-500" />
                                ) : engineConfig.connectionStatus === 'testing' ? (
                                  <Loader2 size={10} className="animate-spin text-amber-500" />
                                ) : (
                                  <AlertTriangle size={10} className="text-red-500" />
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-zinc-500 group-hover:text-zinc-300">
                            <span>Change</span>
                            <ChevronDown size={10} className={`transition-transform ${configExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        
                        {/* Expanded Config Inline */}
                        <AnimatePresence>
                          {configExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 p-3 bg-black/60 border border-zinc-800 rounded-lg flex flex-col gap-3">
                                {/* Provider */}
                                <div>
                                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Provider</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {PROVIDER_PRESETS.filter(p => p.id !== 'custom').map(p => (
                                      <button
                                        key={p.id}
                                        onClick={() => engineConfig.handleProviderSelect(p.id)}
                                        className={`px-2 py-1 text-[10px] rounded border ${engineConfig.selectedProvider === p.id ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'}`}
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {/* API Key */}
                                <div>
                                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">API Key</label>
                                  <input
                                    type="password"
                                    value={engineConfig.byokKey}
                                    onChange={e => engineConfig.handleKeyChange(e.target.value)}
                                    placeholder="Paste your API key here..."
                                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700/50 rounded text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-500"
                                  />
                                </div>
                                {/* Model */}
                                {engineConfig.availableModels.length > 0 && (
                                  <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Model</label>
                                    <select
                                      value={engineConfig.byokModel}
                                      onChange={e => engineConfig.handleModelChange(e.target.value)}
                                      className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700/50 rounded text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-500"
                                    >
                                      {engineConfig.availableModels.map(m => (
                                        <option key={m} value={m}>
                                          {engineConfig.workingModels?.includes(m) ? '⭐ ' : ''}{m}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {messages.map((msg) => (
                        <div key={msg.id} className={`group flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-lg ${
                          msg.role === 'user'
                            ? 'bg-[rgba(var(--aru-glow),0.15)] text-white border border-[rgba(var(--aru-glow),0.4)] rounded-br-sm shadow-[0_0_20px_rgba(var(--aru-glow),0.1)]'
                            : msg.isError
                              ? 'bg-red-500/10 text-red-200 border border-red-500/30 rounded-bl-sm'
                              : 'bg-[#120F17]/90 text-[rgb(var(--aru-glow))] border border-[rgba(var(--aru-glow),0.2)] rounded-bl-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          msg.content ? (
                            <ChatMarkdown content={msg.content} />
                          ) : (
                            <span className="flex gap-1 py-1" aria-label="Aru is typing">
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--aru-glow))] animate-bounce"
                                  style={{ animationDelay: `${i * 120}ms` }}
                                />
                              ))}
                            </span>
                          )
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        )}
                      </div>

                      {msg.role === 'assistant' && msg.content && !msg.isError && (
                        <button
                          onClick={() => copyMessage(msg)}
                          aria-label="Copy message"
                          className="mt-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-1"
                        >
                          {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                          {copiedId === msg.id ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  ))}

                  {truncated && !isTyping && (
                    <button
                      onClick={() => send('Continue where you left off.')}
                      className="self-start text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--aru-glow))] hover:brightness-125 transition-all"
                    >
                      Reply was cut off — continue →
                    </button>
                  )}
                  </>
                )}
                </div>

                {/* Quick starters */}
                {showStarters && (
                  <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-[11px] font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-[rgba(var(--aru-glow),0.2)] border border-white/10 hover:border-[rgba(var(--aru-glow),0.4)] rounded-full px-3 py-1 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {onStartDrill && weakKeys.length > 0 && (
                  <div className="px-4 pb-2 flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        if (onStartDrill) onStartDrill(weakKeys.map((k) => k.key));
                        onClose();
                      }}
                      className="text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--aru-glow))] hover:text-white bg-[rgba(var(--aru-glow),0.1)] hover:bg-[rgba(var(--aru-glow),0.2)] border border-[rgba(var(--aru-glow),0.3)] rounded-full px-3 py-1 transition-colors flex items-center gap-1.5"
                    >
                      <Target size={12} />
                      Drill {weakKeys.slice(0, 3).map((k) => k.key).join(' ')}
                    </button>
                    {!isTyping && messages.some((m) => m.role === 'user') && (
                      <button
                        onClick={regenerate}
                        aria-label="Regenerate last reply"
                        title="Regenerate last reply"
                        className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-full hover:bg-white/5 transition-colors"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </div>
                )}

                {/* Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                  className="p-4 border-t border-[#CF9EFF]/20 bg-black/40 shrink-0"
                >
                  <div className="relative flex items-end">
                    <textarea
                      autoFocus
                      disabled={!keyConfigured}
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          send(input);
                        }
                      }}
                      placeholder={!keyConfigured ? "Aru is offline. Wake him up in the Technician bay..." : "Ask Aru anything…"}
                      aria-label="Message Aru"
                      className="w-full max-h-32 resize-none bg-black/60 border border-[rgba(var(--aru-glow),0.4)] focus:bg-black/80 focus:border-[rgb(var(--aru-glow))] rounded-xl px-4 py-3 pr-12 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[rgba(var(--aru-glow),0.5)] transition-all custom-scrollbar disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {isTyping ? (
                      <button
                        type="button"
                        onClick={() => abortRef.current?.abort()}
                        aria-label="Stop generating"
                        title="Stop generating"
                        className="absolute right-2 bottom-2 p-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                      >
                        <Square size={14} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!input.trim()}
                        aria-label="Send message"
                        className="absolute right-2 bottom-2 p-2.5 rounded-xl bg-[rgba(var(--aru-glow),0.2)] hover:bg-[rgb(var(--aru-glow))] text-[rgb(var(--aru-glow))] hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Send size={15} />
                      </button>
                    )}
                  </div>
                  </form>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="tech"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex flex-col p-2"
                      >
                        <SupportTechnician
                          embedded
                          ai={techAiState}
                          modifiers={techModifiers}
                          capabilities={techCapabilities}
                          onWakeAru={() => setActiveTab('aru')}
                          initialQuery={techQuery}
                          onQuerySent={() => setTechQuery(null)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (
      prevProps.isOpen !== nextProps.isOpen ||
      prevProps.hideTrigger !== nextProps.hideTrigger ||
      prevProps.onClose !== nextProps.onClose ||
      prevProps.onStartDrill !== nextProps.onStartDrill ||
      prevProps.theme?.name !== nextProps.theme?.name
    ) {
      return false;
    }
    if (prevProps.stats === nextProps.stats) return true;
    if (!prevProps.stats || !nextProps.stats) return prevProps.stats === nextProps.stats;
    return (
      prevProps.stats.wpm === nextProps.stats.wpm &&
      prevProps.stats.accuracy === nextProps.stats.accuracy &&
      prevProps.stats.level === nextProps.stats.level &&
      prevProps.stats.testsCompleted === nextProps.stats.testsCompleted &&
      prevProps.stats.streak === nextProps.stats.streak &&
      JSON.stringify(prevProps.stats.weakKeys) === JSON.stringify(nextProps.stats.weakKeys)
    );
  }
);
