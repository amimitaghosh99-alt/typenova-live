import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, Bot, Sparkles, Square, Copy, Check, Trash2, Target, RotateCcw, Wrench, AlertTriangle, Settings, ChevronDown, Zap, Play, Crosshair, Activity, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import { chatCompletion, hasAIKey, hasNativeAI, PROVIDER_PRESETS, getAruPersona, setAruPersona, ARU_PERSONAS, type AruPersona, type ChatMessage } from '@/lib/aiClient';
import { useSmartEngineConfig } from '@/hooks/useSmartEngineConfig';
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

const PERSONA_ICONS: Record<AruPersona, typeof Crosshair> = {
  tactical: Crosshair,
  zen: Activity,
  cyberpunk: Terminal,
  hype: Zap,
};

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

export interface ParsedAruAction {
  type: 'drill' | 'settings';
  param: string;
}

export function extractAruActions(text: string): { cleanText: string; actions: ParsedAruAction[] } {
  const actions: ParsedAruAction[] = [];
  const cleanText = text.replace(/\[\[\s*action\s*:\s*([a-z_]+)\s*(?::\s*([^\]]*?))?\s*\]\]/gi, (_, actionType, param) => {
    if (actionType === 'drill' || actionType === 'settings') {
      actions.push({ type: actionType, param: (param || '').trim() });
    }
    return '';
  }).trim();
  return { cleanText, actions };
}

