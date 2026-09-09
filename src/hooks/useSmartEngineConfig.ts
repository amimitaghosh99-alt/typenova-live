import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AI_KEYS,
  PROVIDER_PRESETS,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  getAruPersona,
  setAruPersona as saveAruPersona,
  getAruDebriefPolicy,
  setAruDebriefPolicy as saveAruDebriefPolicy,
  getEngineTierStatus,
  chatCompletion,
  type AruPersona,
  type DebriefPolicy,
  type EngineTierStatus,
} from '@/lib/aiClient';

export interface SmartEngineConfig {
  byokKey: string;
  setByokKey: React.Dispatch<React.SetStateAction<string>>;
  byokUrl: string;
  setByokUrl: React.Dispatch<React.SetStateAction<string>>;
  byokModel: string;
  setByokModel: React.Dispatch<React.SetStateAction<string>>;
  selectedProvider: string;
  setSelectedProvider: React.Dispatch<React.SetStateAction<string>>;
  isAmbiguousSk: boolean;
  setIsAmbiguousSk: React.Dispatch<React.SetStateAction<boolean>>;
  showGlow: boolean;
  setShowGlow: React.Dispatch<React.SetStateAction<boolean>>;
  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
  connectionError: string;
  availableModels: string[];
  workingModels: string[];
  latencyMs: number | null;
  isAutoFetching: boolean;
  persona: AruPersona;
  setPersona: (p: AruPersona) => void;
  debriefPolicy: DebriefPolicy;
  setDebriefPolicy: (p: DebriefPolicy) => void;
  engineTier: EngineTierStatus;
  testConnection: (keyToUse?: string, urlToUse?: string) => Promise<void>;
  triggerAruPing: () => Promise<{ success: boolean; latency: number; reply: string }>;
  handleProviderSelect: (id: string) => void;
  handleKeyChange: (val: string) => void;
  handleModelChange: (val: string) => void;
}

