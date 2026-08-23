import { useState, useEffect, useRef } from 'react';
import { AI_KEYS, PROVIDER_PRESETS, DEFAULT_BASE_URL, DEFAULT_MODEL } from '@/lib/aiClient';

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
  testConnection: (keyToUse?: string, urlToUse?: string) => Promise<void>;
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

  const testConnection = async (keyToUse = byokKey, urlToUse = byokUrl) => {
    if (!keyToUse.trim()) return;
    setConnectionStatus('testing');
    setConnectionError('');
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
        const models: string[] = data.data.map((m: any) => m.id);
        
        let working: string[] = [];
        try {
          working = JSON.parse(localStorage.getItem(AI_KEYS.workingModels) || '[]');
          setWorkingModels(working);
        } catch { /* ignore */ }

        models.sort((a, b) => {
          const aIdx = working.indexOf(a);
          const bIdx = working.indexOf(b);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return a.localeCompare(b);
        });

        setAvailableModels(models);
        setConnectionStatus('success');
      } else {
        throw new Error('Invalid response format');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionError(err.message || 'Connection failed');
    }
  };

  useEffect(() => {
    if (!byokKey.trim()) {
      setConnectionStatus('idle');
      return;
    }
    const timer = setTimeout(() => {
      testConnection(byokKey, byokUrl);
    }, 800);
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
    testConnection,
    handleProviderSelect,
    handleKeyChange,
    handleModelChange
  };
}
