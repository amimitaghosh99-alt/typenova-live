import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, X, Send, Bot, Sparkles, Square, Copy, Check, Trash2, Target, KeyRound, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import { chatCompletion, hasAIKey, MissingKeyError, type ChatMessage } from '@/lib/aiClient';

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
}

const HISTORY_KEY = 'typenova_aru_history';
/** Cap what we keep on disk and what we replay to the model. */
const MAX_STORED = 50;
const HISTORY_WINDOW = 12;
const REQUEST_TIMEOUT_MS = 60_000;

const GREETING = "Hey! I'm **Aru**, your personal typing coach. Ask me how to push your WPM, fix a stubborn key, or just tell me how the last run went.";

const STARTERS = [
  'What should I practice next?',
  'How do I stop looking at the keyboard?',
  'Why is my accuracy dropping at speed?',
];

const BASE_PROMPT = `You are Aru, an encouraging and insightful AI typing coach inside TypeNova, a gamified typing app. Help the user improve speed and accuracy, advise on technique, posture and keyboard layouts, and keep them motivated. Be concise — a few sentences or a short list. Use markdown for emphasis and lists. When the user's stats are provided below, ground your advice in those specific numbers and keys instead of giving generic tips.`;

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

export const AIChatBot = ({ stats, onStartDrill, hideTrigger = false }: AIChatBotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickToBottom = useRef(true);

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

  useEffect(() => () => abortRef.current?.abort(), []);

  const closePanel = useCallback(() => {
    abortRef.current?.abort();
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const openPanel = useCallback(() => {
    setKeyConfigured(hasAIKey());
    stickToBottom.current = true;
    setIsOpen(true);
  }, []);

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

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([{ id: 'greeting', role: 'assistant', content: GREETING }]);
    setTruncated(false);
  }, []);

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
    <div className="fixed bottom-24 right-6 z-[200] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="aru-chat-panel"
            role="dialog"
            aria-label="Aru, your AI typing coach"
            data-keyboard-isolated
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                closePanel();
              }
            }}
            className="pointer-events-auto w-[min(24rem,calc(100vw-3rem))] h-[min(500px,70vh)] mb-4 flex flex-col bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl origin-bottom-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20 rounded-t-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
                    Aru <Sparkles size={12} className="text-indigo-400" />
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-500 tracking-wider">AI Typing Coach</p>
                </div>
              </div>
              <div className="flex items-center gap-1 relative z-10">
                <button
                  onClick={clearChat}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                  className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={closePanel}
                  aria-label="Close chat"
                  className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              onScroll={handleScroll}
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4"
            >
              {!keyConfigured && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90 leading-relaxed flex gap-2.5">
                  <KeyRound size={15} className="shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    No API key yet. Open <strong className="font-bold">Settings → Smart Engine</strong> and add one to start
                    chatting with Aru.
                  </span>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`group flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-br-sm'
                        : msg.isError
                          ? 'bg-red-500/10 text-red-200 border border-red-500/25 rounded-bl-sm'
                          : 'bg-zinc-800/50 text-zinc-300 border border-white/5 rounded-bl-sm'
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
                              className="w-1.5 h-1.5 rounded-full bg-indigo-400/70 animate-bounce"
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
                      className="mt-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-1"
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
                  className="self-start text-[11px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Reply was cut off — continue →
                </button>
              )}
            </div>

            {/* Quick actions */}
            {showStarters && (
              <div className="px-3 pb-1 flex flex-wrap gap-1.5">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-[11px] font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-2.5 py-1 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {onStartDrill && weakKeys.length > 0 && (
              <div className="px-3 pb-1 flex items-center gap-1.5">
                <button
                  onClick={() => {
                    onStartDrill(weakKeys.map((k) => k.key));
                    closePanel();
                  }}
                  className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 rounded-full px-2.5 py-1 transition-colors flex items-center gap-1.5"
                >
                  <Target size={11} />
                  Drill {weakKeys.slice(0, 3).map((k) => k.key).join(' ')}
                </button>
                {!isTyping && messages.some((m) => m.role === 'user') && (
                  <button
                    onClick={regenerate}
                    aria-label="Regenerate last reply"
                    title="Regenerate last reply"
                    className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-full hover:bg-white/5 transition-colors"
                  >
                    <RotateCcw size={12} />
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
              className="p-3 border-t border-white/10 bg-black/20 rounded-b-2xl"
            >
              <div className="relative flex items-end">
                <textarea
                  autoFocus
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // `isComposing` guards IME input — without it an Enter that only
                    // commits a CJK candidate would fire off a half-typed message.
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Ask Aru anything…"
                  aria-label="Message Aru"
                  className="w-full max-h-32 resize-none bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors custom-scrollbar"
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
                    className="absolute right-2 bottom-2 p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => (isOpen ? closePanel() : openPanel())}
        aria-expanded={isOpen}
        aria-controls="aru-chat-panel"
        aria-label={isOpen ? 'Close Aru' : 'Open Aru, your AI typing coach'}
        className={`pointer-events-auto bg-zinc-900 border border-white/10 px-5 py-3 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all duration-500 group relative flex items-center gap-2 ${
          hideTrigger && !isOpen ? 'opacity-0 translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? (
          <X size={18} className="text-zinc-400 relative z-10" />
        ) : (
          <>
            <MessageSquare size={16} className="text-indigo-400 relative z-10" />
            <span className="text-xs font-black tracking-widest text-indigo-300 uppercase relative z-10">Ask Aru</span>
          </>
        )}
      </button>
    </div>
  );
};
