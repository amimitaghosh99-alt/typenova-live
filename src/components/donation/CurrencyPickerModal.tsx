import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Globe,
  Check,
  Sparkles,
} from 'lucide-react';
import type { Theme } from '@/data/constants';
import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type CurrencyRegion,
  POPULAR_CURRENCIES,
} from '@/data/currencies';

export interface CurrencyPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCurrency: CurrencyCode;
  onSelectCurrency: (currency: CurrencyCode) => void;
  theme: Theme;
}

type RegionFilter = 'all' | CurrencyRegion;

const REGION_TABS: { id: RegionFilter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'asia_pacific', label: 'ASIA-PACIFIC' },
  { id: 'europe', label: 'EUROPE' },
  { id: 'americas', label: 'AMERICAS' },
  { id: 'middle_east', label: 'MIDDLE EAST' },
  { id: 'africa', label: 'AFRICA' },
];

export const CurrencyPickerModal: React.FC<CurrencyPickerModalProps> = ({
  isOpen,
  onClose,
  selectedCurrency,
  onSelectCurrency,
  theme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRegion, setActiveRegion] = useState<RegionFilter>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const gp = theme.glowPrimary;

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setActiveRegion('all');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter currency list
  const filteredCurrencies = useMemo(() => {
    const all = Object.values(SUPPORTED_CURRENCIES);
    const query = searchQuery.trim().toLowerCase();

    return all.filter((curr) => {
      // 1. Region filter
      if (activeRegion !== 'all' && curr.region !== activeRegion) {
        return false;
      }
      // 2. Search query filter
      if (!query) return true;
      return (
        curr.code.toLowerCase().includes(query) ||
        curr.name.toLowerCase().includes(query) ||
        curr.symbol.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, activeRegion]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl rounded-[2rem] p-1 bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-white/[0.08] border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.9)] relative my-auto z-10"
        >
          <div className="p-5 sm:p-7 rounded-[calc(2rem-0.25rem)] bg-[#07090e]/95 border border-white/[0.08] space-y-5 backdrop-blur-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: `rgba(${gp}, 0.15)`,
                    borderColor: `rgba(${gp}, 0.4)`,
                    color: `rgb(${gp})`,
                    boxShadow: `0 0 16px rgba(${gp}, 0.25)`,
                  }}
                >
                  <Globe size={19} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                    Global Currency Directory
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider border"
                      style={{
                        backgroundColor: `rgba(${gp}, 0.1)`,
                        borderColor: `rgba(${gp}, 0.3)`,
                        color: `rgb(${gp})`,
                      }}
                    >
                      {Object.keys(SUPPORTED_CURRENCIES).length} CURRENCIES
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    Select your domestic currency for live checkout & automated title accreditation.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer"
                title="Close currency directory"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code (SGD, AED, EUR), currency name, or symbol..."
                className="w-full pl-11 pr-10 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Region Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {REGION_TABS.map((tab) => {
                const isActive = activeRegion === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveRegion(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                    style={isActive ? { color: `rgb(${gp})`, borderColor: `rgba(${gp}, 0.4)` } : {}}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Currencies Grid */}
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-1 -mr-1">
              {filteredCurrencies.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                  No currencies match &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredCurrencies.map((curr) => {
                    const isSelected = selectedCurrency.toUpperCase() === curr.code;
                    return (
                      <button
                        key={curr.code}
                        onClick={() => {
                          onSelectCurrency(curr.code);
                          onClose();
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all group cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.08] text-white'
                            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-white/15 text-zinc-300'
                        }`}
                        style={
                          isSelected
                            ? {
                                borderColor: `rgba(${gp}, 0.5)`,
                                backgroundColor: `rgba(${gp}, 0.1)`,
                              }
                            : {}
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 border border-white/10 bg-white/[0.04]"
                            style={isSelected ? { color: `rgb(${gp})` } : {}}
                          >
                            {curr.symbol}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-sm text-white">
                                {curr.code}
                              </span>
                              {curr.isZeroDecimal && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  0-dec
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 truncate max-w-[150px]">
                              {curr.name}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className="text-right">
                            <div className="text-[10px] font-mono text-zinc-500">
                              1 USD ≈
                            </div>
                            <div className="text-xs font-mono font-semibold text-zinc-400">
                              {curr.rateToUsd >= 100
                                ? Math.round(curr.rateToUsd).toLocaleString()
                                : curr.rateToUsd}
                            </div>
                          </div>
                          {isSelected && (
                            <Check size={16} style={{ color: `rgb(${gp})` }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-white/[0.06] text-xs font-mono text-zinc-400 gap-2">
              <div className="flex items-center gap-2">
                <Sparkles size={13} style={{ color: `rgb(${gp})` }} />
                <span>Automatic live forex rates. All global Visa, Mastercard & Amex cards accepted.</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">Quick:</span>
                {POPULAR_CURRENCIES.slice(0, 5).map((code) => (
                  <button
                    key={code}
                    onClick={() => {
                      onSelectCurrency(code);
                      onClose();
                    }}
                    className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 hover:text-white"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
