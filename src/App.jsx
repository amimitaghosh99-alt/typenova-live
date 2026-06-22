import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Keyboard, Activity, Target, RotateCcw, Skull, Ghost, 
  Focus, Brain, Volume2, VolumeX, Palette, ShieldAlert,
  Award, Flame, FlipHorizontal, CloudFog, Magnet, Timer, X, Code, Star, TrendingUp, Lock
} from 'lucide-react';

// --- DATABASE CONFIGURATION ---
const SUPABASE_URL = 'https://ikcshjktqmoqakesxzlo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MCITmPmDsVnZwjzVqmvvjQ_68JSO_W4';

let supabase = null;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
  console.error("Supabase init error:", error);
}

// --- ACTUAL SENTENCE LISTS ---
const NOVICE_SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "A gentle breeze rustled the leaves in the quiet forest.",
  "She opened the door and stepped out into the warm sunlight.",
  "I like to drink coffee in the morning while reading the news.",
  "They walked along the beach as the sun began to set.",
  "He smiled and waved at his friends across the busy street.",
  "The cat slept peacefully on the soft cushion by the window.",
  "We are planning a trip to the mountains next weekend.",
  "Music has a way of bringing people together in harmony.",
  "It was a beautiful day for a picnic in the local park.",
  "The smell of fresh bread filled the small bakery.",
  "She watched the rain fall softly against the window glass.",
  "A good book can transport you to another world entirely.",
  "He learned to play the guitar when he was just a kid.",
  "The stars shone brightly in the clear night sky."
];

const ADEPT_SENTENCES = [
  "Building a scalable application requires a solid understanding of distributed systems.",
  "The compiler optimized the recursive function, significantly reducing execution time.",
  "Object-oriented programming encapsulates data and behavior into reusable structures.",
  "Asynchronous operations prevent the main thread from blocking during network requests.",
  "Responsive web design ensures that interfaces adapt gracefully to any screen size.",
  "The database schema was normalized to eliminate redundant data anomalies.",
  "Cryptographic algorithms rely on complex mathematical problems to secure information.",
  "Virtual memory allows an operating system to compensate for physical RAM shortages.",
  "Machine learning models improve their accuracy by analyzing massive datasets over time.",
  "A continuous integration pipeline automates the testing and deployment of modern software.",
  "The server crashed due to a sudden spike in concurrent user connections.",
  "State management is the beating heart of any complex reactive application.",
  "Version control systems track changes and allow developers to collaborate efficiently.",
  "Type safety prevents many common runtime errors by checking variables during compilation.",
  "Clean code is not just about logic, it is about creating readable architecture."
];

const MASTER_SNIPPETS = [
  "const handleEvent = (e) => { e.preventDefault(); };",
  "SELECT id, name FROM users WHERE active = true;",
  "def calculate_wpm(entries, time_minutes): return (entries / 5) / time_minutes",
  "<div className=\"flex justify-center items-center h-screen\"></div>",
  "git commit -m \"fix: resolved memory leak in typing engine\"",
  "for (let i = 0; i < array.length; i++) { sum += array[i]; }"
];

const CODE_SNIPPETS = [
`function calculateWPM(entries, timeMs) {
  const minutes = timeMs / 60000;
  const words = entries.length / 5;
  return Math.round(words / minutes);
}`,
`const App = () => {
  const [state, setState] = useState(0);
  useEffect(() => {
    console.log("Mounted!");
  }, []);
  return <div className="app">Hello</div>;
};`,
`def fibonacci(n):
    if n <= 0: return []
    elif n == 1: return [0]
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence`
];

const generateText = (level, length, isMirrored = false) => {
  let finalString = "";
  
  if (level === 'CODE') {
    finalString = CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)];
  } else if (level === 'MASTER') {
    let snippetCount = Math.max(1, Math.floor(length / 10)); 
    let words = [];
    for(let i=0; i<snippetCount; i++) words.push(MASTER_SNIPPETS[Math.floor(Math.random() * MASTER_SNIPPETS.length)]);
    finalString = words.join(' ');
  } else {
    // Generate actual sentences until we reach the requested word count
    let currentWordCount = 0;
    let selectedSentences = [];
    const pool = level === 'NOVICE' ? NOVICE_SENTENCES : ADEPT_SENTENCES;

    while (currentWordCount < length) {
      const sentence = pool[Math.floor(Math.random() * pool.length)];
      selectedSentences.push(sentence);
      currentWordCount += sentence.split(' ').length;
    }
    finalString = selectedSentences.join(' ');
  }
  
  if (isMirrored) finalString = finalString.split(' ').reverse().join(' ');
  return finalString;
};

// --- THEMES ---
const THEMES = {
  amoled: { bg: 'bg-black', text: 'text-cyan-400', accent: 'cyan', drop: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]', border: 'border-cyan-500/30', solid: 'bg-cyan-500', glow: 'shadow-[0_0_10px_rgba(34,211,238,1)]', auraHigh: 'shadow-[0_0_120px_rgba(34,211,238,0.6)]' },
  matrix: { bg: 'bg-black', text: 'text-emerald-400', accent: 'emerald', drop: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]', border: 'border-emerald-500/30', solid: 'bg-emerald-500', glow: 'shadow-[0_0_10px_rgba(52,211,153,1)]', auraHigh: 'shadow-[0_0_120px_rgba(52,211,153,0.6)]' },
  cyberpunk: { bg: 'bg-black', text: 'text-fuchsia-500', accent: 'fuchsia', drop: 'drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]', border: 'border-fuchsia-500/30', solid: 'bg-fuchsia-500', glow: 'shadow-[0_0_10px_rgba(217,70,239,1)]', auraHigh: 'shadow-[0_0_120px_rgba(217,70,239,0.6)]' },
  sunset: { bg: 'bg-black', text: 'text-orange-400', accent: 'orange', drop: 'drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]', border: 'border-orange-500/30', solid: 'bg-orange-500', glow: 'shadow-[0_0_10px_rgba(251,146,60,1)]', auraHigh: 'shadow-[0_0_120px_rgba(251,146,60,0.6)]' },
  monochrome: { bg: 'bg-black', text: 'text-zinc-200', accent: 'zinc', drop: 'drop-shadow-[0_0_8px_rgba(228,228,231,0.5)]', border: 'border-zinc-500/30', solid: 'bg-zinc-500', glow: 'shadow-[0_0_10px_rgba(228,228,231,1)]', auraHigh: 'shadow-[0_0_120px_rgba(228,228,231,0.6)]' },
  nord: { bg: 'bg-[#2E3440]', text: 'text-sky-300', accent: 'sky', drop: 'drop-shadow-[0_0_8px_rgba(129,161,193,0.7)]', border: 'border-sky-600/30', solid: 'bg-sky-500', glow: 'shadow-[0_0_10px_rgba(14,165,233,1)]', auraHigh: 'shadow-[0_0_120px_rgba(14,165,233,0.6)]' },
  amber: { bg: 'bg-black', text: 'text-amber-400', accent: 'amber', drop: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]', border: 'border-amber-500/30', solid: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,1)]', auraHigh: 'shadow-[0_0_120px_rgba(245,158,11,0.6)]' },
  vaporwave: { bg: 'bg-[#111827]', text: 'text-pink-400', accent: 'pink', drop: 'drop-shadow-[0_0_8px_rgba(236,72,153,0.7)]', border: 'border-pink-500/30', solid: 'bg-pink-500', glow: 'shadow-[0_0_10px_rgba(236,72,153,1)]', auraHigh: 'shadow-[0_0_120px_rgba(236,72,153,0.6)]' }
};
const THEME_KEYS = Object.keys(THEMES);
const PRESET_KEYS = ['nord', 'matrix', 'amber', 'vaporwave', 'cyberpunk'];
const SOUND_KEYS = ['thocky', 'linear', 'clicky', 'raindrops', 'arcade', 'modelm', 'alpaca'];

