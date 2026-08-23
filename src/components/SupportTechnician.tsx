import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Bot, RotateCcw, AlertTriangle, Square, Copy, Check, Zap } from 'lucide-react';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import { hasAIKey, AI_KEYS, PROVIDER_PRESETS } from '@/lib/aiClient';
import {
  offlineRespond,
  parseActions,
  readTechSnapshot,
  suggestStarters,
  type TechAction,
  type TechAiState,
} from '@/lib/technicianBrain';

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  role: Role;
  content: string;
  /** Locally-generated failure notice — shown, never replayed to the model. */
  isError?: boolean;
}

/** Actions the Technician can offer. Anything the host doesn't wire up is
 *  silently dropped from its reply, so the chat never dangles a dead button. */
export interface TechnicianCapabilities {
  openTab?: (tab: string) => void;
  setProvider?: (providerId: string) => void;
  setModel?: (model: string) => void;
  testConnection?: () => void;
  resetUsage?: () => void;
  toggleModifier?: (id: string) => void;
}

interface SupportTechnicianProps {
  /** Live Smart Engine form state — includes edits not yet in localStorage. */
  ai?: Partial<TechAiState>;
  /** Which gameplay modifiers are currently on, keyed by action id. */
  modifiers?: Record<string, boolean>;
  capabilities?: TechnicianCapabilities;
  embedded?: boolean;
  onWakeAru?: () => void;
  initialQuery?: string | null;
  onQuerySent?: () => void;
}

/** Key-console destinations for `open_console`. An explicit allowlist rather
 *  than a lookup over PROVIDER_PRESETS, so a bogus argument from the model can
 *  never open an arbitrary URL. */
const CONSOLE_URLS: Record<string, string> = {
  groq: 'https://console.groq.com/keys',
  openrouter: 'https://openrouter.ai/keys',
  google: 'https://aistudio.google.com/app/apikey',
  kimi: 'https://platform.moonshot.cn/console/api-keys',
  openai: 'https://platform.openai.com/api-keys',
};

const HISTORY_KEY = 'typenova_tech_history';
const MAX_STORED = 40;

const GREETING = "Look, rookie, I don't have all day. What's busted? Need a key? Don't know what a Ghost Pacer is? Spit it out so I can get back to calibrating the mainframe.";


let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `tech-${Date.now().toString(36)}-${idCounter}`;
}

function greetingMessage(): Message {
  return { id: newId(), role: 'assistant', content: GREETING };
}

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed.slice(-MAX_STORED);
    }
  } catch {
    /* corrupt transcript isn't worth crashing the settings modal over */
  }
  return [greetingMessage()];
}

