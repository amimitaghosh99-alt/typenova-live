import React, { useState } from 'react';
import { X, Check, Lock, Palette } from 'lucide-react';
import { ALL_BANNERS, AVATARS } from '../data/customization';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ProfileCustomizationMenuProps {
  supabase: SupabaseClient | null;
  username?: string;
  currentAvatarId: string;
  currentBannerId: string;
  userStats: { level: number; wpm: number; combo: number };
  onClose: () => void;
  onUpdate: (avatarId: string, bannerId: string) => void;
}

export const ProfileCustomizationMenu = React.memo(function ProfileCustomizationMenu({
  supabase,
  username,
  currentAvatarId,
  currentBannerId,
  userStats,
  onClose,
  onUpdate
}: ProfileCustomizationMenuProps) {
  const [activeTab, setActiveTab] = useState<'avatar' | 'banner'>('banner');
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatarId || 'default');
  const [selectedBanner, setSelectedBanner] = useState(currentBannerId || 'basic_dark');
  const [isSaving, setIsSaving] = useState(false);

  const canUnlockBanner = (condition?: { type: string, value: number }) => {
    if (!condition) return true;
    if (condition.type === 'level') return userStats.level >= condition.value;
    if (condition.type === 'wpm') return userStats.wpm >= condition.value;
    if (condition.type === 'combo') return userStats.combo >= condition.value;
    return false;
  };

  const handleSave = async () => {
    if (!supabase || !username) return;
    setIsSaving(true);
    try {
      // Get the current user's auth ID — RLS requires auth.uid() = id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('public_profiles')
        .update({
          avatar_id: selectedAvatar,
          banner_id: selectedBanner
        })
        .eq('id', user.id);
      
      if (error) throw error;
      onUpdate(selectedAvatar, selectedBanner);
      onClose();
    } catch (err) {
      console.error('Failed to update customization:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden lucid-scale" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            <Palette className="text-cyan-400" /> Customize Profile
          </h2>
          <button onClick={onClose} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800/50 px-8 pt-4 gap-6 bg-zinc-900/20">
          <button 
            onClick={() => setActiveTab('banner')}
            className={`pb-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 ${activeTab === 'banner' ? 'text-cyan-400 border-cyan-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            Profile Banners
          </button>
          <button 
            onClick={() => setActiveTab('avatar')}
            className={`pb-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 ${activeTab === 'avatar' ? 'text-cyan-400 border-cyan-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            Avatar Icons
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-950">
          
          {activeTab === 'avatar' && (
            <div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {AVATARS.map(avatar => {
                  const Icon = avatar.icon;
                  const isSelected = selectedAvatar === avatar.id;
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center p-3 gap-1.5 transition-all duration-200 border-2 overflow-hidden group ${
                        isSelected
                          ? `scale-105 border-white ${avatar.gradient} ${avatar.iconColor} shadow-xl`
                          : `bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-500 hover:scale-102 hover:bg-zinc-800`
                      }`}
                      style={isSelected ? { boxShadow: `0 0 25px rgba(${avatar.glowColor}, 0.5)` } : undefined}
                    >
                      {/* Ambient background accent for unselected items */}
                      {!isSelected && (
                        <div className={`absolute inset-0 opacity-15 ${avatar.gradient} group-hover:opacity-30 transition-opacity`} />
                      )}
                      
                      <div className={`relative z-10 p-2 rounded-xl ${isSelected ? 'bg-black/30 backdrop-blur-sm' : `${avatar.gradient} ${avatar.iconColor} shadow-md`}`}>
                        <Icon size={22} strokeWidth={2.2} />
                      </div>
                      
                      <span className={`relative z-10 text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                        {avatar.name}
                      </span>
                      
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 bg-white text-slate-950 p-1 rounded-full shadow-lg z-20">
                          <Check size={10} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'banner' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ALL_BANNERS.map(banner => {
                const isUnlocked = canUnlockBanner(banner.unlockCondition as any);
                const isSelected = selectedBanner === banner.id;
                
                return (
                  <button
                    key={banner.id}
                    disabled={!isUnlocked}
                    onClick={() => setSelectedBanner(banner.id)}
                    className={`relative overflow-hidden rounded-2xl border-2 transition-all text-left group ${isSelected ? 'border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : !isUnlocked ? 'border-zinc-900 opacity-50 cursor-not-allowed' : 'border-zinc-800 hover:border-zinc-600'}`}
                  >
                    {/* Banner Background */}
                    <div className={`absolute inset-0 ${banner.bgClass} ${!isUnlocked ? 'grayscale brightness-50' : ''}`} />
                    
                    {/* Content Overlay */}
                    <div className="relative z-10 p-6 bg-gradient-to-t from-black/70 to-transparent min-h-[120px] flex flex-col justify-end">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                            {banner.name}
                            {banner.type === 'premium' && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px]">PREMIUM</span>}
                          </h4>
                          {isSelected && <div className="text-cyan-400 bg-cyan-500/20 p-1.5 rounded-full"><Check size={14} strokeWidth={3} /></div>}
                        </div>
                        <p className="text-xs text-zinc-300 font-mono">{banner.description}</p>
                      </div>

                      {!isUnlocked && banner.unlockCondition && (
                        <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/20 px-3 py-1.5 rounded-lg w-max border border-red-500/30">
                          <Lock size={12} /> {banner.unlockCondition.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
          <button 
            disabled={isSaving || (selectedAvatar === currentAvatarId && selectedBanner === currentBannerId)}
            onClick={handleSave}
            className="px-8 py-3 bg-cyan-500 text-black font-black uppercase tracking-widest text-sm rounded-xl hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Equip Selection'}
          </button>
        </div>

      </div>
    </div>
  );
});
