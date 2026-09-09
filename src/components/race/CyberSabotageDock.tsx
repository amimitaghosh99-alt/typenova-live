import React, { useEffect, useMemo, memo } from 'react';
import {
  CloudFog,
  Type,
  MoveHorizontal,
  ShieldCheck,
  Zap,
  Radio,
} from 'lucide-react';
import type { Theme } from '@/data/constants';
import {
  HEX_ABILITY_LIST,
  type HexType,
  type ActiveHex,
} from '@/lib/sabotageEngine';

interface CyberSabotageDockProps {
  hexEnergy: number;
  activeHexes: ActiveHex[];
  onCastHex: (hexType: HexType) => boolean;
  theme: Theme;
  disabled?: boolean;
  playSfx?: (sfx: 'hex_cast' | 'cleanse') => void;
}

const HEX_ICONS: Record<HexType, React.ElementType> = {
  glitch_fog: CloudFog,
  capitals_curse: Type,
  caret_inversion: MoveHorizontal,
  cleanse_shield: ShieldCheck,
};

export const CyberSabotageDock = memo(function CyberSabotageDock({
  hexEnergy,
  activeHexes,
  onCastHex,
  theme,
  disabled = false,
  playSfx,
}: CyberSabotageDockProps) {
  const glowPrimary = theme?.glowPrimary || '34, 211, 238';

  // Hotkey listener (Alt+1..4 and F1..F4)
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkey combinations: Alt+1..4 or F1..F4
      let targetHex: HexType | null = null;
      if (e.altKey) {
        if (e.key === '1') targetHex = 'glitch_fog';
        else if (e.key === '2') targetHex = 'capitals_curse';
        else if (e.key === '3') targetHex = 'caret_inversion';
        else if (e.key === '4') targetHex = 'cleanse_shield';
      } else if (e.key === 'F1') {
        targetHex = 'glitch_fog';
      } else if (e.key === 'F2') {
        targetHex = 'capitals_curse';
      } else if (e.key === 'F3') {
        targetHex = 'caret_inversion';
      } else if (e.key === 'F4') {
        targetHex = 'cleanse_shield';
      }

      if (targetHex) {
        e.preventDefault();
        const success = onCastHex(targetHex);
        if (success && playSfx) {
          playSfx(targetHex === 'cleanse_shield' ? 'cleanse' : 'hex_cast');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onCastHex, playSfx]);

  const handleCardClick = (hexType: HexType) => {
    if (disabled) return;
    const success = onCastHex(hexType);
    if (success && playSfx) {
      playSfx(hexType === 'cleanse_shield' ? 'cleanse' : 'hex_cast');
    }
  };

  const hasActiveShield = useMemo(
    () => activeHexes.some(h => h.hexType === 'cleanse_shield'),
    [activeHexes]
  );

  return (
    <div className="w-full max-w-4xl mx-auto mb-4 flex flex-col gap-2 relative z-20 font-mono">
      {/* Tactical Combat Header & Energy Gauge */}
      <div
        className="glass-panel rounded-2xl border p-3.5 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/70 backdrop-blur-md"
        style={{
          borderColor: `rgba(${glowPrimary}, 0.25)`,
          boxShadow: `0 0 20px rgba(${glowPrimary}, 0.08)`,
        }}
      >
        {/* Left: Energy Meter */}
        <div className="flex items-center gap-3 min-w-[200px] flex-1">
          <div
            className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `rgba(${glowPrimary}, 0.12)`,
              borderColor: `rgba(${glowPrimary}, 0.35)`,
              color: `rgb(${glowPrimary})`,
            }}
          >
            <Zap size={16} className={hexEnergy >= 35 ? 'animate-pulse' : ''} />
          </div>

          <div className="flex-1 min-w-[120px]">
            <div className="flex items-center justify-between text-[10px] font-black tracking-widest uppercase mb-1">
              <span className="text-zinc-400 flex items-center gap-1">
                HEX ENERGY
              </span>
              <span
                className="font-bold"
                style={{ color: `rgb(${glowPrimary})` }}
              >
                {Math.round(hexEnergy)}%
              </span>
            </div>

            {/* Gauge progress track */}
            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, hexEnergy))}%`,
                  backgroundColor: `rgb(${glowPrimary})`,
                  boxShadow: `0 0 10px rgba(${glowPrimary}, 0.8)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Center/Right: 4 Cyber Sabotage Ability Cards */}
        <div className="flex items-center gap-2 flex-wrap">
          {HEX_ABILITY_LIST.map((ability) => {
            const isReady = hexEnergy >= ability.cost && !disabled;
            const Icon = HEX_ICONS[ability.id] || Radio;

            return (
              <button
                key={ability.id}
                type="button"
                onClick={() => handleCardClick(ability.id)}
                disabled={!isReady}
                title={`${ability.name} (${ability.description}) - Hotkey: ${ability.hotkeyLabel}`}
                className={`group relative px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 text-left ${
                  isReady
                    ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-md'
                    : 'opacity-40 cursor-not-allowed border-white/5 bg-white/[0.02]'
                }`}
                style={
                  isReady
                    ? {
                        backgroundColor: `rgba(${ability.accentColor}, 0.12)`,
                        borderColor: `rgba(${ability.accentColor}, 0.45)`,
                        boxShadow: `0 0 12px rgba(${ability.accentColor}, 0.20)`,
                      }
                    : undefined
                }
              >
                <div
                  className="p-1 rounded-lg shrink-0"
                  style={{
                    color: isReady ? `rgb(${ability.accentColor})` : '#71717a',
                  }}
                >
                  <Icon size={14} />
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black tracking-wider uppercase text-white truncate">
                      {ability.name}
                    </span>
                    <span
                      className="text-[8px] font-mono px-1 py-0.2 rounded border bg-black/40"
                      style={{
                        borderColor: isReady
                          ? `rgba(${ability.accentColor}, 0.4)`
                          : 'rgba(255,255,255,0.1)',
                        color: isReady ? `rgb(${ability.accentColor})` : '#a1a1aa',
                      }}
                    >
                      {ability.hotkeyLabel}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-0.5 text-[9px] text-zinc-400 font-bold font-mono">
                    <Zap size={10} className="text-amber-400 shrink-0" /> {ability.cost}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Hexes Warning & Deflection Banner */}
      {activeHexes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-1">
          {activeHexes.map((hex) => {
            const def = HEX_ABILITY_LIST.find((a) => a.id === hex.hexType);
            const remainingSec = Math.max(
              0,
              ((hex.expiresAt - Date.now()) / 1000).toFixed(1) as unknown as number
            );
            const isDefense = hex.hexType === 'cleanse_shield';
            const Icon = HEX_ICONS[hex.hexType] || Radio;

            return (
              <div
                key={hex.id}
                className="px-3 py-1 rounded-full border flex items-center gap-2 text-[10px] font-black tracking-wider uppercase backdrop-blur-md animate-pulse"
                style={{
                  backgroundColor: `rgba(${def?.accentColor || '239, 68, 68'}, 0.15)`,
                  borderColor: `rgba(${def?.accentColor || '239, 68, 68'}, 0.5)`,
                  color: `rgb(${def?.accentColor || '239, 68, 68'})`,
                  boxShadow: `0 0 10px rgba(${def?.accentColor || '239, 68, 68'}, 0.25)`,
                }}
              >
                <Icon size={12} />
                <span>
                  {isDefense ? 'SHIELD BARRIER' : `HEX: ${def?.name || hex.hexType}`}{' '}
                  [{remainingSec}s]
                </span>
                {!isDefense && (
                  <span className="text-[9px] text-zinc-300 font-normal">
                    from {hex.fromName}
                  </span>
                )}
              </div>
            );
          })}

          {hasActiveShield && (
            <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">
              • FIREWALL ACTIVE (DEFLECTING RIVAL HEXES)
            </span>
          )}
        </div>
      )}
    </div>
  );
});