export function SupportTechnician({ ai, modifiers, capabilities, embedded, onWakeAru, initialQuery, onQuerySent }: SupportTechnicianProps) {
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ranAction, setRanAction] = useState<string | null>(null);
  const [lastTopic, setLastTopic] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const stickToBottom = useRef(true);
  const ranActionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeAruTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist across the settings modal being closed and reopened.
  useEffect(() => {
    messagesRef.current = messages;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {
      /* quota — the transcript is disposable */
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (ranActionTimeoutRef.current) clearTimeout(ranActionTimeoutRef.current);
      if (wakeAruTimeoutRef.current) clearTimeout(wakeAruTimeoutRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Rebuilt per send, not per render — it reads localStorage and the heatmap.
  const snapshotInputs = useRef({ ai, modifiers });
  useEffect(() => { snapshotInputs.current = { ai, modifiers }; });

  // Suggestions are drawn from what's actually wrong with this install, so they
  // are built fresh. We show them anytime the AI finishes typing so they are always available.
  const starters = useMemo(() => {
    const snapshot = readTechSnapshot(ai, modifiers);
    return suggestStarters(snapshot);
  }, [ai, modifiers]);

  const showStarters = !isTyping && messages.length <= 1;

  const executeAction = useCallback((action: TechAction) => {
    const caps = capabilities;
    if (!caps) return;

    switch (action.id) {
      case 'open_tab': caps.openTab?.(action.arg); break;
      case 'set_provider': caps.setProvider?.(action.arg); break;
      case 'set_model': caps.setModel?.(action.arg); break;
      case 'test_connection': caps.testConnection?.(); break;
      case 'reset_usage': caps.resetUsage?.(); break;
      case 'toggle': caps.toggleModifier?.(action.arg); break;
      case 'open_console': {
        const url = CONSOLE_URLS[action.arg];
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
        break;
      }
    }

    const token = `${action.id}:${action.arg}`;
    setRanAction(token);
    if (ranActionTimeoutRef.current) clearTimeout(ranActionTimeoutRef.current);
    ranActionTimeoutRef.current = setTimeout(() => setRanAction(current => (current === token ? null : current)), 2000);
  }, [capabilities]);

  /** Drop actions this host can't perform so the model can't promise vapour. */
  const supported = useCallback((action: TechAction): boolean => {
    const caps = capabilities;
    switch (action.id) {
      case 'open_tab': return !!caps?.openTab;
      case 'set_provider': return !!caps?.setProvider;
      case 'set_model': return !!caps?.setModel;
      case 'test_connection': return !!caps?.testConnection;
      case 'reset_usage': return !!caps?.resetUsage;
      case 'toggle': return !!caps?.toggleModifier;
      case 'open_console': return !!CONSOLE_URLS[action.arg];
      default: return false;
    }
  }, [capabilities]);

  const send = useCallback(async (rawText: string, opts: { replaceLast?: boolean } = {}) => {
    const text = rawText.trim();
    if (!text || isTyping) return;

    abortRef.current?.abort();

    // LOCAL INTERCEPTOR: If the user pasted an API key, we hijack the chat locally
    // to prevent the key from being sent to the LLM cloud proxy.
    const isKeyLike = text.startsWith('gsk_') || text.startsWith('sk-') || text.startsWith('AIza') || text.match(/^[a-zA-Z0-9]{32,}$/);
    if (isKeyLike && capabilities?.setProvider && !opts.replaceLast) {
      const replyId = newId();
      // Mask the key in the transcript
      const withUser: Message[] = [...messagesRef.current, { id: newId(), role: 'user', content: "[[ API KEY ENCRYPTED ]]" }];
      
      setMessages([...withUser, { id: replyId, role: 'assistant', content: '' }]);
      setInput('');
      setIsTyping(true);
      stickToBottom.current = true;

      // Determine provider (naive guess)
      let providerId = 'groq';
      let url = PROVIDER_PRESETS.find(p => p.id === 'groq')?.url || 'https://api.groq.com/openai/v1/chat/completions';
      if (text.startsWith('sk-or')) {
        url = PROVIDER_PRESETS.find(p => p.id === 'openrouter')?.url || 'https://openrouter.ai/api/v1/chat/completions';
        providerId = 'openrouter';
      } else if (text.startsWith('AIza')) {
        url = PROVIDER_PRESETS.find(p => p.id === 'google')?.url || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        providerId = 'google';
      } else if (text.startsWith('sk-')) {
        providerId = 'openai';
      }

      // Save the key and provider directly, then dispatch storage event
      localStorage.setItem(AI_KEYS.byokKey, text);
      capabilities.setProvider(url);

      let responseText = "Got it. I'm slotting this key into the mainframe now...\n\nNeural link established. Aru is waking up.";
      let isValid = true;

      if (text.length < 20) {
        isValid = false;
        responseText = "That doesn't look like a full key, rookie. API keys are usually 40+ characters. Make sure you copied the whole thing.";
      } else {
        try {
          const baseUrl = url.replace(/\/chat\/completions$/, '');
          const res = await fetch(baseUrl + '/models', {
            headers: { Authorization: 'Bearer ' + text }
          });
          if (!res.ok) {
            isValid = false;
            if (res.status === 401 || res.status === 403) {
              responseText = `That key got rejected, rookie. Either it's expired, you didn't copy the whole thing, or it's been revoked. Go back and generate a fresh one.\n\n[[do:open_console:${providerId}]]`;
            } else if (res.status === 404) {
              responseText = "Key connected but the default model isn't available. Head to Settings to pick a different one.\n\n[[do:open_tab:ai]]";
            } else {
              responseText = "Can't reach the provider, rookie. Check your internet connection. If it persists, try a different provider.";
            }
          }
        } catch {
          isValid = false;
          responseText = "Can't reach the provider, rookie. Check your internet connection. If it persists, try a different provider.";
        }
      }

      if (!isValid) {
        localStorage.removeItem(AI_KEYS.byokKey);
      }

      let i = 0;
      const interval = setInterval(() => {
        if (i < responseText.length) {
          const chunk = responseText.slice(i, i + 4);
          setMessages(prev => prev.map(m => (m.id === replyId ? { ...m, content: m.content + chunk } : m)));
          i += 4;
        } else {
          clearInterval(interval);
          setIsTyping(false);
          if (isValid && onWakeAru) {
            if (wakeAruTimeoutRef.current) clearTimeout(wakeAruTimeoutRef.current);
            wakeAruTimeoutRef.current = setTimeout(onWakeAru, 1200);
          }
        }
      }, 25);
      return;
    }

    // On a regenerate, peel the trailing assistant turn(s) back off so the same
    // question gets asked again rather than answered twice.
    let baseHistory = messagesRef.current;
    if (opts.replaceLast) {
      while (baseHistory.length && baseHistory[baseHistory.length - 1].role === 'assistant') {
        baseHistory = baseHistory.slice(0, -1);
      }
    }

    const replyId = newId();
    const withUser: Message[] = opts.replaceLast
      ? baseHistory
      : [...baseHistory, { id: newId(), role: 'user', content: text }];

    setMessages([...withUser, { id: replyId, role: 'assistant', content: '' }]);
    setInput('');
    setIsTyping(true);
    stickToBottom.current = true;

    const { ai: liveAi, modifiers: liveModifiers } = snapshotInputs.current;
    const snapshot = readTechSnapshot(liveAi, liveModifiers);
    const { text: responseText, topic: newTopic } = offlineRespond(text, snapshot, lastTopic);
    
    if (newTopic) {
      setLastTopic(newTopic);
    }

    // Simulate typing character by character
    let i = 0;
    // Faster typing speed since it's an offline bot but we still want the effect
    const CHUNKS = 3; 
    
    // We still want a way to stop the feed if they hit clear chat
    const controller = new AbortController();
    abortRef.current = controller;
    
    const interval = setInterval(() => {
      if (controller.signal.aborted) {
        clearInterval(interval);
        return;
      }
      
      if (i < responseText.length) {
        const chunk = responseText.slice(i, i + CHUNKS);
        setMessages(prev => prev.map(m => (m.id === replyId ? { ...m, content: m.content + chunk } : m)));
        i += CHUNKS;
      } else {
        clearInterval(interval);
        if (abortRef.current === controller) abortRef.current = null;
        setIsTyping(false);
        inputRef.current?.focus();
      }
    }, 15);
  }, [isTyping]);

  const regenerate = useCallback(() => {
    const lastUser = [...messagesRef.current].reverse().find(m => m.role === 'user');
    if (lastUser) send(lastUser.content, { replaceLast: true });
  }, [send]);

  useEffect(() => {
    if (initialQuery) {
      send(initialQuery);
      if (onQuerySent) onQuerySent();
    }
  }, [initialQuery, send, onQuerySent]);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setIsTyping(false);
    setMessages([greetingMessage()]);
  }, []);

  const copyMessage = useCallback(async (msg: Message) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedId(id => (id === msg.id ? null : id)), 1500);
    } catch {
      /* clipboard blocked — nothing useful to say about it here */
    }
  }, []);

  const canRegenerate = !isTyping && messages.some(m => m.role === 'user');

  return (
    <div
      data-keyboard-isolated
      className={embedded ? "flex flex-col h-full w-full" : "border border-amber-500/20 rounded-2xl bg-zinc-950/80 overflow-hidden flex flex-col h-full"}
    >
      {/* Header */}
      {!embedded && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 text-amber-400">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest leading-none mb-1">
                Dumb Technician
              </h4>
              <p className="text-[10px] text-amber-400/50 uppercase tracking-wider font-mono">
                TypeNova Cloud Proxy Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {canRegenerate && (
              <button
                onClick={regenerate}
                className="p-2 text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                title="Ask that again"
                aria-label="Regenerate last reply"
              >
                <Zap size={15} />
              </button>
            )}
            <button
              onClick={clearChat}
              className="p-2 text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
              title="Reset Console"
              aria-label="Reset console"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Chat History */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm custom-scrollbar"
      >
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          const { body, actions } = isUser || msg.isError
            ? { body: msg.content, actions: [] as TechAction[] }
            : parseActions(msg.content);
          const runnable = actions.filter(supported);
          // Nothing has streamed in yet. A reply that turns out to be nothing
          // BUT a directive is not pending — it just has no prose, so it skips
          // the bubble and shows its buttons alone.
          const isPending = !isUser && !msg.isError && msg.content.trim() === '';

          return (
            <div key={msg.id} className={`group flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
              {!isUser && (
                <div className="w-6 h-6 shrink-0 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 mt-1">
                  <Bot size={14} />
                </div>
              )}

              <div className="flex flex-col gap-2 min-w-0">
                {(isPending || body) && (
                  <div
                    className={`p-3 rounded-xl ${
                      msg.isError
                        ? 'bg-red-950/50 border border-red-500/30 text-red-400'
                        : isUser
                          ? 'bg-amber-500/20 border border-amber-500/30 text-amber-100'
                          : 'bg-zinc-900 border border-amber-500/20 text-zinc-300'
                    }`}
                  >
                    {msg.isError || isUser ? (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    ) : isPending ? (
                      <span className="opacity-50 animate-pulse">Typing...</span>
                    ) : (
                      <ChatMarkdown content={body} />
                    )}
                  </div>
                )}

                {/* Directives the model emitted, as buttons the user presses */}
                {runnable.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {runnable.map(action => {
                      const token = `${action.id}:${action.arg}`;
                      const done = ranAction === token;
                      return (
                        <button
                          key={token}
                          onClick={() => executeAction(action)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                            done
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                          }`}
                        >
                          {done ? <Check size={11} /> : <Zap size={11} />}
                          {done ? 'Done' : action.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {!isUser && !msg.isError && body && (
                  <button
                    onClick={() => copyMessage(msg)}
                    aria-label="Copy message"
                    className="self-start px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-1"
                  >
                    {copiedId === msg.id ? <Check size={10} /> : <Copy size={10} />}
                    {copiedId === msg.id ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {showStarters && (
          <div className="flex flex-wrap gap-2 mt-4 ml-9">
            {starters.map(starter => (
              <button
                key={starter}
                onClick={() => send(starter)}
                className="px-3 py-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-300/80 rounded-full text-[10px] transition-colors"
              >
                {starter}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={e => {
          e.preventDefault();
          send(input);
        }}
        className={`bg-zinc-950/80 border-t border-amber-500/20 flex gap-2 shrink-0 ${embedded ? 'p-1' : 'p-3 bg-zinc-900/50'}`}
      >
        <div className={`flex-1 flex items-center bg-black/60 border border-amber-500/30 text-amber-500 focus-within:border-amber-400 focus-within:bg-black/80 transition-all font-mono text-sm ${embedded ? 'rounded-lg px-3 py-1' : 'rounded-xl px-4 py-2'}`}>
          <span className="opacity-50 select-none mr-2 font-black tracking-widest text-[10px]">root@proxy:~#</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={hasAIKey() ? "sudo fix..." : "Paste your API key here, or ask me anything..."}
            aria-label="Message the Technician"
            className="flex-1 bg-transparent text-zinc-200 placeholder:text-amber-500/30 focus:outline-none"
          />
        </div>
        {isTyping ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            aria-label="Stop generating"
            title="Stop generating"
            className={`bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors flex items-center justify-center ${embedded ? 'p-2 rounded-lg' : 'p-3 rounded-xl'}`}
          >
            <Square size={embedded ? 14 : 16} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send message"
            className={`bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center ${embedded ? 'p-2 rounded-lg' : 'p-3 rounded-xl'}`}
          >
            <Send size={embedded ? 14 : 18} />
          </button>
        )}
      </form>
    </div>
  );
}
