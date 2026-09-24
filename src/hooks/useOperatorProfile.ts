import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { appStorage, StorageKeys } from '@/lib/storage';

export interface PublicProfileData {
  /** auth.uid() — the key into mode_scores and ranked_matches. */
  id: string;
  username: string;
  level: number;
  xp: number;
  equipped_title: string;
  unlocked_badges: string[];
  max_wpm: number;
  avg_acc: number;
  tests_completed: number;
  avatar_id?: string;
  banner_id?: string;
}

export interface OperatorCosmetics {
  key: string;
  avatarId: string;
  bannerId: string;
}

interface UseOperatorProfileParams {
  targetUsername: string;
  profileKey: string;
  usesLocalStats: boolean;
  supabase: SupabaseClient | null;
  isOwnProfile: boolean;
}

interface FetchedProfileState {
  key: string;
  row: PublicProfileData | null;
  failed: boolean;
}

const likeEscape = (value: string) => value.replace(/[\\%_]/g, (m) => `\\${m}`);

export function useOperatorProfile({
  targetUsername,
  profileKey,
  usesLocalStats,
  supabase,
  isOwnProfile,
}: UseOperatorProfileParams) {
  const [fetched, setFetched] = useState<FetchedProfileState | null>(null);
  const [cosmetics, setCosmetics] = useState<OperatorCosmetics | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!targetUsername || !supabase) return;

    const key = profileKey;
    const match = likeEscape(targetUsername);
    let active = true;

    if (usesLocalStats) {
      supabase
        .from('public_profiles')
        .select('avatar_id, banner_id')
        .ilike('username', match)
        .maybeSingle()
        .then(
          ({ data }) => {
            if (!active || !data) return;
            const nextAvatar = data.avatar_id || 'default';
            const nextBanner = data.banner_id || 'basic_dark';
            setCosmetics({
              key,
              avatarId: nextAvatar,
              bannerId: nextBanner,
            });
            if (isOwnProfile) {
              appStorage.set(StorageKeys.AVATAR_ID, nextAvatar);
              appStorage.set(StorageKeys.BANNER_ID, nextBanner);
              window.dispatchEvent(new Event('cosmeticsChanged'));
            }
          },
          (err: unknown) => {
            console.warn('[profile] cosmetics fetch failed:', err);
          }
        );

      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from('public_profiles')
          .select('*')
          .ilike('username', match)
          .maybeSingle();

        if (!active) return;
        if (error) throw error;
        setFetched({ key, row: (data as PublicProfileData | null) ?? null, failed: false });
      } catch (err) {
        console.error('[profile] public profile fetch failed:', err);
        if (active) setFetched({ key, row: null, failed: true });
      }
    })();

    return () => {
      active = false;
    };
  }, [targetUsername, profileKey, usesLocalStats, supabase, retryNonce, isOwnProfile]);

  const settled = fetched && fetched.key === profileKey ? fetched : undefined;
  const remote = settled?.row;
  const loading = !usesLocalStats && !settled && !!supabase;
  const notFound = !usesLocalStats && !!settled && settled.row === null && !settled.failed;
  const fetchFailed = !usesLocalStats && (!supabase || (!!settled && settled.failed));

  const retryFetch = useCallback(() => {
    setFetched(null);
    setRetryNonce((n) => n + 1);
  }, []);

  return {
    remote,
    cosmetics,
    setCosmetics,
    loading,
    notFound,
    fetchFailed,
    retryFetch,
  };
}
