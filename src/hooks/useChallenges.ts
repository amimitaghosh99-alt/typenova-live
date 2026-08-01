import { useState, useEffect, useRef, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface PendingChallenge {
  from: string;
  roomCode: string;
  fromElo: number;
  expiresAt: number;
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
  const onAcceptedRef = useRef(onAccepted);
  useEffect(() => { onAcceptedRef.current = onAccepted; }, [onAccepted]);

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
  const sendChallenge = useCallback(async (friendUsername: string, roomCode: string, fromElo: number) => {
    if (!supabase || !username) return;
    const targetChannel = supabase.channel(`challenge:${friendUsername}`);
    await targetChannel.subscribe();
    await targetChannel.send({
      type: 'broadcast',
      event: 'challenge_invite',
      payload: { from: username, roomCode, fromElo, expiresAt: Date.now() + 30_000 },
    });
    // Unsubscribe sender's temp channel after a delay
    setTimeout(() => targetChannel.unsubscribe(), 1000);
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
    setTimeout(() => targetChannel.unsubscribe(), 1000);
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
    setTimeout(() => targetChannel.unsubscribe(), 1000);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    setPendingChallenge(null);
  }, [supabase, pendingChallenge, username]);

  const clearSentChallenge = useCallback(() => setSentChallengeTo(null), []);

  return { pendingChallenge, sentChallengeTo, sendChallenge, acceptChallenge, rejectChallenge, clearSentChallenge };
}