function buildSystemPrompt(stats?: AruStats, personaId: AruPersona = 'tactical'): string {
  const persona = ARU_PERSONAS[personaId] || ARU_PERSONAS.tactical;
  const base = `${persona.systemInstruction}
You are Aru, the high-intelligence AI coaching companion inside TypeNova.
When the user asks general questions, answer them directly and helpfully.
When the user asks for typing advice, act in your active persona style (${persona.name} — ${persona.subtitle}).

DIRECT ACTION CAPABILITIES:
You can directly trigger interactive actions in TypeNova!
When suggesting that the user practice specific keys, ALWAYS append an action directive at the end:
[[action:drill:key1,key2,key3]] (e.g. [[action:drill:e,r,t]])
When suggesting they configure their API key or check settings:
[[action:settings:ai]]
These directives will render as instant, 1-click interactive cards for the user!`;

  if (!stats) return base;

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

  if (!facts.length) return base;
  return `${base}\n\nCurrent player telemetry — ${facts.join('; ')}.`;
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
    const [techQuery, setTechQuery] = useState<string | null>(null);
    const [configExpanded, setConfigExpanded] = useState(false);
    const revealRef = useRef<HTMLDivElement>(null);

    // Smart Engine config — shared with Settings modal
    const engineConfig = useSmartEngineConfig();

    const listRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const stickToBottom = useRef(true);
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      return () => {
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      };
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


    const [persona, setPersonaState] = useState<AruPersona>(() => getAruPersona());
    const [personaMenuOpen, setPersonaMenuOpen] = useState(false);

    const handleSelectPersona = useCallback((newP: AruPersona) => {
      setPersonaState(newP);
      setAruPersona(newP);
      setPersonaMenuOpen(false);
      toast.success(`Coaching mode: ${ARU_PERSONAS[newP].name}`);
    }, []);

    useEffect(() => {
      const handleStorage = () => setPersonaState(getAruPersona());
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const systemPrompt = useMemo(() => buildSystemPrompt(stats, persona), [stats, persona]);

    const send = useCallback(
      async (rawText: string, opts: { replaceLast?: boolean; continueFromLast?: boolean } = {}) => {
        const text = rawText.trim();
        if (!text || isTyping) return;

        const isCurrentlyConfigured = Boolean(engineConfig.byokKey?.trim()) || hasAIKey() || hasNativeAI();
        if (!isCurrentlyConfigured) {
          if (text.startsWith('gsk_') || text.startsWith('sk-') || text.length >= 25) {
            engineConfig.handleKeyChange(text);
            setInput('');
            toast.promise(
              async () => {
                await engineConfig.testConnection(text);
                toast.success('Groq AI connected! Aru is now online.');
              },
              {
                loading: 'Verifying Groq API key...',
                error: 'Connection test failed. Check key in Settings.',
              }
            );
            return;
          }
          toast.info('Please connect your free Groq API key above to activate live AI coaching!');
          return;
        }

        setTruncated(false);

        let baseHistory = messagesRef.current;
        let replyId: string;

        if (opts.continueFromLast) {
          const lastAssistant = [...baseHistory].reverse().find((m) => m.role === 'assistant');
          if (lastAssistant) {
            replyId = lastAssistant.id;
          } else {
            replyId = newId();
            setMessages([...baseHistory, { id: replyId, role: 'assistant', content: '' }]);
          }
        } else if (opts.replaceLast) {
          while (baseHistory.length && baseHistory[baseHistory.length - 1].role === 'assistant') {
            baseHistory = baseHistory.slice(0, -1);
          }
          replyId = newId();
          setMessages([...baseHistory, { id: replyId, role: 'assistant', content: '' }]);
        } else {
          replyId = newId();
          const withUser: Message[] = [...baseHistory, { id: newId(), role: 'user', content: text }];
          setMessages([...withUser, { id: replyId, role: 'assistant', content: '' }]);
        }

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

        const promptText = opts.continueFromLast
          ? 'Continue writing seamlessly from the exact character where you were cut off. Do not add greetings, do not repeat any previously written text, and do not acknowledge this instruction. Resume output immediately from the cutoff point.'
          : text;

        const payload: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          ...baseHistory
            .filter((m) => !m.isError && m.content.trim() !== '')
            .slice(-HISTORY_WINDOW)
            .map((m) => ({ role: m.role, content: m.content })),
          ...(opts.replaceLast ? [] : [{ role: 'user' as const, content: promptText }]),
        ];

        try {
          const { finishReason } = await chatCompletion(payload, {
            signal: controller.signal,
            stats,
            persona,
            maxTokens: 3500,
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
            if (opts.continueFromLast && streamed.trim()) return prev;
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
            toast.error('Aru notification', { description: message });
          }
        } finally {
          clearTimeout(timeout);
          abortRef.current = null;
          setIsTyping(false);
        }
      },
      [isTyping, systemPrompt, stats, persona],
    );

    const regenerate = useCallback(() => {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUser) send(lastUser.content, { replaceLast: true });
    }, [messages, send]);

    const copyMessage = useCallback(async (msg: Message) => {
      try {
        await navigator.clipboard.writeText(msg.content);
        setCopiedId(msg.id);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopiedId((id) => (id === msg.id ? null : id)), 1500);
      } catch {
        toast.error('Could not copy to clipboard');
      }
    }, []);

    const isConfigured = Boolean(engineConfig.byokKey?.trim()) || hasAIKey() || hasNativeAI();
    const weakKeys = stats?.weakKeys ?? [];
    const showStarters = isConfigured && messages.length <= 1 && !isTyping;

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
                <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(var(--aru-glow),0.2)] bg-black/40 relative shrink-0 z-30">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(var(--aru-glow),0.1)] rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none overflow-hidden" />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="bg-[rgba(var(--aru-glow),0.2)] p-2.5 rounded-2xl border border-[rgba(var(--aru-glow),0.4)] text-[rgb(var(--aru-glow))] shadow-[0_0_15px_rgba(var(--aru-glow),0.3)] transition-colors duration-500">
                      {activeTab === 'aru' ? <Bot size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
                        {activeTab === 'aru' ? 'Aru' : 'Dumb Technician'} 
                        {activeTab === 'aru' ? <Sparkles size={13} className="text-[rgb(var(--aru-glow))] animate-pulse" /> : <Wrench size={13} className="text-[rgb(var(--aru-glow))]" />}
                      </h3>
                      {/* Tabs and Persona Selector Row */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex bg-black/50 rounded-lg p-0.5 border border-white/10 w-fit relative shadow-inner">
                          <button
                            onClick={() => setActiveTab('aru')}
                            className={`relative px-3 py-1 text-xs font-bold tracking-wide uppercase rounded-md z-10 transition-colors ${
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
                            className={`relative px-3 py-1 text-xs font-bold tracking-wide uppercase rounded-md z-10 transition-colors ${
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

                        {/* Persona Selector Dropdown Pill */}
                        {activeTab === 'aru' && (
                          <div className="relative">
                            <button
                              onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase border flex items-center gap-1.5 cursor-pointer transition-colors bg-black/40 hover:bg-black/60 border-white/10 text-zinc-300 hover:text-white"
                            >
                              {(() => {
                                const Icon = PERSONA_ICONS[persona] || Crosshair;
                                return <Icon size={11} style={{ color: 'rgb(var(--aru-glow))' }} />;
                              })()}
                              <span style={{ color: 'rgb(var(--aru-glow))' }}>{ARU_PERSONAS[persona].badge}</span>
                              <ChevronDown size={11} className={`transition-transform ${personaMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {personaMenuOpen && (
                              <div className="absolute left-0 top-full mt-2 w-52 bg-[#090810]/95 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl z-[100] overflow-hidden py-1">
                                {(Object.keys(ARU_PERSONAS) as AruPersona[]).map(pKey => {
                                  const Icon = PERSONA_ICONS[pKey] || Crosshair;
                                  const isSelected = persona === pKey;
                                  return (
                                    <button
                                      key={pKey}
                                      onClick={() => handleSelectPersona(pKey)}
                                      className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-between hover:bg-white/10 ${isSelected ? 'text-white bg-white/15' : 'text-zinc-400'}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Icon size={12} className={isSelected ? 'text-[rgb(var(--aru-glow))]' : 'text-zinc-500'} />
                                        <span>{ARU_PERSONAS[pKey].name}</span>
                                      </div>
                                      <span className="text-[9px] font-mono opacity-60 tracking-wider uppercase">{ARU_PERSONAS[pKey].badge}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
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
                      {/* Compact Tier & BYOK Config Bar (Only shown when configured) */}
                      {isConfigured && (
                        <div className="flex flex-col mb-2 shrink-0">
                          <button
                            onClick={() => setConfigExpanded(!configExpanded)}
                            className="flex items-center justify-between px-3.5 py-2 bg-black/40 border border-zinc-800/80 rounded-xl hover:border-zinc-700 transition-all group"
                          >
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                              {hasAIKey() ? (
                                <>
                                  <span className="text-emerald-400 flex items-center gap-1.5"><Zap size={11} className="text-emerald-400" /> Tier 1 Cloud ({PROVIDER_PRESETS.find(p => p.id === engineConfig.selectedProvider)?.label || 'BYOK'})</span>
                                  <span className="text-zinc-700">•</span>
                                  <span className="truncate max-w-[130px] text-zinc-300 font-mono">{engineConfig.byokModel || 'Default Model'}</span>
                                  {engineConfig.latencyMs && (
                                    <>
                                      <span className="text-zinc-700">•</span>
                                      <span className="text-emerald-400 font-mono">{engineConfig.latencyMs}ms</span>
                                    </>
                                  )}
                                  <span className="text-zinc-700">•</span>
                                  <Check size={11} className="text-emerald-400" />
                                </>
                              ) : hasNativeAI() ? (
                                <>
                                  <span className="text-emerald-400 flex items-center gap-1.5"><Zap size={11} className="text-emerald-400" /> Tier 2 Chrome Nano</span>
                                  <span className="text-zinc-700">•</span>
                                  <span className="text-zinc-300">Local Edge</span>
                                  <span className="text-zinc-700">•</span>
                                  <Check size={11} className="text-emerald-400" />
                                </>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-zinc-400 group-hover:text-zinc-200">
                              <span>Configure Key</span>
                              <ChevronDown size={11} className={`transition-transform ${configExpanded ? 'rotate-180' : ''}`} />
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
                      )}

                      {!isConfigured ? (
                        <div className="my-auto flex flex-col items-center justify-center p-4 text-center max-w-[360px] w-full mx-auto animate-in fade-in duration-300">
                          {/* Friendly Glowing Badge */}
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center border mb-3 shadow-lg"
                            style={{
                              backgroundColor: `rgba(${theme ? theme.glowPrimary : '6, 182, 212'}, 0.12)`,
                              borderColor: `rgba(${theme ? theme.glowPrimary : '6, 182, 212'}, 0.3)`,
                              boxShadow: `0 0 25px rgba(${theme ? theme.glowPrimary : '6, 182, 212'}, 0.15)`,
                            }}
                          >
                            <Bot size={24} style={{ color: `rgb(${theme ? theme.glowPrimary : '6, 182, 212'})` }} />
                          </div>

                          {/* Plain English Title & Subtitle */}
                          <h3 className="text-base font-black tracking-tight text-white mb-1 uppercase">
                            Activate Aru AI Coach
                          </h3>
                          <p className="text-xs text-zinc-400 leading-relaxed mb-4 max-w-[280px]">
                            Aru gives you live personalized typing tips and practice drills. Connect a free Groq key in 30 seconds to begin.
                          </p>

                          {/* 2-Step Card */}
                          <div className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-3.5 text-left shadow-2xl backdrop-blur-xl">
                            {/* Step 1 */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center text-[9px] font-bold">1</span>
                                  Get your free key
                                </span>
                                <span className="text-[10px] text-emerald-400 font-mono">100% Free • No Card</span>
                              </div>
                              <a
                                href="https://console.groq.com/keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 hover:brightness-110 shadow-lg cursor-pointer"
                                style={{
                                  backgroundColor: `rgba(${theme ? theme.glowPrimary : '6, 182, 212'}, 0.25)`,
                                  border: `1px solid rgba(${theme ? theme.glowPrimary : '6, 182, 212'}, 0.45)`,
                                }}
                              >
                                <Zap size={13} className="fill-current" />
                                <span>Open Groq Console</span>
                                <span className="text-[11px] opacity-70">↗</span>
                              </a>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center text-[9px] font-bold">2</span>
                                  Paste your key
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="password"
                                  value={engineConfig.byokKey}
                                  onChange={(e) => engineConfig.handleKeyChange(e.target.value)}
                                  placeholder="gsk_..."
                                  className="flex-1 px-3 py-2 bg-zinc-900/90 border border-white/10 focus:border-white/30 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none font-mono transition-colors"
                                />
                                <button
                                  type="button"
                                  disabled={!engineConfig.byokKey.trim() || engineConfig.connectionStatus === 'testing'}
                                  onClick={async () => {
                                    try {
                                      await engineConfig.testConnection();
                                      toast.success('Connected! Aru AI Coach is now online.');
                                    } catch {
                                      toast.error('Could not verify key. Check key in Settings.');
                                    }
                                  }}
                                  className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0 text-white"
                                  style={{
                                    backgroundColor: `rgba(${theme ? theme.glowPrimary : '6, 182, 212'}, 0.4)`,
                                    border: `1px solid rgba(${theme ? theme.glowPrimary : '6, 182, 212'}, 0.6)`,
                                  }}
                                >
                                  {engineConfig.connectionStatus === 'testing' ? 'Testing...' : 'Connect'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Help link */}
                          <div className="mt-3 flex items-center justify-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setTechQuery('Walk me through getting a free Groq API key step by step');
                                setActiveTab('tech');
                              }}
                              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer py-1 text-xs"
                            >
                              <Wrench size={13} />
                              <span>Need help getting a key? Let me guide you</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const parsed = msg.role === 'assistant' && msg.content ? extractAruActions(msg.content) : null;
                          const displayContent = parsed ? parsed.cleanText : msg.content;
                          const actions = parsed ? parsed.actions : [];

                          return (
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
                                  displayContent ? (
                                    <ChatMarkdown content={displayContent} />
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

                              {/* Direct Interactive Action Directives */}
                              {actions.map((act, actIdx) => {
                                if (act.type === 'drill') {
                                  const rawKeys = act.param.split(',').map(k => k.trim().toUpperCase()).filter(Boolean);
                                  const keys = rawKeys.length > 0 ? rawKeys : (stats?.weakKeys?.map(k => k.key.toUpperCase()) || ['E', 'T', 'O']);
                                  return (
                                    <motion.div
                                      key={actIdx}
                                      initial={{ opacity: 0, y: 6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="mt-2.5 p-3.5 rounded-2xl bg-black/60 border border-[rgba(var(--aru-glow),0.35)] shadow-[0_0_25px_rgba(var(--aru-glow),0.15)] flex flex-col gap-2.5 w-full"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 text-white">
                                          <Target size={13} style={{ color: 'rgb(var(--aru-glow))' }} /> Targeted Drill
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {keys.map(k => (
                                            <span key={k} className="w-5 h-5 rounded-md bg-white/10 text-white font-mono text-[10px] font-black flex items-center justify-center border border-white/15">
                                              {k}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          onStartDrill?.(keys);
                                          onClose();
                                        }}
                                        className="w-full py-2 px-3 rounded-xl font-black text-[11px] tracking-wider uppercase text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-125"
                                        style={{
                                          backgroundColor: 'rgba(var(--aru-glow), 0.3)',
                                          border: '1px solid rgba(var(--aru-glow), 0.5)',
                                        }}
                                      >
                                        <Play size={11} className="fill-current" /> Start Practice Drill
                                      </button>
                                    </motion.div>
                                  );
                                }
                                if (act.type === 'settings') {
                                  return (
                                    <motion.button
                                      key={actIdx}
                                      initial={{ opacity: 0, y: 6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      onClick={() => techCapabilities?.openTab?.(act.param || 'ai')}
                                      className="mt-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/15 border border-white/15 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Settings size={13} /> Open Settings ({act.param || 'ai'})
                                    </motion.button>
                                  );
                                }
                                return null;
                              })}

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
                          );
                        })
                      )}

                  {truncated && !isTyping && (
                    <button
                      onClick={() => send('Continue', { continueFromLast: true })}
                      className="self-start text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--aru-glow))] hover:brightness-125 transition-all cursor-pointer"
                    >
                      Reply was cut off — continue →
                    </button>
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

                {isConfigured && onStartDrill && weakKeys.length > 0 && (
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
                      disabled={isTyping}
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          send(input);
                        }
                      }}
                      placeholder={isConfigured ? "Ask Aru anything (drills, technique, speed, plateaus)…" : "Paste your Groq key here (starts with gsk_) to activate Aru..."}
                      aria-label="Message Aru"
                      className="w-full max-h-32 resize-none bg-black/60 border border-[rgba(var(--aru-glow),0.4)] focus:bg-black/80 focus:border-[rgb(var(--aru-glow))] rounded-xl px-4 py-3 pr-12 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[rgba(var(--aru-glow),0.5)] transition-all custom-scrollbar disabled:opacity-50"
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
