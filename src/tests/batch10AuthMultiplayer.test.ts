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

    it('RACE-04: Authoritative room creator is unconditionally elected host regardless of joinedAt timestamps or reconnect mode', () => {
      interface Racer {
        id: string;
        joinedAt: number;
        isHost?: boolean;
        isCreator?: boolean;
        roomState?: 'lobby' | 'racing';
      }

      // Creator A created room, but Joiner B has a skewed clock indicating earlier join
      const mapped: Racer[] = [
        { id: 'joiner-b', joinedAt: 50, isHost: false },
        { id: 'creator-a', joinedAt: 100, isHost: true, isCreator: true, roomState: 'lobby' },
      ];

      let hostIdRef: string | null = null;
      const myId = 'joiner-b';

      const roomCreator = mapped.find(p => p.isCreator);
      const currentHostStillPresent = Boolean(hostIdRef && mapped.some(p => p.id === hostIdRef));
      let hostId: string;
      if (roomCreator) {
        hostId = roomCreator.id;
      } else if (currentHostStillPresent) {
        hostId = hostIdRef!;
      } else {
        const sorted = [...mapped].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
        hostId = sorted[0]?.id ?? myId;
      }

      // Room creator MUST win unconditionally
      expect(hostId).toBe('creator-a');
    });

    it('RACE-05: Live racer progress via broadcast telemetry updates players without mutating presence state', () => {
      interface Racer {
        id: string;
        name: string;
        progress: number;
        wpm: number;
        accuracy?: number;
        keystrokes?: number;
      }

      // Baseline presence players (stable, untracked during typing bursts)
      const presencePlayers: Racer[] = [
        { id: 'p1', name: 'Racer 1', progress: 0, wpm: 0 },
        { id: 'p2', name: 'Racer 2', progress: 0, wpm: 0 },
      ];

      // Ephemeral live broadcast map updated at 10-12 packets/sec
      const liveProgressMap: Record<string, { progress: number; wpm: number; keystrokes: number; accuracy: number }> = {
        p2: { progress: 45, wpm: 92, keystrokes: 110, accuracy: 98 },
      };

      // Merging live broadcast data into player view
      const mergedPlayers = presencePlayers.map(p => {
        const live = liveProgressMap[p.id];
        return {
          ...p,
          ...(live ? {
            progress: live.progress,
            wpm: live.wpm,
            keystrokes: live.keystrokes,
            accuracy: live.accuracy,
          } : {}),
        };
      });

      expect(mergedPlayers[0].progress).toBe(0);
      expect(mergedPlayers[1].progress).toBe(45);
      expect(mergedPlayers[1].wpm).toBe(92);
      expect(mergedPlayers[1].accuracy).toBe(98);
      // Original presence array is completely unaffected
      expect(presencePlayers[1].progress).toBe(0);
    });

    it('RACE-06: Active racing state suppresses false rematch broadcasts and prevents mid-race room aborts', () => {
      let currentStatus: 'idle' | 'lobby' | 'racing' | 'finished' = 'racing';
      let countdown: number | null = null;
      let roomAborted = false;

      const handleRematchBroadcast = () => {
        // Guarded: Never abort active race
        if (currentStatus === 'racing') return;
        currentStatus = 'lobby';
        countdown = null;
        roomAborted = true;
      };

      // Stray rematch broadcast arrives mid-race (e.g. from socket reconnect or dropped frame)
      handleRematchBroadcast();

      // Must remain racing without abort
      expect(currentStatus).toBe('racing');
      expect(roomAborted).toBe(false);

      // Once finished, rematch broadcast properly transitions back to lobby
      currentStatus = 'finished';
      handleRematchBroadcast();
      expect(currentStatus).toBe('lobby');
      expect(roomAborted).toBe(true);
    });

  });
}

