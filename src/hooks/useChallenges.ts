import { useState, useEffect, useRef, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

import type { Level, CodeLanguage } from '@/data/constants';

export interface PendingChallenge {
  from: string;
  roomCode: string;
  fromElo: number;
  expiresAt: number;
  mode?: Level;
  words?: number;
  language?: CodeLanguage;
}

interface UseChallengesOptions {
  supabase: SupabaseClient | null;
  username: string | null;
  onAccepted?: (roomCode: string) => void;
}

export function useChallenges({ supabase, username, onAccepted }: UseChallengesOptions) {
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);
  const [sentChallengeTo, setSentChallengeTo] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tempTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const onAcceptedRef = useRef(onAccepted);
  useEffect(() => { onAcceptedRef.current = onAccepted; }, [onAccepted]);
  useEffect(() => {
    return () => {
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
      tempTimersRef.current.forEach(t => clearTimeout(t));
      tempTimersRef.current.clear();
    };
  }, []);

  // Subscribe to incoming challenges when logged in
  useEffect(() => {
    if (!supabase || !username) return;

    const channelName = `challenge:${username}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'challenge_invite' }, ({ payload }: { payload: PendingChallenge }) => {
        // Clear any previous pending challenge
        if (expireTimerRef.current) clearTimeout(expireTimerRef.current);

        const challenge: PendingChallenge = {
          from: payload.from,
          roomCode: payload.roomCode,
          fromElo: payload.fromElo,
          expiresAt: Date.now() + 30_000,
          mode: payload.mode,
          words: payload.words,
          language: payload.language,
        };
        setPendingChallenge(challenge);

        // Auto-expire after 30s
        expireTimerRef.current = setTimeout(() => {
          setPendingChallenge(prev => {
            if (prev?.roomCode === challenge.roomCode) return null;
            return prev;
          });
        }, 30_000);
      })
      .on('broadcast', { event: 'challenge_accepted' }, ({ payload }: { payload: { roomCode: string } }) => {
        setSentChallengeTo(null);
        toast.success('Challenge accepted! Entering race lobby…', { icon: '⚔️' });
        onAcceptedRef.current?.(payload.roomCode);
      })
      .on('broadcast', { event: 'challenge_rejected' }, ({ payload }: { payload: { by: string } }) => {
        setSentChallengeTo(null);
        toast.error(`${payload.by} declined your challenge.`, { icon: '😔' });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [supabase, username]);

  // Send a challenge to a friend
  const sendChallenge = useCallback(async (
    friendUsername: string,
    roomCode: string,
    fromElo: number,
    config?: { mode?: Level; words?: number; language?: CodeLanguage }
  ) => {
    if (!supabase || !username) return;
    const targetChannel = supabase.channel(`challenge:${friendUsername}`);
    await targetChannel.subscribe();
    await targetChannel.send({
      type: 'broadcast',
      event: 'challenge_invite',
      payload: {
        from: username,
        roomCode,
        fromElo,
        expiresAt: Date.now() + 30_000,
        mode: config?.mode || 'NOVICE',
        words: config?.words || 25,
        language: config?.language,
      },
    });
    const scheduleUnsubscribe = (ch: any) => {
      const t = setTimeout(() => {
        ch.unsubscribe();
        tempTimersRef.current.delete(t);
      }, 1000);
      tempTimersRef.current.add(t);
    };

    // Unsubscribe sender's temp channel after a delay
    scheduleUnsubscribe(targetChannel);
    setSentChallengeTo(friendUsername);
  }, [supabase, username]);

  // Respond to a challenge
  const acceptChallenge = useCallback(async () => {
    if (!supabase || !pendingChallenge || !username) return;
    const targetChannel = supabase.channel(`challenge:${pendingChallenge.from}`);
    await targetChannel.subscribe();
    await targetChannel.send({
      type: 'broadcast',
      event: 'challenge_accepted',
      payload: { roomCode: pendingChallenge.roomCode, by: username },
    });
    const t = setTimeout(() => {
      targetChannel.unsubscribe();
      tempTimersRef.current.delete(t);
    }, 1000);
    tempTimersRef.current.add(t);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    const roomCode = pendingChallenge.roomCode;
    setPendingChallenge(null);
    return roomCode;
  }, [supabase, pendingChallenge, username]);

  const rejectChallenge = useCallback(async () => {
    if (!supabase || !pendingChallenge || !username) return;
    const targetChannel = supabase.channel(`challenge:${pendingChallenge.from}`);
    await targetChannel.subscribe();
    await targetChannel.send({
      type: 'broadcast',
      event: 'challenge_rejected',
      payload: { by: username },
    });
    const t = setTimeout(() => {
      targetChannel.unsubscribe();
      tempTimersRef.current.delete(t);
    }, 1000);
    tempTimersRef.current.add(t);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    setPendingChallenge(null);
  }, [supabase, pendingChallenge, username]);

  const clearSentChallenge = useCallback(() => setSentChallengeTo(null), []);

  return { pendingChallenge, sentChallengeTo, sendChallenge, acceptChallenge, rejectChallenge, clearSentChallenge };
}
