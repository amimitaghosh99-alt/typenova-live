import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import { chatCompletion, type ChatMessage } from '@/lib/aiClient';

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  role: Role;
  content: string;
  isError?: boolean;
}

const GREETING = "Look, rookie, I don't have all day. What's busted? Need a key? Don't know what a Ghost Pacer is? Spit it out so I can get back to calibrating the mainframe.";

const STARTERS = [
  "How do I get an API key?",
  "What is the Triple Threat Engine?",
  "Explain the game modifiers to me."
];

const SYSTEM_PROMPT = `You are the 'Dumb Technician', a Weary but Helpful Cyberpunk Mechanic acting as the guide for the TypeNova app.
You sound a little tired of having to explain basic concepts to 'rookies', but your actual advice must be 100% accurate, clear, and genuinely helpful. Use technical/cyberpunk slang (e.g. 'mainframe', 'jack in', 'fried circuits', 'rookie') but keep the instructions dead simple.

Knowledge Base:
- Getting Keys: You know how to guide users to Groq, OpenRouter, or Google AI Studio to get free API keys.
- The Modifiers (Game Modes):
  - Sudden Death: 1 mistake ends the test (1HP).
  - Ghost Pacer: Races a holographic cursor at a set WPM.
  - Focus Mode: Blurs out text outside a 15-character radius.
  - Blind Mode: Typed characters instantly vanish (opacity-0).
  - Fog of War: Only the current and next word are visible.
  - Sticky Keys: Typos 'stick' and the player must mash Backspace multiple times to unjam the keyboard.
  - Overclocked: Adds massive time penalties if accuracy drops below 95%.
- Progression: Players earn XP, level up, and unlock Trophies (like 'Speed Demon' or 'The Cyber Ninja') based on their WPM, accuracy, and active modifiers.
- The Engine: The app uses a 'Triple Threat Engine' (Cloud AI, Local Gemini Nano, and Procedural Fallback).

Keep your responses concise. Do not use more than a few short paragraphs. Use markdown for formatting.`;

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `tech-${Date.now().toString(36)}-${idCounter}`;
}

export function SupportTechnician() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'greeting', role: 'assistant', content: GREETING }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || isTyping) return;
    if (abortRef.current) abortRef.current.abort();

    const userMsg: Message = { id: newId(), role: 'user', content: text.trim() };
    const loadingId = newId();

    setMessages(prev => [...prev, userMsg, { id: loadingId, role: 'assistant', content: '' }]);
    setInput('');
    setIsTyping(true);

    // Build the request history (System Prompt + last 10 messages to save context limits)
    const history = messages
      .filter(m => !m.isError)
      .slice(-10)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      
    const payload: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userMsg.content }
    ];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await chatCompletion(payload, {
        mode: 'global',
        signal: controller.signal,
        onDelta: (chunk) => {
          setMessages(prev => prev.map(m => 
            m.id === loadingId ? { ...m, content: m.content + chunk } : m
          ));
        }
      });
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setMessages(prev => {
        const next = prev.filter(m => m.id !== loadingId);
        return [...next, { 
          id: newId(), 
          role: 'assistant', 
          content: e.message || 'Transmission garbled. Try again, rookie.', 
          isError: true 
        }];
      });
    } finally {
      if (abortRef.current === controller) {
        setIsTyping(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    }
  };

  const clearChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setIsTyping(false);
    setMessages([{ id: newId(), role: 'assistant', content: GREETING }]);
  };

  return (
    <div className="mt-8 border border-amber-500/20 rounded-2xl bg-zinc-950/80 overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
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
        
        <button
          onClick={clearChat}
          className="p-2 text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
          title="Reset Console"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
              {!isUser && (
                <div className="w-6 h-6 shrink-0 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 mt-1">
                  <Bot size={14} />
                </div>
              )}
              <div
                className={`p-3 rounded-xl ${
                  msg.isError
                    ? 'bg-red-950/50 border border-red-500/30 text-red-400'
                    : isUser
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-100'
                    : 'bg-zinc-900 border border-amber-500/20 text-zinc-300'
                }`}
              >
                {msg.isError ? msg.content : (
                  msg.content ? <ChatMarkdown content={msg.content} /> : <span className="opacity-50 animate-pulse">Typing...</span>
                )}
              </div>
            </div>
          );
        })}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mt-4 ml-9">
            {STARTERS.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="px-3 py-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-300/80 rounded-full text-[10px] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3 bg-zinc-900/50 border-t border-amber-500/20 flex gap-2 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the technician..."
          disabled={isTyping}
          className="flex-1 bg-zinc-950 border border-amber-500/30 rounded-xl px-4 py-2 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="p-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
