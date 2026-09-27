import { describe, it, expect } from './testHarness';
import { clearLocalProgress } from '../lib/progress';

export function runBatch10AuthMultiplayerTests() {
  describe('Batch 10: Auth Lifecycle, Cloud Sync Race Guards & Multiplayer Host Migration', () => {

    it('AUTH-01: clearLocalProgress purges all local keys on SIGNED_OUT to prevent account contamination', () => {
      // Seed mock progress
      localStorage.setItem('typezen_xp', '500');
      localStorage.setItem('typezen_daily', JSON.stringify({ streak: 5 }));
      localStorage.setItem('typenova_daily', JSON.stringify({ streak: 5 }));
      localStorage.setItem('typenova_history', JSON.stringify([{ wpm: 120 }]));
      localStorage.setItem('typenova_active_title', 'speed_demon');
      localStorage.setItem('typenova_guest_mode', 'true');

      // Execute purge
      clearLocalProgress();

      // Ensure storage was wiped
      expect(localStorage.getItem('typezen_xp')).toBe(null);
      expect(localStorage.getItem('typezen_daily')).toBe(null);
      expect(localStorage.getItem('typenova_daily')).toBe(null);
      expect(localStorage.getItem('typenova_history')).toBe(null);
      expect(localStorage.getItem('typenova_active_title')).toBe(null);
      expect(localStorage.getItem('typenova_guest_mode')).toBe(null);
    });

    it('SYNC-01: pushProgress queues concurrent sync requests and aborts when unauthenticated', () => {
      let isPushing = false;
      let pendingPush = false;
      let pushedPayloads: string[] = [];
      let activeSession: { id: string } | null = { id: 'user-1' };
      let syncedUser: string | null = 'user-1';

      const pushProgress = (payload: string) => {
        if (!activeSession || syncedUser !== activeSession.id) return;
        if (isPushing) {
          pendingPush = true;
          return;
        }
        isPushing = true;
        pushedPayloads.push(payload);
        // Simulate async cloud call completion
        isPushing = false;
        if (pendingPush && activeSession && syncedUser === activeSession.id) {
          pendingPush = false;
          pushProgress('queued-update');
        }
      };

      // First push succeeds
      pushProgress('update-1');
      expect(pushedPayloads).toEqual(['update-1']);

      // Concurrent push during push
      isPushing = true;
      pushProgress('update-2'); // Should queue
      expect(pendingPush).toBe(true);

      // Simulate completion & drain
      isPushing = false;
      if (pendingPush && activeSession && syncedUser === activeSession.id) {
        pendingPush = false;
        pushProgress('queued-update');
      }
      expect(pushedPayloads).toEqual(['update-1', 'queued-update']);

      // Now simulate user logging out before queued push fires
      activeSession = null;
      syncedUser = null;
      pushProgress('post-logout-attempt');
      // Should NOT push after logout!
      expect(pushedPayloads.length).toBe(2);
    });

    it('RACE-01: Host election preserves current host against client clock drift or skewed joinedAt', () => {
      interface Racer {
        id: string;
        joinedAt: number;
        isHost?: boolean;
        roomState?: 'lobby' | 'racing';
      }

      let hostIdRef: string | null = 'host-player-a';
      const myId = 'host-player-a';
      const mode = 'create';

      // Joiner B joins with clock skewed 10 seconds into the past (joinedAt = 90)
      const mapped: Racer[] = [
        { id: 'host-player-a', joinedAt: 100, isHost: true, roomState: 'lobby' },
        { id: 'joiner-player-b', joinedAt: 90, isHost: false },
      ];

      const currentHostStillPresent = Boolean(hostIdRef && mapped.some(p => p.id === hostIdRef));
      let hostId: string;
      if (currentHostStillPresent) {
        hostId = hostIdRef!;
      } else {
        const sorted = [...mapped].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
        hostId = sorted[0]?.id ?? myId;
      }

      // Host A must NOT be usurped by Joiner B's skewed timestamp!
      expect(currentHostStillPresent).toBe(true);
      expect(hostId).toBe('host-player-a');
    });

    it('RACE-02: Late joiner with clock skew recognizes existing host and does not usurp host', () => {
      interface Racer {
        id: string;
        joinedAt: number;
        isHost?: boolean;
        roomState?: 'lobby' | 'racing';
      }

      let hostIdRef: string | null = null; // Joiner starts with null hostIdRef
      const myId = 'joiner-player-b';
      const mode = 'join';

      // Host A created the room earlier, but Joiner B has a skewed system clock (joinedAt = 50 vs Host A's 100)
      const mapped: Racer[] = [
        { id: 'host-player-a', joinedAt: 100, isHost: true, roomState: 'lobby' },
        { id: 'joiner-player-b', joinedAt: 50, isHost: false },
      ];

      const currentHostStillPresent = Boolean(hostIdRef && mapped.some(p => p.id === hostIdRef));
      let hostId: string;
      if (currentHostStillPresent) {
        hostId = hostIdRef!;
      } else {
        const existingHost = mapped.find(p => p.id !== myId && (p.isHost || p.roomState));
        if (existingHost && mode === 'join') {
          hostId = existingHost.id;
        } else {
          const sorted = [...mapped].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
          hostId = sorted[0]?.id ?? myId;
        }
      }

      // Joiner B recognizes Host A as the legitimate host despite Joiner B's clock skew!
      expect(hostId).toBe('host-player-a');
    });

    it('RACE-03: Host migration on host disconnect promotes earliest remaining player and resets countdown', () => {
      interface Racer {
        id: string;
        joinedAt: number;
        isHost?: boolean;
      }

      let hostIdRef: string | null = 'host-player-a';
      const myId = 'player-b';
      let status = 'lobby';
      let countdown: number | null = 3;
      let rematchBroadcastSent = false;
      let selfIsHost = false;

      // Host A disconnects, leaving Player B (joinedAt 110) and Player C (joinedAt 120)
      const mapped: Racer[] = [
        { id: 'player-b', joinedAt: 110 },
        { id: 'player-c', joinedAt: 120 },
      ];

      const currentHostStillPresent = Boolean(hostIdRef && mapped.some(p => p.id === hostIdRef));
      let hostId: string;
      if (currentHostStillPresent) {
        hostId = hostIdRef!;
      } else {
        const sorted = [...mapped].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
        hostId = sorted[0]?.id ?? myId;
      }
      hostIdRef = hostId;
      const amHost = hostId === myId;

      const wasHost = selfIsHost;
      if (amHost && !wasHost) {
        selfIsHost = true;
        countdown = null;
        if (status !== 'racing' && status !== 'finished') {
          status = 'lobby';
          rematchBroadcastSent = true;
        }
      }

      expect(currentHostStillPresent).toBe(false);
      expect(hostId).toBe('player-b');
      expect(amHost).toBe(true);
      expect(selfIsHost).toBe(true);
      expect(countdown).toBe(null);
      expect(status).toBe('lobby');
      expect(rematchBroadcastSent).toBe(true);
    });

    it('MATCH-01: Matchmaking broadcast handlers reject events after channel teardown', () => {
      let activeChannel: { name: string } | null = null;
      let state = { status: 'idle' };
      let messagesSent: string[] = [];

      const ch1 = { name: 'queue-ch1' };
      activeChannel = ch1;
      state = { status: 'searching' };

      const handleSeekPing = (senderCh: typeof ch1, senderId: string) => {
        if (activeChannel !== senderCh) return;
        messagesSent.push(`offer-to-${senderId}`);
      };

      const handleMatchConfirm = (senderCh: typeof ch1, roomCode: string) => {
        if (activeChannel !== senderCh) return;
        state = { status: 'found' };
      };

      // Handle ping while active
      handleSeekPing(ch1, 'peer-1');
      expect(messagesSent).toEqual(['offer-to-peer-1']);

      // Teardown / cancel matchmaking
      activeChannel = null;
      state = { status: 'idle' };

      // In-flight delayed frames arrive on ch1
      handleSeekPing(ch1, 'peer-2');
      handleMatchConfirm(ch1, 'ROOM99');

      // Must be ignored! No messages sent and state stays idle
      expect(messagesSent).toEqual(['offer-to-peer-1']);
      expect(state.status).toBe('idle');
    });

  });
}
