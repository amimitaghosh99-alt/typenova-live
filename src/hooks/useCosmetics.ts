import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

const STORAGE_AVATAR_KEY = 'typenova_avatar_id';
const STORAGE_BANNER_KEY = 'typenova_banner_id';

export interface UserCosmetics {
  avatarId: string;
  bannerId: string;
  avatarUrl: string | null;
  updateCosmetics: (avatarId: string, bannerId: string) => void;
  refreshCosmetics: () => Promise<void>;
}

export function useCosmetics(
  username: string | null,
  supabase: SupabaseClient | null,
  authAvatarUrl?: string | null
): UserCosmetics {
  const [avatarId, setAvatarId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_AVATAR_KEY) || 'default';
    } catch {
      return 'default';
    }
  });

  const [bannerId, setBannerId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_BANNER_KEY) || 'basic_dark';
    } catch {
      return 'basic_dark';
    }
  });

  const fetchCosmetics = useCallback(async () => {
    if (!username || !supabase) return;
    try {
      const match = username.replace(/[\\%_]/g, (m) => `\\${m}`);
      const { data, error } = await supabase
        .from('public_profiles')
        .select('avatar_id, banner_id')
        .ilike('username', match)
        .maybeSingle();

      if (error) {
        console.warn('[useCosmetics] fetch failed:', error);
        return;
      }

      if (data) {
        const nextAvatar = data.avatar_id || 'default';
        const nextBanner = data.banner_id || 'basic_dark';
        setAvatarId(nextAvatar);
        setBannerId(nextBanner);
        try {
          localStorage.setItem(STORAGE_AVATAR_KEY, nextAvatar);
          localStorage.setItem(STORAGE_BANNER_KEY, nextBanner);
        } catch {}
      }
    } catch (err) {
      console.warn('[useCosmetics] error:', err);
    }
  }, [username, supabase]);

  useEffect(() => {
    void fetchCosmetics();
  }, [fetchCosmetics]);

  useEffect(() => {
    const handleCosmeticsChanged = () => {
      try {
        const localAvatar = localStorage.getItem(STORAGE_AVATAR_KEY);
        const localBanner = localStorage.getItem(STORAGE_BANNER_KEY);
        if (localAvatar) setAvatarId(localAvatar);
        if (localBanner) setBannerId(localBanner);
      } catch {}
      void fetchCosmetics();
    };

    window.addEventListener('cosmeticsChanged', handleCosmeticsChanged);
    return () => window.removeEventListener('cosmeticsChanged', handleCosmeticsChanged);
  }, [fetchCosmetics]);

  const updateCosmetics = useCallback((newAvatarId: string, newBannerId: string) => {
    setAvatarId(newAvatarId);
    setBannerId(newBannerId);
    try {
      localStorage.setItem(STORAGE_AVATAR_KEY, newAvatarId);
      localStorage.setItem(STORAGE_BANNER_KEY, newBannerId);
    } catch {}
    window.dispatchEvent(new Event('cosmeticsChanged'));
  }, []);

  return useMemo(() => ({
    avatarId,
    bannerId,
    avatarUrl: authAvatarUrl ?? null,
    updateCosmetics,
    refreshCosmetics: fetchCosmetics,
  }), [avatarId, bannerId, authAvatarUrl, updateCosmetics, fetchCosmetics]);
}
