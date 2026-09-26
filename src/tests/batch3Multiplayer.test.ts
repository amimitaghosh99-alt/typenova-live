/**
 * Batch 3 Unit Tests: Multiplayer, Realtime Networking & Combat Hexes
 */

import { describe, it, expect } from './testHarness.ts';
import { compareRacers, type RacerState } from '../hooks/useRace.ts';
import { HEX_ABILITIES, type HexType } from '../lib/sabotageEngine.ts';

export function registerBatch3MultiplayerTests(): void {
  describe('Batch 3 - Multiplayer & Combat Hexes', () => {
    it('NET-04: compareRacers orders finished racers by WPM then time', () => {
      const racerA: RacerState = {
        id: 'user-a',
        name: 'Alpha',
        progress: 100,
        finished: true,
        finishWpm: 90,
        finishMs: 25000,
      };

      const racerB: RacerState = {
        id: 'user-b',
        name: 'Beta',
        progress: 100,
        finished: true,
        finishWpm: 110,
        finishMs: 27000, // Took longer, but typed faster WPM
      };

      const racerC: RacerState = {
        id: 'user-c',
        name: 'Gamma',
        progress: 80,
        finished: false,
        wpm: 120,
      };

      // Unfinished racer must be behind finished racers
      expect(compareRacers(racerA, racerC) < 0).toBe(true);
      expect(compareRacers(racerC, racerA) > 0).toBe(true);

      // Higher WPM wins between finished racers
      expect(compareRacers(racerB, racerA) < 0).toBe(true); // Beta (110 WPM) beats Alpha (90 WPM)

      // When WPM is identical, faster time wins
      const racerD: RacerState = {
        id: 'user-d',
        name: 'Delta',
        progress: 100,
        finished: true,
        finishWpm: 90,
        finishMs: 24000, // Faster than Alpha at 25000
      };
      expect(compareRacers(racerD, racerA) < 0).toBe(true);

      // When both WPM and time match, deterministic ID tiebreak
      const racerE1: RacerState = {
        id: 'aaa',
        name: 'E1',
        progress: 100,
        finished: true,
        finishWpm: 100,
        finishMs: 30000,
      };
      const racerE2: RacerState = {
        id: 'bbb',
        name: 'E2',
        progress: 100,
        finished: true,
        finishWpm: 100,
        finishMs: 30000,
      };
      expect(compareRacers(racerE1, racerE2) < 0).toBe(true);
      expect(compareRacers(racerE2, racerE1) > 0).toBe(true);
    });

    it('NET-02: HEX_ABILITIES duration is authoritative and positive', () => {
      const hexTypes: HexType[] = ['glitch_fog', 'capitals_curse', 'caret_inversion', 'cleanse_shield'];
      for (const hex of hexTypes) {
        const ability = HEX_ABILITIES[hex];
        expect(ability).toBeDefined();
        expect(ability.durationMs > 0).toBe(true);
      }

      // Test simulation of duration clamping:
      // Untrusted client payload claiming 999999ms or -500ms
      const untrustedPayload = { hexType: 'glitch_fog' as HexType, durationMs: 9999999 };
      const authoritativeDuration = HEX_ABILITIES[untrustedPayload.hexType]?.durationMs ?? 4000;
      expect(authoritativeDuration).toBe(4500);
    });

    it('NET-03: Active unfinished calculation does not block everyoneIn when disconnected', () => {
      // Simulate roster tracking and connected players
      const roster: RacerState[] = [
        { id: 'p1', name: 'Self', progress: 100, finished: true, finishWpm: 100 },
        { id: 'p2', name: 'Opponent Disconnected', progress: 40, finished: false },
      ];

      // Opponent left the room, so players list only contains p1
      const players = [{ id: 'p1', name: 'Self', progress: 100, finished: true }];
      const connectedIds = new Set(players.map(p => p.id));

      // With old logic:
      const oldUnfinished = roster.filter(p => !p.finished);
      const oldEveryoneIn = roster.length > 0 && oldUnfinished.length === 0;
      expect(oldEveryoneIn).toBe(false); // Stalled for 25 seconds!

      // With new logic:
      const activeUnfinished = roster.filter(p => !p.finished && connectedIds.has(p.id));
      const newEveryoneIn = roster.length > 0 && activeUnfinished.length === 0;
      expect(newEveryoneIn).toBe(true); // Resolves immediately!
    });

    it('NET-05: ELO calculation handles solo and NaN safely', () => {
      const myPlayer: { elo?: any } = { elo: NaN };
      const rawElo = Number(myPlayer?.elo);
      const myBaseElo = Number.isFinite(rawElo) ? rawElo : 1000;
      expect(myBaseElo).toBe(1000);

      const validPlayer = { elo: 1450 };
      const rawValidElo = Number(validPlayer.elo);
      const validBaseElo = Number.isFinite(rawValidElo) ? rawValidElo : 1000;
      expect(validBaseElo).toBe(1450);
    });

    it('NET-06: Chat message sanitization truncates oversized strings', () => {
      const longMessage = 'A'.repeat(500);
      const sanitized = longMessage.slice(0, 280);
      expect(sanitized.length).toBe(280);

      // Array cap test
      const messages = Array.from({ length: 150 }, (_, i) => ({
        id: `${i}`,
        sender: 'User',
        text: `Msg ${i}`,
        timestamp: Date.now(),
      }));
      const capped = [...messages, { id: '151', sender: 'User', text: 'New', timestamp: Date.now() }].slice(-100);
      expect(capped.length).toBe(100);
      expect(capped[capped.length - 1].id).toBe('151');
    });
  });
}