const UNLOCKS = {
  themes: { amoled: 1, nord: 1, monochrome: 1, matrix: 3, sunset: 5, amber: 8, vaporwave: 12, cyberpunk: 15 },
  sounds: { thocky: 1, linear: 1, clicky: 3, raindrops: 5, arcade: 8, modelm: 12, alpaca: 15 }
};

// --- PERSISTENT AUDIO ENGINE ---
let globalAudioCtx = null;
const getAudioContext = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!globalAudioCtx) globalAudioCtx = new AudioContext();
  if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
  return globalAudioCtx;
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [level, setLevel] = useState('NOVICE');
  const [wordCount, setWordCount] = useState(25);
  const [targetText, setTargetText] = useState(() => generateText('NOVICE', 25, false));
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  
  const [wpm, setWpm] = useState(0);
  const [rawWpm, setRawWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [isFinished, setIsFinished] = useState(false);
  const [username, setUsername] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  
  // MODIFIERS & JUICE
  const [zenMode, setZenMode] = useState(false);
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [ghostPacer, setGhostPacer] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [blindMode, setBlindMode] = useState(false);
  const [mirroredMode, setMirroredMode] = useState(false);
  const [fogMode, setFogMode] = useState(false);
  const [stickyKeysMode, setStickyKeysMode] = useState(false);
  const [overclockedMode, setOverclockedMode] = useState(false);
  const [shake, setShake] = useState(false);
  
  const [combo, setCombo] = useState(0);
  const [capsLock, setCapsLock] = useState(false);
  const [stickyPenalty, setStickyPenalty] = useState(0);
  const [timePenalty, setTimePenalty] = useState(0);

  // RPG PROGRESSION SYSTEM
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('typezen_xp')) || 0);
  const userLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
  const nextLevelXp = Math.pow(userLevel, 2) * 100;
  const currentLevelProgress = xp - Math.pow(userLevel - 1, 2) * 100;
  const xpNeeded = nextLevelXp - Math.pow(userLevel - 1, 2) * 100;
  const [xpGainedLast, setXpGainedLast] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // SETTINGS
  const [themeIndex, setThemeIndex] = useState(0);
  const [themePresetIndex, setThemePresetIndex] = useState(0); 
  const [soundProfile, setSoundProfile] = useState('thocky');
  const [muted, setMuted] = useState(false);

  // ANALYTICS
  const [microDrillTarget, setMicroDrillTarget] = useState(null);
  const [microDrillActive, setMicroDrillActive] = useState(false);
  const [showExpandedGraph, setShowExpandedGraph] = useState(false);
  const [timelinePoints, setTimelinePoints] = useState([]);
  const [consistency, setConsistency] = useState(100);
  const [flawlessStreak, setFlawlessStreak] = useState(0);
  
  const [originalTargetText, setOriginalTargetText] = useState(null);
  const [originalInput, setOriginalInput] = useState("");
  const [originalStartTime, setOriginalStartTime] = useState(null);
  const [originalEndTime, setOriginalEndTime] = useState(null);
  const [heatmapData, setHeatmapData] = useState(() => JSON.parse(localStorage.getItem('typezen_heatmap')) || {});

  const keystrokeLog = useRef([]);
  const textContainerRef = useRef(null);
  const theme = THEMES[THEME_KEYS[themeIndex]];

  // SAVE XP TO LOCAL STORAGE
  useEffect(() => {
    localStorage.setItem('typezen_xp', xp.toString());
  }, [xp]);

  const fetchLeaderboard = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leaderboard').select('username, wpm, accuracy').order('wpm', { ascending: false }).limit(5);
    if (!error && data) setLeaderboard(data);
  };
  useEffect(() => { fetchLeaderboard(); }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // AUDIO
  const playSound = useCallback((type) => {
    if (muted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const comboFactor = Math.min(1, combo / 60); 

    const createOneShot = ({ oscType = 'sine', freq = 200, duration = 0.06, gainVal = 0.2, detune = 0 }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq * (1 + comboFactor * 0.45), now); 
      osc.detune.value = detune;
      gain.gain.setValueAtTime(gainVal + comboFactor * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    };

    if (type === 'error') {
      createOneShot({ oscType: 'sawtooth', freq: 120, duration: 0.12, gainVal: 0.35 });
      return;
    }
    if (type === 'levelup') {
      createOneShot({ oscType: 'square', freq: 440, duration: 0.1, gainVal: 0.3 });
      setTimeout(() => createOneShot({ oscType: 'square', freq: 554, duration: 0.1, gainVal: 0.3 }), 100);
      setTimeout(() => createOneShot({ oscType: 'square', freq: 659, duration: 0.3, gainVal: 0.3 }), 200);
      return;
    }

    switch (soundProfile) {
      case 'alpaca': createOneShot({ oscType: 'triangle', freq: 140 + comboFactor * 120, duration: 0.08, gainVal: 0.18 }); break;
      case 'modelm': 
        createOneShot({ oscType: 'square', freq: 220 + comboFactor * 180, duration: 0.06, gainVal: 0.18, detune: comboFactor * 60 });
        setTimeout(() => createOneShot({ oscType: 'triangle', freq: 440 + comboFactor * 360, duration: 0.06, gainVal: 0.06 }), 12);
        break;
      case 'raindrops': createOneShot({ oscType: 'sine', freq: 600 + comboFactor * 400 + (Math.random() * 400 - 200), duration: 0.05, gainVal: 0.06 + comboFactor * 0.12 }); break;
      case 'arcade': createOneShot({ oscType: 'square', freq: 320 + comboFactor * 240, duration: 0.04, gainVal: 0.14 }); break;
      case 'clicky': createOneShot({ oscType: 'square', freq: 260 + comboFactor * 180, duration: 0.045, gainVal: 0.12 }); break;
      case 'linear': createOneShot({ oscType: 'triangle', freq: 200 + comboFactor * 120, duration: 0.05, gainVal: 0.12 }); break;
      default: createOneShot({ oscType: 'sine', freq: 180 + comboFactor * 140, duration: 0.05, gainVal: 0.18 }); break;
    }
  }, [muted, soundProfile, combo]);

  const calculateStats = useCallback((currentInput, timeMs, currentPenalty = 0) => {
    if (!timeMs || currentInput.length === 0) return { currentWpm: 0, rawWpm: 0, currentAcc: 100, timeline: [], consistency: 100, flawless: 0 };
    const entries = keystrokeLog.current || [];
    const startTs = entries.length ? entries[0].time : (Date.now() - timeMs);
    const totalTimeMs = timeMs + currentPenalty;
    const timeElapsedInMinutes = totalTimeMs / 60000;

    const errors = entries.filter(k => k.isError).length;
    const rawCalc = Math.round((currentInput.length / 5) / timeElapsedInMinutes);
    const netCalc = Math.round(((currentInput.length - errors) / 5) / timeElapsedInMinutes);
    const currentAcc = Math.round(((currentInput.length - errors) / currentInput.length) * 100);

    const intervals = 10;
    const step = totalTimeMs / intervals;
    let timeline = [];
    for (let i = 1; i <= intervals; i++) {
      const threshold = startTs + step * i;
      const chars = entries.filter(k => k.time <= threshold && !k.isError).length;
      const calcWpm = Math.round((chars / 5) / ((step * i) / 60000));
      timeline.push({ t: step * i, wpm: isNaN(calcWpm) ? 0 : calcWpm });
    }

    const wpmVals = timeline.map(p => p.wpm).filter(v => !isNaN(v));
    const mean = wpmVals.length ? wpmVals.reduce((a, b) => a + b, 0) / wpmVals.length : 0;
    const variance = wpmVals.length ? wpmVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpmVals.length : 0;
    const stddev = Math.sqrt(variance);
    let consistencyScore = 100;
    if (mean > 0) consistencyScore = Math.round(Math.max(0, Math.min(100, (1 - (stddev / mean)) * 100)));
    else if (stddev > 0) consistencyScore = 50;

    let maxStreak = 0, cur = 0;
    for (const k of entries) {
      if (!k.isError) cur++;
      else { maxStreak = Math.max(maxStreak, cur); cur = 0; }
    }
    maxStreak = Math.max(maxStreak, cur);

    return {
      currentWpm: isNaN(netCalc) || netCalc < 0 ? 0 : netCalc,
      rawWpm: isNaN(rawCalc) ? 0 : rawCalc,
      currentAcc: isNaN(currentAcc) ? 100 : currentAcc,
      timeline,
      consistency: consistencyScore,
      flawless: maxStreak
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (startTime && !isFinished && !endTime) {
        let activePenalty = timePenalty;
        if (overclockedMode && accuracy < 95 && input.length > 5) {
          activePenalty += 1000;
          setTimePenalty(activePenalty);
        }
        const stats = calculateStats(input, Date.now() - startTime, activePenalty);
        setWpm(stats.currentWpm);
        setRawWpm(stats.rawWpm);
        setAccuracy(stats.currentAcc);
        setConsistency(stats.consistency);
        setFlawlessStreak(stats.flawless);
        setTimelinePoints(stats.timeline || []);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [startTime, isFinished, endTime, input, accuracy, overclockedMode, timePenalty, calculateStats]);

  const processRPG = (finalWpm, finalAcc) => {
    // Calculate new Heatmap Data
    const newHeatmap = { ...heatmapData };
    keystrokeLog.current.forEach(k => {
      const char = k.expected.toUpperCase();
      if (!newHeatmap[char]) newHeatmap[char] = { total: 0, errors: 0 };
      newHeatmap[char].total += 1;
      if (k.isError) newHeatmap[char].errors += 1;
    });
    setHeatmapData(newHeatmap);
    localStorage.setItem('typezen_heatmap', JSON.stringify(newHeatmap));

    // Calculate XP
    if (finalWpm > 10 && finalAcc > 50 && !microDrillActive) {
      const lengthMod = targetText.length / 100; 
      const gained = Math.floor(finalWpm * (finalAcc / 100) * lengthMod * 2);
      
      setXpGainedLast(gained);
      
      const newXp = xp + gained;
      const oldLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
      
      setXp(newXp);

      if (newLevel > oldLevel) {
        setLeveledUp(true);
        playSound('levelup');
      }
    }
  };

  const finishTest = useCallback((finalTime) => {
    if (!startTime) { setIsFinished(true); setEndTime(finalTime); return; }
    setEndTime(finalTime);
    setIsFinished(true);
    const finalStats = calculateStats(input + (suddenDeath ? "" : "x"), finalTime - startTime, timePenalty);
    setWpm(finalStats.currentWpm);
    setRawWpm(finalStats.rawWpm);
    setAccuracy(finalStats.currentAcc);
    setConsistency(finalStats.consistency);
    setFlawlessStreak(finalStats.flawless);
    setTimelinePoints(finalStats.timeline || []);
    
    processRPG(finalStats.currentWpm, finalStats.currentAcc);
  }, [calculateStats, input, suddenDeath, startTime, timePenalty, heatmapData, xp, microDrillActive, targetText.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") { setZenMode(prev => !prev); return; }
      if (e.getModifierState && e.getModifierState("CapsLock")) setCapsLock(true); else setCapsLock(false);
      
      if (isFinished || document.activeElement.tagName === "INPUT") return;
      if (e.ctrlKey || e.metaKey || e.altKey || (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace')) return;

      if (e.key === "Backspace" && input.length > 0) {
        if (stickyKeysMode && stickyPenalty > 0) {
          setStickyPenalty(p => Math.max(0, p - 1));
          playSound('error');
          return;
        }
        setInput(prev => prev.slice(0, -1));
        playSound('click');
        setCombo(0);
        return;
      }

      if (e.key === " " || e.key === "Enter") e.preventDefault();

      if (input.length < targetText.length) {
        const now = Date.now();
        if (!startTime) setStartTime(now);
        
        let typedChar = e.key;
        if (typedChar === 'Enter') typedChar = '\n';

        const expectedChar = targetText[input.length];
        const isError = typedChar !== expectedChar;

        setInput(prev => prev + typedChar);
        keystrokeLog.current.push({ key: typedChar, expected: expectedChar, time: now, isError });

        if (isError) {
          playSound('error');
          setCombo(0);
          setShake(true);
          setTimeout(() => setShake(false), 200);
          if (stickyKeysMode) setStickyPenalty(3); 
          if (suddenDeath) finishTest(now); 
        } else {
          playSound('key');
          setCombo(c => c + 1);
        }

        if (input.length + 1 === targetText.length) finishTest(now);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, targetText, isFinished, startTime, suddenDeath, stickyKeysMode, stickyPenalty, timePenalty, playSound, finishTest]);

  // AUTO-SCROLL LOGIC
  useEffect(() => {
    if (!textContainerRef.current) return;
    const caret = document.getElementById('active-caret');
    if (caret) {
      const container = textContainerRef.current;
      const caretTop = caret.offsetTop;
      const containerHalfHeight = container.clientHeight / 2;
      container.scrollTo({
        top: caretTop - containerHalfHeight + 40,
        behavior: 'smooth'
      });
    }
  }, [input.length]);

  const handleReset = useCallback(() => {
    setTargetText(generateText(level, wordCount, mirroredMode));
    setInput(""); setStartTime(null); setEndTime(null); setWpm(0); setRawWpm(0);
    setAccuracy(100); setCombo(0); setStickyPenalty(0); setTimePenalty(0); setIsFinished(false);
    setSaveStatus(""); setUsername(""); keystrokeLog.current = []; setMicroDrillActive(false);
    setMicroDrillTarget(null); setTimelinePoints([]); setConsistency(100); setFlawlessStreak(0); setXpGainedLast(0); setLeveledUp(false);
    setOriginalTargetText(null); setOriginalInput(""); setOriginalStartTime(null); setOriginalEndTime(null);
  }, [level, wordCount, mirroredMode]);

  const changeLevel = (newLevel) => {
    setLevel(newLevel); setTargetText(generateText(newLevel, wordCount, mirroredMode)); handleReset();
  };

  const changeWordCount = (count) => {
    setWordCount(count); setTargetText(generateText(level, count, mirroredMode)); handleReset();
  };

  const toggleMirror = () => {
    setMirroredMode(prev => {
      const next = !prev; setTargetText(generateText(level, wordCount, next)); handleReset(); return next;
    });
  };

  const saveScore = async () => {
    if (!username.trim() || !supabase) return;
    setSaveStatus("Saving...");
    const { error } = await supabase.from('leaderboard').insert([{ username, wpm, accuracy }]);
    if (error) setSaveStatus("Error!");
    else { setSaveStatus("SCORE SAVED!"); fetchLeaderboard(); }
  };

  const renderGraph = () => {
    if (keystrokeLog.current.length < 5) return null;
    const duration = endTime ? (endTime - startTime) : (Date.now() - startTime);
    if (duration <= 0) return null;
    
    const intervals = timelinePoints.length || 10;
    const points = (timelinePoints.length ? timelinePoints : (() => {
      const step = duration / intervals;
      return Array.from({ length: intervals }, (_, i) => {
        const idx = i + 1;
        const chars = keystrokeLog.current.filter(k => k.time <= (startTime + step * idx) && !k.isError).length;
        const calcWpm = Math.round((chars / 5) / ((step * idx) / 60000));
        return { t: step * idx, wpm: isNaN(calcWpm) ? 0 : calcWpm };
      });
    })());
    const maxW = Math.max(...(points.map(p => p.wpm).concat([wpm || 1, 10])));
    const polyPoints = points.map((p, i) => {
      const x = ((i + 1) / intervals) * 200;
      const y = 60 - Math.min(60, (p.wpm / Math.max(maxW, 10)) * 50);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div onClick={() => setShowExpandedGraph(true)} title="Click to expand pacing graph" className="cursor-pointer">
        <svg viewBox="0 0 200 60" className="w-full h-12 drop-shadow-lg opacity-80 mt-1">
          <polyline fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={polyPoints} className={theme.text} />
        </svg>
      </div>
    );
  };

  // --- HEATMAP RENDERER ---
  const renderKeyboardHeatmap = () => {
    if (!isFinished) return null;

    const rows = [
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['A','S','D','F','G','H','J','K','L'],
      ['Z','X','C','V','B','N','M']
    ];

    return (
      <div className="flex flex-col items-center gap-1.5 p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800 w-full mt-4 shadow-inner">
        <span className="text-zinc-500 text-[10px] font-black tracking-widest mb-3 flex items-center">
          <Activity size={12} className="mr-2" /> KEYBOARD MASTERY HEATMAP
        </span>
        {rows.map((row, i) => (
          <div key={i} className="flex gap-1.5 md:gap-2 justify-center" style={{ marginLeft: i * 20 }}>
            {row.map(char => {
              const stat = heatmapData[char];
              let bgColor = "bg-zinc-800/30 text-zinc-600 border-zinc-800/50"; 
              let errorRate = 0;
              
              if (stat && stat.total > 0) {
                errorRate = stat.errors / stat.total;
                if (errorRate === 0) bgColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                else if (errorRate < 0.05) bgColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";
                else bgColor = "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)] cursor-pointer hover:scale-110";
              }

              return (
                <button 
                  key={char} 
                  onClick={() => errorRate >= 0.05 && startMicroDrill(char)}
                  className={`w-8 h-10 md:w-10 md:h-12 flex flex-col items-center justify-center rounded-lg border transition-all ${bgColor} ${errorRate < 0.05 && 'cursor-default pointer-events-none'}`}
                  title={stat && stat.total > 0 ? `${stat.errors} errors in ${stat.total} hits` : 'Not typed yet'}
                >
                  <span className="font-mono font-bold text-sm">{char}</span>
                  <span className="text-[8px] opacity-50">{stat && stat.total > 0 ? `${Math.round(errorRate * 100)}%` : '-'}</span>
                </button>
              );
            })}
          </div>
        ))}
        <div className="text-[9px] text-zinc-600 mt-3 font-black uppercase tracking-widest">Click red keys to start a custom Micro-Drill</div>
      </div>
    );
  };

  const startMicroDrill = (keyChar) => {
    setOriginalTargetText(targetText); setOriginalInput(input); setOriginalStartTime(startTime); setOriginalEndTime(endTime);
    const target = (keyChar === 'SPACE') ? ' ' : (keyChar === 'ENTER' ? '\n' : keyChar.toLowerCase());
    const words = [];
    
    // Extract words from all sentences to build a practice pool
    const allSentences = [...NOVICE_SENTENCES, ...ADEPT_SENTENCES];
    const pool = allSentences.flatMap(s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' '));
    
    while (words.length < 10) {
      const base = pool[Math.floor(Math.random() * pool.length)];
      if (base.includes(target) && target !== ' ' && target !== '\n') {
        words.push(base);
      } else if (target === ' ' || target === '\n') {
        words.push(base);
      } else {
        const insertAt = Math.floor(base.length / 2);
        words.push(base.slice(0, insertAt) + target + base.slice(insertAt));
      }
    }
    setMicroDrillTarget(keyChar); setMicroDrillActive(true); setTargetText(target === '\n' ? words.join('\n') : words.join(' '));
    setInput(""); setStartTime(null); setEndTime(null); setIsFinished(false); keystrokeLog.current = [];
  };

  const exitMicroDrill = () => {
    setMicroDrillActive(false); setMicroDrillTarget(null);
    setTargetText(originalTargetText || generateText(level, wordCount, mirroredMode));
    setInput(originalInput); setStartTime(originalStartTime); setEndTime(originalEndTime);
    setIsFinished(false); keystrokeLog.current = [];
  };

  const cycleThemePreset = () => {
    let nextIndex = themePresetIndex;
    let found = false;
    for (let i = 0; i < PRESET_KEYS.length; i++) {
      nextIndex = (nextIndex + 1) % PRESET_KEYS.length;
      const key = PRESET_KEYS[nextIndex];
      if (userLevel >= (UNLOCKS.themes[key] || 1)) {
        setThemePresetIndex(nextIndex);
        setThemeIndex(THEME_KEYS.indexOf(key));
        found = true;
        break;
      }
    }
    if (!found) showToast(`Keep leveling up to unlock more themes!`);
  };

  const cycleThemesFull = () => {
    let nextIdx = themeIndex;
    for (let i = 0; i < THEME_KEYS.length; i++) {
      nextIdx = (nextIdx + 1) % THEME_KEYS.length;
      const key = THEME_KEYS[nextIdx];
      if (userLevel >= (UNLOCKS.themes[key] || 1)) {
        setThemeIndex(nextIdx);
        return;
      }
    }
    showToast(`Keep leveling up to unlock more themes!`);
  };

  const cycleSoundProfile = () => {
    let currentIdx = SOUND_KEYS.indexOf(soundProfile);
    for (let i = 0; i < SOUND_KEYS.length; i++) {
      currentIdx = (currentIdx + 1) % SOUND_KEYS.length;
      const key = SOUND_KEYS[currentIdx];
      if (userLevel >= (UNLOCKS.sounds[key] || 1)) {
        setSoundProfile(key);
        return;
      }
    }
    showToast(`Keep leveling up to unlock more sounds!`);
  };

  const textArray = targetText.split('');
  const progressPercent = targetText.length > 0 ? (input.length / targetText.length) * 100 : 0;
  
  let grade = "D";
  if (wpm > 100 && accuracy > 98) grade = "S";
  else if (wpm > 80 && accuracy > 95) grade = "A";
  else if (wpm > 50 && accuracy > 90) grade = "B";
  else if (wpm > 30) grade = "C";

  let auraIntensity = "";
  let caretGlow = "";
  if (combo > 60) {
    auraIntensity = `${theme.auraHigh} ${theme.border}`;
    caretGlow = "h-[6px] shadow-[0_0_20px_rgba(255,255,255,1)] animate-bounce";
  } else if (combo > 40) {
    auraIntensity = `shadow-[0_0_60px_rgba(var(--${theme.accent}-500),0.3)] ${theme.border}`;
    caretGlow = "h-[4px] shadow-[0_0_12px_rgba(255,255,255,0.8)]";
  } else if (combo > 20) {
    auraIntensity = `shadow-[0_0_20px_rgba(var(--${theme.accent}-500),0.1)]`;
    caretGlow = "h-[4px]";
  } else {
    caretGlow = "h-[4px]";
  }
  
  const currentWordIndex = input.split(' ').length - 1;

  // CINEMATIC ZEN MODE CSS
  const topHudClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 ${
    zenMode ? 'opacity-0 blur-2xl -translate-y-12 max-h-0 pointer-events-none !mb-0' : 'opacity-100 blur-none translate-y-0 max-h-[200px] mb-12'
  }`;
  const menuNavClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden flex flex-col md:flex-row justify-center items-center gap-4 ${
    zenMode ? 'opacity-0 blur-2xl -translate-y-8 max-h-0 pointer-events-none !mb-0' : 'opacity-100 blur-none translate-y-0 max-h-[100px] mb-10'
  }`;
  const statsHudClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden flex justify-between w-full max-w-4xl mx-auto px-8 ${
    zenMode ? 'opacity-0 blur-2xl -translate-y-8 max-h-0 pointer-events-none !mb-0' : 'opacity-100 blur-none translate-y-0 max-h-[150px] mb-8'
  }`;
  const bottomHudClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden origin-bottom flex flex-col items-center ${
    zenMode ? 'opacity-0 blur-2xl translate-y-12 max-h-0 pointer-events-none !mt-0' : 'opacity-100 blur-none translate-y-0 max-h-[200px] mt-12'
  }`;
  const leaderboardClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 bg-zinc-900/30 rounded-[2rem] border border-zinc-800/50 backdrop-blur-md shadow-2xl overflow-hidden ${
    zenMode ? 'w-0 opacity-0 blur-2xl translate-x-32 pointer-events-none p-0 border-transparent m-0' : 'w-full xl:w-[450px] p-8 md:p-10 opacity-100 blur-none translate-x-0'
  }`;
  const typingBoxClass = `relative w-full rounded-[2rem] bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${
    zenMode ? `z-50 p-12 md:p-20 scale-[1.05] shadow-[0_0_200px_rgba(0,0,0,1)] border-zinc-700/50 bg-[#050505]/95 ${auraIntensity}` : `z-10 p-10 md:p-16 scale-100 shadow-2xl ${auraIntensity}`
  }`;

  return (
    <div className={`min-h-screen transition-colors duration-700 ease-in-out ${theme.bg} font-sans selection:bg-transparent outline-none flex justify-center relative overflow-x-hidden`}>
      <div className="absolute top-0 left-0 h-1 bg-zinc-900 w-full z-50">
        <div className={`h-full ${theme.solid} transition-all duration-200 ease-out ${theme.glow}`} style={{ width: `${progressPercent}%` }} />
      </div>

      <div className={`fixed inset-0 z-0 bg-black/95 backdrop-blur-3xl transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] pointer-events-none ${zenMode ? 'opacity-100 visible' : 'opacity-0 invisible'}`} />

      {zenMode && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0 animate-in fade-in zoom-in duration-1000 ease-out">
          <div className={`w-[80vw] h-[80vw] ${theme.solid} rounded-full blur-[250px] animate-pulse`} style={{ animationDuration: '6s' }} />
        </div>
      )}

      {toastMsg && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-full text-sm font-black tracking-widest shadow-2xl z-50 animate-in slide-in-from-top-10 fade-in flex items-center border border-zinc-700">
          <Lock size={16} className="mr-3 text-amber-400" />
          {toastMsg}
        </div>
      )}

      <div className={`w-full px-8 md:px-16 py-12 flex flex-col z-10 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${zenMode ? 'max-w-5xl' : 'max-w-[1600px]'}`}>
        
        <header className={topHudClass}>
          <div className="flex items-center space-x-6">
            <div className={`flex items-center space-x-3 ${theme.text}`}>
              <Keyboard size={36} className={combo > 30 ? theme.drop : ''} />
              <span className="font-black tracking-widest text-3xl text-white">TYPE<span className={theme.text}>NOVA</span></span>
            </div>
            
            {/* RPG BADGE */}
            <div className="flex items-center bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800 shadow-inner">
              <Star size={14} className={`${theme.text} mr-2`} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">LVL {userLevel}</span>
                <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden border border-zinc-800/50">
                  <div className={`h-full ${theme.solid} transition-all duration-500`} style={{ width: `${(currentLevelProgress / xpNeeded) * 100}%` }} />
                </div>
              </div>
              <span className="text-[8px] font-mono text-zinc-500 ml-3">{xp} XP</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 text-zinc-500 items-center">
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-1 bg-zinc-900/80 rounded-2xl p-1 border border-zinc-800 shadow-lg">
              <button onClick={() => setSuddenDeath(!suddenDeath)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${suddenDeath ? 'bg-red-500/20 text-red-400' : 'hover:text-zinc-300'}`} title="1HP: One mistake ends it"><Skull size={18} /></button>
              <button onClick={() => setGhostPacer(!ghostPacer)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${ghostPacer ? `bg-${theme.accent}-500/20 ${theme.text}` : 'hover:text-zinc-300'}`} title="Ghost"><Ghost size={18} /></button>
              <button onClick={() => setFocusMode(!focusMode)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${focusMode ? `bg-${theme.accent}-500/20 ${theme.text}` : 'hover:text-zinc-300'}`} title="Focus"><Focus size={18} /></button>
              <button onClick={() => setBlindMode(!blindMode)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${blindMode ? `bg-${theme.accent}-500/20 ${theme.text}` : 'hover:text-zinc-300'}`} title="Blind"><Brain size={18} /></button>
              <button onClick={toggleMirror} className={`p-2 rounded-xl transition-all flex justify-center items-center ${mirroredMode ? `bg-${theme.accent}-500/20 ${theme.text}` : 'hover:text-zinc-300'}`} title="Mirror"><FlipHorizontal size={18} /></button>
              <button onClick={() => setFogMode(!fogMode)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${fogMode ? `bg-${theme.accent}-500/20 ${theme.text}` : 'hover:text-zinc-300'}`} title="Fog"><CloudFog size={18} /></button>
              <button onClick={() => setStickyKeysMode(!stickyKeysMode)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${stickyKeysMode ? `bg-${theme.accent}-500/20 ${theme.text}` : 'hover:text-zinc-300'}`} title="Sticky Keys"><Magnet size={18} /></button>
              <button onClick={() => setOverclockedMode(!overclockedMode)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${overclockedMode ? 'bg-red-500/20 text-red-400' : 'hover:text-zinc-300'}`} title="Overclocked"><Timer size={18} /></button>
            </div>
            
            <div className="flex bg-zinc-900/80 rounded-2xl p-1 border border-zinc-800 shadow-lg items-center">
              <button onClick={cycleThemesFull} className={`p-2 px-3 rounded-xl hover:text-zinc-300 ${theme.text}`} title="Cycle Theme"><Palette size={16} /></button>
              <button onClick={cycleThemePreset} className="p-2 px-3 rounded-xl hover:text-zinc-300 text-[10px] font-black uppercase tracking-widest flex items-center">PRESET</button>
              <div className="relative">
                <button onClick={cycleSoundProfile} className="p-2 px-3 rounded-xl hover:text-zinc-300 text-[10px] font-black uppercase tracking-widest flex items-center">
                  <Volume2 size={12} className="mr-2"/> {soundProfile.toUpperCase()}
                </button>
              </div>
              <button onClick={() => setMuted(!muted)} className="p-2 px-4 rounded-xl hover:text-zinc-300">{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
            </div>
          </div>
        </header>

        <main className={`flex flex-col xl:flex-row items-start w-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${zenMode ? 'gap-0 mt-0' : 'gap-16 mt-4'}`}>
          <div className="flex-1 w-full flex flex-col">
            
            <div className={menuNavClass}>
              <div className="flex bg-zinc-900/50 p-1.5 rounded-full border border-zinc-800/50">
                {['NOVICE', 'ADEPT', 'MASTER', 'CODE'].map(l => (
                  <button key={l} onClick={() => changeLevel(l)} className={`px-4 md:px-6 py-2 rounded-full text-[11px] font-black tracking-widest transition-all ${level === l ? `bg-zinc-800 ${theme.text} ${theme.drop} border border-zinc-700 shadow-lg` : 'text-zinc-500 hover:text-zinc-300 border border-transparent'} flex items-center`}>
                    {l === 'CODE' && <Code size={14} className="mr-1" />} {l}
                  </button>
                ))}
              </div>
              <div className={`flex bg-zinc-900/50 p-1.5 rounded-full border border-zinc-800/50 ${level === 'CODE' ? 'opacity-30 pointer-events-none' : ''}`}>
                {[10, 25, 50, 100].map(count => (
                  <button key={count} onClick={() => changeWordCount(count)} className={`px-4 py-2 rounded-full text-[11px] font-black tracking-widest transition-all ${wordCount === count ? `bg-zinc-800 text-white shadow-lg` : 'text-zinc-600 hover:text-zinc-300'}`}>
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className={statsHudClass}>
              <div className="flex flex-col items-center">
                <span className="text-zinc-500 text-[10px] font-black tracking-widest mb-2 flex items-center"><Activity size={12} className="mr-2"/> NET WPM</span>
                <span className="text-5xl md:text-6xl font-black text-white">{wpm}</span>
                <span className="mt-2 text-xs uppercase font-black tracking-widest text-zinc-400">CONSISTENCY: <span className={`${consistency > 80 ? 'text-green-400' : 'text-amber-400'}`}>{consistency}%</span></span>
              </div>
              
              <div className="flex flex-col items-center justify-end w-32 pb-2 hidden md:flex">
                <span className="text-zinc-600 text-[8px] font-black tracking-widest mb-1 flex items-center"><Activity size={10} className="mr-1"/> PACING</span>
                {renderGraph()}
              </div>

              <div className="flex flex-col items-center">
                <span className="text-zinc-500 text-[10px] font-black tracking-widest mb-2 flex items-center"><Target size={12} className="mr-2"/> ACC</span>
                <span className="text-5xl md:text-6xl font-black text-white">{accuracy}%</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-zinc-500 text-[10px] font-black tracking-widest mb-2 flex items-center"><Flame size={12} className="mr-2"/> COMBO</span>
                <span className={`text-5xl md:text-6xl font-black transition-colors ${combo > 20 ? `${theme.text} ${theme.drop}` : 'text-zinc-500'}`}>{combo}</span>
              </div>
            </div>

            <div className={typingBoxClass} style={{ animation: shake ? 'shake 0.2s ease-in-out' : 'none' }}>
              {capsLock && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-xs px-4 py-1.5 rounded-full font-bold flex items-center shadow-lg animate-bounce z-50">
                  <ShieldAlert size={14} className="mr-2" /> CAPS LOCK ON
                </div>
              )}
              {stickyPenalty > 0 && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-[10px] md:text-xs px-6 py-2 rounded-full font-black flex items-center shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse z-50 uppercase tracking-widest border border-red-400">
                  <Magnet size={14} className="mr-2" /> KEY STUCK! MASH BACKSPACE {stickyPenalty}x
                </div>
              )}
              {microDrillActive && (
                <div className="absolute top-4 right-4 text-sm text-zinc-400 uppercase font-black">MICRO-DRILL: {microDrillTarget === '\n' ? 'ENTER' : microDrillTarget}</div>
              )}

              {!isFinished ? (
                <div 
                  ref={textContainerRef}
                  className={`relative text-3xl md:text-4xl lg:text-[2.5rem] leading-[1.6] tracking-wide font-mono whitespace-pre-wrap text-left ${focusMode && !fogMode ? 'blur-[1.5px]' : ''} max-h-[55vh] overflow-y-auto pb-32 pt-4 px-2 -mx-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
                >
                  {textArray.map((char, index) => {
                    let colorClass = "text-zinc-600";
                    let isTyping = index === input.length;
                    if (index < input.length) {
                      const isCorrect = input[index] === char;
                      if (isCorrect) colorClass = blindMode ? "opacity-0" : "text-zinc-100";
                      else colorClass = "text-red-400 bg-red-500/20 rounded-md shadow-[0_0_8px_rgba(248,113,113,0.5)]";
                    }
                    if (focusMode && !fogMode) {
                      const dist = Math.abs(index - input.length);
                      if (dist < 15) colorClass += " blur-none filter-none opacity-100 transition-all";
                      else colorClass += " blur-sm opacity-20";
                    }
                    if (fogMode) {
                      const charWordIndex = targetText.substring(0, index).split(' ').length - 1;
                      if (charWordIndex < currentWordIndex) colorClass += " opacity-0 transition-opacity duration-300";
                      else if (charWordIndex > currentWordIndex + 1) colorClass += " opacity-0 transition-opacity duration-300";
                      else if (charWordIndex === currentWordIndex + 1) colorClass += " opacity-20 blur-[2px] transition-opacity duration-300";
                    }
                    return (
                      <span key={index} className="relative inline" id={isTyping ? 'active-caret' : undefined}>
                        {isTyping && <span className={`absolute left-0 -bottom-2 w-full bg-white rounded-full transition-all duration-75 ${caretGlow} ${combo > 20 ? theme.drop : 'shadow-lg'}`} />}
                        <span className={`${colorClass} transition-colors duration-150`}>{char === '\n' ? <span className="opacity-30">↵{'\n'}</span> : char}</span>
                      </span>
                    );
                  })}
                  {ghostPacer && startTime && (
                    <div className="absolute bottom-6 h-1.5 bg-zinc-700/50 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${Math.min(100, ((Date.now() - startTime)/60000) * 140 / targetText.length * 100)}%` }} />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in duration-500">
                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">TEST COMPLETE!</h2>
                  
                  {leveledUp && (
                    <div className="mb-4 bg-amber-500/20 text-amber-400 border border-amber-500/50 px-6 py-2 rounded-full font-black tracking-widest flex items-center animate-bounce shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                      <TrendingUp size={18} className="mr-2" /> LEVEL UP!
                    </div>
                  )}

                  {xpGainedLast > 0 && !leveledUp && (
                    <div className="mb-8 px-4 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-black tracking-widest text-sm animate-bounce shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                      +{xpGainedLast} XP EARNED
                    </div>
                  )}
                  
                  {microDrillActive && (
                    <button onClick={exitMicroDrill} className="absolute top-6 right-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg flex items-center font-black text-sm">
                      <X size={16} className="mr-2" /> EXIT DRILL
                    </button>
                  )}
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-6">
                    <div className="bg-zinc-950/50 p-6 rounded-2xl flex flex-col items-center justify-center border border-zinc-800 shadow-inner">
                      <span className="text-zinc-500 text-[10px] font-black tracking-widest mb-3">GRADE</span>
                      <span className={`text-5xl font-black ${theme.text} ${theme.drop}`}>{grade}</span>
                    </div>
                    <div className="bg-zinc-950/50 p-6 rounded-2xl flex flex-col items-center justify-center border border-zinc-800 shadow-inner">
                      <span className="text-zinc-500 text-[10px] font-black tracking-widest mb-3">RAW WPM</span>
                      <span className="text-4xl font-black text-white">{rawWpm}</span>
                    </div>
                    <div className="bg-zinc-950/50 p-6 rounded-2xl flex flex-col items-center justify-center border border-zinc-800 shadow-inner">
                      <span className="text-zinc-500 text-[10px] font-black tracking-widest mb-3">CONSISTENCY</span>
                      <span className="text-4xl font-black text-white">{consistency}%</span>
                    </div>
                    <div className="bg-zinc-950/50 p-6 rounded-2xl flex flex-col items-center justify-center border border-zinc-800 shadow-inner">
                      <span className="text-zinc-500 text-[10px] font-black tracking-widest mb-3">FLAWLESS STREAK</span>
                      <span className={`text-4xl font-black ${flawlessStreak > 50 ? theme.text : 'text-white'}`}>{flawlessStreak}</span>
                    </div>
                  </div>

                  {!microDrillActive && renderKeyboardHeatmap()}

                  {!microDrillActive && (
                    <div className="flex w-full max-w-lg space-x-3 bg-zinc-950/50 p-2 rounded-2xl border border-zinc-800 mt-6">
                      <input 
                        type="text" value={username} onChange={e => setUsername(e.target.value)}
                        placeholder="Enter name..." maxLength={12}
                        className="flex-1 bg-transparent text-white px-6 py-4 font-bold text-xl focus:outline-none placeholder:text-zinc-700 uppercase"
                        onKeyDown={(e) => { if(e.key === 'Enter') saveScore(); }}
                      />
                      <button onClick={saveScore} className={`px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black tracking-widest rounded-xl transition-all ${theme.text}`}>SAVE</button>
                    </div>
                  )}
                  {saveStatus && <p className={`mt-6 text-sm font-black tracking-widest ${saveStatus.includes('Error') ? 'text-red-400' : theme.text}`}>{saveStatus}</p>}
                </div>
              )}
            </div>

            <div className={bottomHudClass}>
              <button onClick={handleReset} className="flex items-center space-x-3 px-8 py-3 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors rounded-full border border-zinc-800/50 text-xs font-black tracking-widest">
                <RotateCcw size={18} /> <span>RESTART TEST</span>
              </button>
              <p className="mt-6 text-zinc-700 text-[10px] font-mono tracking-widest uppercase">PRESS ESC TO TOGGLE ZEN MODE</p>
            </div>
            
            {zenMode && (
              <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-1000">
                <p className="text-zinc-500/50 font-black tracking-widest text-xs uppercase animate-pulse">PRESS ESC TO EXIT</p>
              </div>
            )}
          </div>

          <aside className={leaderboardClass}>
            <div className="flex items-center text-white font-black tracking-widest mb-8 border-b border-zinc-800/50 pb-6 text-lg w-full">
              <Award size={24} className={`mr-4 ${theme.text}`} />
              <span className="whitespace-nowrap">GLOBAL TOP 5</span>
            </div>
            
            {leaderboard.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-8 font-bold whitespace-nowrap">No scores yet. Be the first!</p>
            ) : (
              <div className="space-y-6 w-full">
                {leaderboard.map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center group p-3 rounded-2xl hover:bg-zinc-800/30 transition-colors w-full">
                    <div className="flex items-center space-x-6">
                      <span className={`font-black text-xl ${idx === 0 ? theme.text : 'text-zinc-600'}`}>#{idx + 1}</span>
                      <span className="font-black text-white tracking-widest uppercase text-lg whitespace-nowrap">{entry.username}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-black text-3xl ${theme.text}`}>{entry.wpm}</span>
                      <span className="text-[10px] text-zinc-500 font-bold tracking-widest whitespace-nowrap">{entry.accuracy}% ACC</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </main>
      </div>

      {/* EXPANDED GRAPH OVERLAY */}
      {showExpandedGraph && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => setShowExpandedGraph(false)}>
          <div 
            className="bg-zinc-900/95 p-8 rounded-2xl w-full max-w-3xl border border-zinc-800 shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-2xl font-black ${theme.text}`}>PACING TIMELINE</h3>
              <button 
                onClick={() => setShowExpandedGraph(false)} 
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <svg viewBox="0 0 800 240" className="w-full h-64 bg-zinc-950/50 rounded-lg p-4 border border-zinc-800">
              {[0, 20, 40, 60, 80, 100].map((x) => (
                <line key={`grid-v-${x}`} x1={x * 8} y1="0" x2={x * 8} y2="200" stroke="rgba(113, 113, 122, 0.1)" strokeWidth="1" />
              ))}
              {[0, 50, 100, 150, 200].map((y) => (
                <line key={`grid-h-${y}`} x1="0" y1={y} x2="800" y2={y} stroke="rgba(113, 113, 122, 0.1)" strokeWidth="1" />
              ))}
              {(() => {
                const pts = timelinePoints.length ? timelinePoints : [];
                const maxW = Math.max(...(pts.map(p => p.wpm).concat([wpm || 1, 10])));
                const poly = pts.map((p, i) => {
                  const x = ((i + 1) / (pts.length || 1)) * 760 + 20;
                  const y = 200 - Math.min(200, (p.wpm / Math.max(maxW, 10)) * 160);
                  return `${x},${y}`;
                }).join(' ');
                return (
                  <polyline 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    points={poly} 
                    className={theme.text}
                  />
                );
              })()}
            </svg>
            <div className="grid grid-cols-5 gap-2 mt-6">
              {timelinePoints.map((p, i) => (
                <div key={i} className="bg-zinc-800/50 p-3 rounded-lg text-center border border-zinc-700 hover:border-zinc-600 transition-all cursor-default">
                  <div className={`font-black text-lg ${theme.text}`}>{p.wpm} wpm</div>
                  <div className="text-[10px] text-zinc-500 font-black">+{Math.round((p.t)/1000)}s</div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center text-sm text-zinc-500 font-black">
              Click outside to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}