export function useSmartEngineConfig(): SmartEngineConfig {
  const [byokKey, setByokKey] = useState(() => localStorage.getItem(AI_KEYS.byokKey) || '');
  const [byokUrl, setByokUrl] = useState(() => localStorage.getItem(AI_KEYS.byokUrl) || DEFAULT_BASE_URL);
  const [byokModel, setByokModel] = useState(() => localStorage.getItem(AI_KEYS.byokModel) || DEFAULT_MODEL);

  const [selectedProvider, setSelectedProvider] = useState(() => {
    const savedUrl = localStorage.getItem(AI_KEYS.byokUrl) || DEFAULT_BASE_URL;
    const preset = PROVIDER_PRESETS.find(p => p.url === savedUrl && p.id !== 'custom');
    return preset ? preset.id : 'custom';
  });

  const [isAmbiguousSk, setIsAmbiguousSk] = useState(false);
  const [showGlow, setShowGlow] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [workingModels, setWorkingModels] = useState<string[]>([]);
  const glowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
    };
  }, []);

  const [persona, setPersonaState] = useState<AruPersona>(() => getAruPersona());
  const [debriefPolicy, setDebriefPolicyState] = useState<DebriefPolicy>(() => getAruDebriefPolicy());
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isAutoFetching, setIsAutoFetching] = useState(false);

  const setPersona = useCallback((p: AruPersona) => {
    setPersonaState(p);
    saveAruPersona(p);
  }, []);

  const setDebriefPolicy = useCallback((p: DebriefPolicy) => {
    setDebriefPolicyState(p);
    saveAruDebriefPolicy(p);
  }, []);

  const engineTier = getEngineTierStatus();

  const testConnection = async (keyToUse = byokKey, urlToUse = byokUrl) => {
    if (!keyToUse.trim()) {
      setConnectionStatus('idle');
      setIsAutoFetching(false);
      return;
    }
    setConnectionStatus('testing');
    setIsAutoFetching(true);
    setConnectionError('');
    const startTime = performance.now();
    try {
      const baseUrl = urlToUse.replace(/\/chat\/completions\/?$/, '').replace(/\/models\/?$/, '');
      const endpoint = baseUrl.endsWith('/') ? `${baseUrl}models` : `${baseUrl}/models`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${keyToUse}`,
          'Content-Type': 'application/json'
        }
      });

      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);

      if (!response.ok) {
        let errData = 'API Error';
        try {
          const errObj = await response.json();
          errData = errObj?.error?.message || errObj?.error || `HTTP ${response.status}`;
        } catch {
          errData = `HTTP ${response.status}`;
        }
        throw new Error(errData);
      }

      const data = await response.json();
      if (data && data.data && Array.isArray(data.data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawModels: string[] = data.data.map((m: any) => m.id);
        
        // Filter out non-chat / guardrail-only / embedding models
        const chatModels = rawModels.filter(m => 
          !m.includes('prompt-guard') && 
          !m.includes('safeguard') && 
          !m.includes('whisper') && 
          !m.includes('embedding')
        );
        const models = chatModels.length > 0 ? chatModels : rawModels;

        // Preferred chat models in order of performance & priority
        const PREFERRED_CHAT_MODELS = [
          'groq/compound-mini',
          'groq/compound',
          'qwen/qwen3.8-27b',
          'qwen/qwen3.6-27b',
          'openai/gpt-oss-120b',
          'openai/gpt-oss-20b',
          'llama-3.3-70b-versatile',
          'llama-3.1-8b-instant',
          'allam-2-7b',
        ];

        let working: string[] = [];
        try {
          working = JSON.parse(localStorage.getItem(AI_KEYS.workingModels) || '[]');
          setWorkingModels(working);
        } catch { /* ignore */ }

        models.sort((a, b) => {
          const aPref = PREFERRED_CHAT_MODELS.indexOf(a);
          const bPref = PREFERRED_CHAT_MODELS.indexOf(b);
          if (aPref !== -1 && bPref !== -1) return aPref - bPref;
          if (aPref !== -1) return -1;
          if (bPref !== -1) return 1;

          const aIdx = working.indexOf(a);
          const bIdx = working.indexOf(b);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return a.localeCompare(b);
        });

        setAvailableModels(models);
        setConnectionStatus('success');

        // Auto-select best model if current byokModel is invalid or not in available models
        const currentModel = localStorage.getItem(AI_KEYS.byokModel) || byokModel;
        if (!currentModel || !models.includes(currentModel)) {
          const bestModel = models[0] || 'groq/compound-mini';
          setByokModel(bestModel);
          localStorage.setItem(AI_KEYS.byokModel, bestModel);
        }
      } else {
        throw new Error('Invalid response format');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionError(err.message || 'Connection failed');
    } finally {
      setIsAutoFetching(false);
    }
  };

  const triggerAruPing = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await chatCompletion([
        { role: 'user', content: 'Say "Aru Neural Core is calibrated and online!" in exactly 7 words.' }
      ], { maxTokens: 25 });
      const lat = Math.round(performance.now() - start);
      setLatencyMs(lat);
      return { success: true, latency: lat, reply: res.text.trim() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const lat = Math.round(performance.now() - start);
      return { success: false, latency: lat, reply: e?.message || 'Inference failed' };
    }
  }, []);

  useEffect(() => {
    if (!byokKey.trim()) {
      setConnectionStatus('idle');
      return;
    }
    const timer = setTimeout(() => {
      testConnection(byokKey, byokUrl);
    }, 450);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byokKey, byokUrl]);

  const handleProviderSelect = (id: string) => {
    setSelectedProvider(id);
    const preset = PROVIDER_PRESETS.find(p => p.id === id);
    if (preset && id !== 'custom') {
      setByokUrl(preset.url);
      localStorage.setItem(AI_KEYS.byokUrl, preset.url);
      setByokModel(preset.model);
      localStorage.setItem(AI_KEYS.byokModel, preset.model);
    }
  };

  const handleKeyChange = (val: string) => {
    setByokKey(val);
    localStorage.setItem(AI_KEYS.byokKey, val);

    let newProviderId = selectedProvider;

    if (val.startsWith('gsk_')) newProviderId = 'groq';
    else if (val.startsWith('sk-or-')) newProviderId = 'openrouter';
    else if (val.startsWith('AIza')) newProviderId = 'google';
    else if (val.includes('.')) newProviderId = 'glm';
    else if (val.startsWith('eyJ')) newProviderId = 'minimax';
    else if (val.startsWith('sk-')) {
      if (selectedProvider !== 'kimi' && selectedProvider !== 'minimax') {
        newProviderId = 'openai';
        setIsAmbiguousSk(true);
      } else {
        setIsAmbiguousSk(false);
      }
    } else {
      setIsAmbiguousSk(false);
    }

    if (newProviderId !== selectedProvider) {
      handleProviderSelect(newProviderId);
      setShowGlow(true);
      if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
      glowTimeoutRef.current = setTimeout(() => setShowGlow(false), 1500);
    }
  };

  const handleModelChange = (val: string) => {
    setByokModel(val);
    localStorage.setItem(AI_KEYS.byokModel, val);
  };

  return {
    byokKey,
    setByokKey,
    byokUrl,
    setByokUrl,
    byokModel,
    setByokModel,
    selectedProvider,
    setSelectedProvider,
    isAmbiguousSk,
    setIsAmbiguousSk,
    showGlow,
    setShowGlow,
    connectionStatus,
    connectionError,
    availableModels,
    workingModels,
    latencyMs,
    isAutoFetching,
    persona,
    setPersona,
    debriefPolicy,
    setDebriefPolicy,
    engineTier,
    testConnection,
    triggerAruPing,
    handleProviderSelect,
    handleKeyChange,
    handleModelChange
  };
}
