import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
        toast.success('Challenge accepted! Entering race lobby…');
        onAcceptedRef.current?.(payload.roomCode);
      })
      .on('broadcast', { event: 'challenge_rejected' }, ({ payload }: { payload: { by: string } }) => {
        setSentChallengeTo(null);
        toast.error(`${payload.by} declined your challenge.`);
      })
      .subscribe();

    return () => {
      if (supabase && channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [supabase, username]);

  const subscribeChannel = (targetChannel: any): Promise<void> => {
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 3000);
      targetChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  };

  const scheduleUnsubscribe = useCallback((ch: any) => {
    const t = setTimeout(() => {
      if (supabase) {
        supabase.removeChannel(ch);
      } else {
        ch.unsubscribe();
      }
      tempTimersRef.current.delete(t);
    }, 1500);
    tempTimersRef.current.add(t);
  }, [supabase]);

  // Send a challenge to a friend
  const sendChallenge = useCallback(async (
    friendUsername: string,
    roomCode: string,
    fromElo: number,
    config?: { mode?: Level; words?: number; language?: CodeLanguage }
  ) => {
    if (!supabase || !username) return;
    const targetChannel = supabase.channel(`challenge:${friendUsername}`);
    await subscribeChannel(targetChannel);
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

    // Unsubscribe sender's temp channel after a delay
    scheduleUnsubscribe(targetChannel);
    setSentChallengeTo(friendUsername);
  }, [supabase, username, scheduleUnsubscribe]);

  // Respond to a challenge
  const acceptChallenge = useCallback(async () => {
    if (!supabase || !pendingChallenge || !username) return;
    const targetChannel = supabase.channel(`challenge:${pendingChallenge.from}`);
    await subscribeChannel(targetChannel);
    await targetChannel.send({
      type: 'broadcast',
      event: 'challenge_accepted',
      payload: { roomCode: pendingChallenge.roomCode, by: username },
    });
    scheduleUnsubscribe(targetChannel);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    const roomCode = pendingChallenge.roomCode;
    setPendingChallenge(null);
    return roomCode;
  }, [supabase, pendingChallenge, username, scheduleUnsubscribe]);

  const rejectChallenge = useCallback(async () => {
    if (!supabase || !pendingChallenge || !username) return;
    const targetChannel = supabase.channel(`challenge:${pendingChallenge.from}`);
    await subscribeChannel(targetChannel);
    await targetChannel.send({
      type: 'broadcast',
      event: 'challenge_rejected',
      payload: { by: username },
    });
    scheduleUnsubscribe(targetChannel);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    setPendingChallenge(null);
  }, [supabase, pendingChallenge, username, scheduleUnsubscribe]);

  const clearSentChallenge = useCallback(() => setSentChallengeTo(null), []);

  return useMemo(() => ({
    pendingChallenge,
    sentChallengeTo,
    sendChallenge,
    acceptChallenge,
    rejectChallenge,
    clearSentChallenge
  }), [pendingChallenge, sentChallengeTo, sendChallenge, acceptChallenge, rejectChallenge, clearSentChallenge]);
}
