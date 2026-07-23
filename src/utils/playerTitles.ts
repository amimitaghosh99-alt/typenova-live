export interface PlayerTitleStats {
  id: string;
  name: string;
  rank: number; // 1-indexed final rank
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  rawErrors: number;
  backspaceCount: number;
}

export interface TitleIntervalRanking {
  t: number;
  rankings: string[]; // array of player IDs in order of 1st, 2nd, etc.
}

export function calculatePlayerTitle(
  player: PlayerTitleStats,
  allPlayers: PlayerTitleStats[],
  intervals: TitleIntervalRanking[]
): { title: string; emoji: string } {
  // calculate time spent in rank 1
  const totalIntervals = intervals.length;
  let timeInRank1 = 0;
  let timeInRank2to4 = 0;

  if (totalIntervals > 0) {
    for (const interval of intervals) {
      if (interval.rankings[0] === player.id) {
        timeInRank1++;
      } else if (interval.rankings.includes(player.id)) {
        timeInRank2to4++;
      }
    }
  }

  const percentInRank1 = totalIntervals > 0 ? timeInRank1 / totalIntervals : 0;
  const percentInRank2to4 = totalIntervals > 0 ? timeInRank2to4 / totalIntervals : 0;
  
  const isLastPlace = player.rank === allPlayers.length && allPlayers.length > 1;
  const winner = allPlayers.find(p => p.rank === 1);
  const winnerAccuracy = winner ? winner.accuracy : 0;

  // Tier 1: Timeline & Behavioral (Check these first)

  // The Choke: Final rank > 1, BUT rank 1 for >= 80% of intervals
  if (player.rank > 1 && percentInRank1 >= 0.8) {
    return { title: 'THE CHOKE', emoji: '😱' };
  }

  // The Clutch Master: Final rank 1, BUT rank 2,3,4 for >= 80% of intervals
  if (player.rank === 1 && percentInRank2to4 >= 0.8 && allPlayers.length > 1) {
    return { title: 'CLUTCH MASTER', emoji: '🥶' };
  }

  // Backspace Addict: Net accuracy === 100, Backspaces > 40
  if (player.accuracy === 100 && player.backspaceCount > 40) {
    return { title: 'BACKSPACE ADDICT', emoji: '🔙' };
  }

  // The Pacifist: WPM < 50 AND rawErrors === 0
  if (player.wpm < 50 && player.rawErrors === 0) {
    return { title: 'THE PACIFIST', emoji: '🕊️' };
  }

  // The Anchor: Last place, BUT accuracy > 1st place winner's accuracy
  if (isLastPlace && player.accuracy > winnerAccuracy) {
    return { title: 'THE ANCHOR', emoji: '⚓' };
  }

  // Tier 2: The Hall of Shame (Check these second)
  
  // Keyboard Smasher: Accuracy < 85 AND rawErrors > 30
  if (player.accuracy < 85 && player.rawErrors > 30) {
    return { title: 'KEYBOARD SMASHER', emoji: '💥' };
  }

  // Spray and Pray: rawWPM > 130, net WPM < 80
  if (player.rawWpm > 130 && player.wpm < 80) {
    return { title: 'SPRAY AND PRAY', emoji: '🔫' };
  }

  // Heart Palpitations: Consistency < 40%
  if (player.consistency < 40) {
    return { title: 'HEART PALPITATIONS', emoji: '💓' };
  }

  // Dial-Up Connection: Last place AND wpm < 40
  if (isLastPlace && player.wpm < 40) {
    return { title: 'DIAL-UP', emoji: '🐌' };
  }

  // Tier 3: The Elites (Check these last)

  // The Metronome: Consistency > 95%
  if (player.consistency > 95) {
    return { title: 'THE METRONOME', emoji: '⏱️' };
  }

  // The Sniper: Accuracy >= 99%
  if (player.accuracy >= 99) {
    return { title: 'THE SNIPER', emoji: '🎯' };
  }

  // Speed Demon: WPM > 120
  if (player.wpm > 120) {
    return { title: 'SPEED DEMON', emoji: '⚡' };
  }

  // Default fallback
  return { title: 'RACER', emoji: '🏎️' };
}
