// ─── TEXT POOLS ───────────────────────────────────────────────────────
export const NOVICE_SENTENCES = [
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

export const ADEPT_SENTENCES = [
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

export const MASTER_SNIPPETS = [
  `The Kubernetes-orchestrated environment leverages containerized micro-services (with dynamic auto-scaling capabilities) to ensure 99.999% uptime—even under significant, unpredictable, cross-region traffic surges.`,
  `To optimize the distributed-ledger architecture, developers must prioritize Byzantine fault tolerance; specifically, the consensus algorithm (e.g., Proof-of-Stake vs. Proof-of-Work) dictates the overall security, latency, and throughput of the chain.`,
  `Implementing a zero-trust security model requires continuous identity-verification, multi-factor authentication (MFA), and micro-segmentation of the network—all while maintaining a seamless user-experience (UX) layer.`,
  `Notwithstanding any provision to the contrary within the master service agreement (MSA), the licensee hereby grants the licensor an irrevocable, non-exclusive, sub-licensable (worldwide) license to reproduce, distribute, and display the licensed content for promotional purposes.`,
  `Any modifications to the existing terms of service—including, but not limited to, changes in pricing, data-retention policies, or user-privacy settings—must be submitted in writing, signed by both parties, and archived within the corporate compliance repository.`,
  `The user acknowledges that the software is provided 'as is' (without warranties of any kind, whether express or implied), including—but not limited to—warranties of merchantability, fitness for a particular purpose, or non-infringement.`,
  `Advancements in CRISPR-Cas9 (gene-editing technology) have facilitated a paradigm shift within oncology: specifically, targeted immuno-therapies are now successfully reprogramming T-cells to identify, attack, and neutralize malignant cellular clusters without damaging healthy tissue.`,
  `The hyper-advanced synthesis of bio-mimetic materials involves nano-scale precision; consequently, the margin of error remains exceptionally slim—often requiring sub-atomic calibration protocols to prevent structural instability during the fabrication phase.`,
  `Metabolic homeostasis (regulated by complex enzymatic pathways) is significantly influenced by the circadian rhythm—a biological 'clock' controlled by the suprachiasmatic nucleus (SCN) located in the hypothalamus of the brain.`,
  `The post-post-modern existential crisis—characterized by a rapid, digitised acceleration of human interaction—often leads to a fragmentation of the collective psyche; this creates, in turn, a profound 'technological alienation' (as theorized by late-twentieth-century sociologists).`,
  `Quantum entanglement (often colloquially referred to as 'spooky action at a distance') dictates that the state of one particle is inextricably linked to the state of another; this correlation persists, regardless of the physical distance separating the particles in three-dimensional space.`,
  `The juxtaposition of ultra-modern capitalist realism against the rising demand for post-scarcity economic models suggests that the current global-trade (and fiscal) paradigm is rapidly reaching a point of structural obsolescence.`
];

export const CODE_SNIPPETS = [
  `const { id, name } = user;`,
  `import { useState } from 'react';`,
  `SELECT * FROM posts WHERE id = 101;`,
  `display: flex; justify-content: center;`,
  `let x = (a + b) * c / d;`,
  `const isActive = user.status === 'online';`,
  `print("Hello, World!")`,
  `const filtered = items.filter(i => i.price > 100).map(i => i.name);`,
  `function UserProfile({ name, age }) {\n    return <div className="card">{name} is {age}</div>;\n  }`,
  `try {\n    const data = await response.json();\n    console.log(data);\n  } catch (err) {\n    handleError(err);\n  }`,
  `class Post extends Model {\n    static get tableName() { return 'posts'; }\n  }`,
  `import React, { useMemo } from 'react';\n\nconst ExpensiveComponent = ({ list }) => {\n  const result = useMemo(() => {\n    return list.reduce((acc, cur) => acc + cur.value, 0);\n  }, [list]);\n\n  return <div className="total">{result}</div>;\n};`,
  `def process_data(payload):\n    processed = []\n    for item in payload:\n        if item.is_valid():\n            cleaned = item.clean()\n            processed.append(cleaned)\n    return sorted(processed, key=lambda x: x.timestamp)`,
  `CREATE TABLE orders (\n    id SERIAL PRIMARY KEY,\n    user_id INT REFERENCES users(id),\n    total DECIMAL(10, 2),\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    status VARCHAR(20) DEFAULT 'pending'\n  );`,
  `impl Person {\n    fn new(name: String, age: u32) -> Person {\n        Person { name, age }\n    }\n    fn greet(&self) {\n        println!("Hi, I'm {}!", self.name);\n    }\n}`
];

export type Level = 'NOVICE' | 'ADEPT' | 'MASTER' | 'CODE' | 'CUSTOM';

export const generateText = (level: Level, length: number, customText: string = '', isMirrored = false): string => {
  let final = "";
  if (level === 'CODE') {
    final = CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)];
  } else if (level === 'CUSTOM') {
    final = customText.trim() || "Type your custom text above...";
  } else if (level === 'MASTER') {
    const snippetCount = Math.max(1, Math.ceil(length / 10));
    const words: string[] = [];
    for (let i = 0; i < snippetCount; i++) {
      words.push(MASTER_SNIPPETS[Math.floor(Math.random() * MASTER_SNIPPETS.length)]);
    }
    final = words.join(' ').split(' ').slice(0, length).join(' ');
  } else {
    const pool = level === 'NOVICE' ? NOVICE_SENTENCES : ADEPT_SENTENCES;
    const picked: string[] = [];
    let words = 0;
    while (words < length) {
      const s = pool[Math.floor(Math.random() * pool.length)];
      picked.push(s);
      words += s.split(' ').length;
    }
    final = picked.join(' ');
  }
  return isMirrored ? final.split(' ').reverse().join(' ') : final;
};

// ─── THEMES ─────────────────────────────────────────────
const rgbMap: Record<string, string> = {
  cyan: '34,211,238', emerald: '52,211,153', fuchsia: '217,70,239',
  orange: '251,146,60', zinc: '228,228,231', sky: '14,165,233',
  amber: '245,158,11', pink: '236,72,153', red: '239,68,68',
  yellow: '250,204,21', blue: '96,165,250', rose: '244,63,94',
  white: '255,255,255', purple: '168,85,247', indigo: '129,140,248',
  // NEON EXTENSIONS
  lime: '163,230,53', teal: '45,212,191', violet: '167,139,250'
};

export interface Theme {
  name: string;
  bg: string;
  text: string;
  accent: string;
  drop: string;
  border: string;
  borderHalf: string;
  solid: string;
  bgAlpha: string;
  bgHover: string;
  glow: string;
  auraHigh: string;
  auraMed: string;
  auraLow: string;
  toastGlow: string;
  glowPrimary: string;
  glowSecondary: string;
}

const contrastMap: Record<string, string> = {
  cyan: '168,85,247',      // purple
  emerald: '34,211,238',   // cyan
  fuchsia: '236,72,153',   // pink
  orange: '244,63,94',     // rose
  zinc: '156,163,175',     // gray
  sky: '96,165,250',       // blue
  amber: '251,146,60',     // orange
  pink: '217,70,239',      // fuchsia
  red: '251,146,60',       // orange
  yellow: '239,68,68',     // red
  blue: '14,165,233',      // sky
  rose: '236,72,153',      // pink
  white: '148,163,184',    // slate
  purple: '236,72,153',    // pink
  indigo: '217,70,239',    // fuchsia
  lime: '217,70,239',      // fuchsia (watermelon)
  teal: '244,63,94',       // rose (miami)
  violet: '250,204,21'     // yellow (lakers)
};

const makeTheme = (
  name: string, 
  bg: string, 
  text: string, 
  accent: string, 
  solidOverride?: string,
  glowPrimaryOverride?: string,
  glowSecondaryOverride?: string
): Theme => {
  const rgb = glowPrimaryOverride || rgbMap[accent] || '255,255,255';
  const rgbSecondary = glowSecondaryOverride || contrastMap[accent] || '128,128,128';
  return {
    name, bg, text, accent,
    drop: `drop-shadow-[0_0_8px_rgba(${rgb},0.8)]`,
    border: `border-${accent}-500/30`,
    borderHalf: `border-${accent}-500/50`,
    solid: solidOverride || `bg-${accent}-500`,
    bgAlpha: `bg-${accent}-500/20`,
    bgHover: `hover:bg-${accent}-500/10`,
    glow: `shadow-[0_0_10px_rgba(${rgb},1)]`,
    auraHigh: `shadow-[0_0_120px_rgba(${rgb},0.6)]`,
    auraMed: `shadow-[0_0_60px_rgba(${rgb},0.3)]`,
    auraLow: `shadow-[0_0_20px_rgba(${rgb},0.1)]`,
    toastGlow: `shadow-[0_0_30px_rgba(${rgb},0.3)]`,
    glowPrimary: rgb,
    glowSecondary: rgbSecondary,
  };
};

export const THEMES: Record<string, Theme> = {
  amoled: makeTheme('amoled', 'bg-black', 'text-cyan-400', 'cyan'),
  matrix: makeTheme('matrix', 'bg-[#001100]', 'text-emerald-400', 'emerald'),
  cyberpunk: makeTheme('cyberpunk', 'bg-[#110011]', 'text-fuchsia-500', 'fuchsia'),
  sunset: makeTheme('sunset', 'bg-[#1a0a00]', 'text-orange-400', 'orange'),
  monochrome: makeTheme('monochrome', 'bg-[#0a0a0a]', 'text-zinc-200', 'zinc'),
  nord: makeTheme('nord', 'bg-[#1e222a]', 'text-sky-300', 'sky'),
  amber: makeTheme('amber', 'bg-[#120a00]', 'text-amber-400', 'amber'),
  vaporwave: makeTheme('vaporwave', 'bg-[#0a001a]', 'text-pink-400', 'pink'),
  
  // Custom Dual-Color Themes
  spiderman: makeTheme('spiderman', 'bg-zinc-950', 'text-red-500', 'red', 'bg-blue-600', '239, 68, 68', '37, 99, 235'),
  ironman: makeTheme('ironman', 'bg-zinc-950', 'text-red-500', 'red', 'bg-amber-400', '239, 68, 68', '245, 158, 11'),
  captain: makeTheme('captain', 'bg-[#000a1a]', 'text-blue-400', 'blue', 'bg-blue-400'),
  madrid: makeTheme('madrid', 'bg-zinc-950', 'text-zinc-200', 'white', 'bg-amber-300', '255, 255, 255', '245, 158, 11'),
  barca: makeTheme('barca', 'bg-zinc-950', 'text-blue-500', 'blue', 'bg-blue-600', '37, 99, 235', '220, 38, 38'),

  // Creative Galaxy Theme (Gradient Text & Bar)
  galaxy: {
    name: 'galaxy',
    bg: 'bg-[#050014]',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400',
    accent: 'fuchsia',
    drop: 'drop-shadow-[0_0_12px_rgba(217,70,239,0.6)]',
    border: 'border-fuchsia-500/30',
    borderHalf: 'border-fuchsia-500/50',
    solid: 'bg-gradient-to-r from-purple-500 to-cyan-500',
    bgAlpha: 'bg-fuchsia-500/10',
    bgHover: 'hover:bg-fuchsia-500/20',
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.5)]',
    auraHigh: 'shadow-[0_0_120px_rgba(168,85,247,0.4)]',
    auraMed: 'shadow-[0_0_60px_rgba(217,70,239,0.3)]',
    auraLow: 'shadow-[0_0_20px_rgba(34,211,238,0.2)]',
    toastGlow: 'shadow-[0_0_30px_rgba(217,70,239,0.4)]',
    glowPrimary: '168, 85, 247',
    glowSecondary: '34, 211, 238',
  },
  glitch: {
    name: 'glitch',
    bg: 'bg-black',
    text: 'text-white [text-shadow:3px_0_0_rgba(255,0,80,0.8),-3px_0_0_rgba(0,255,255,0.8)]',
    accent: 'fuchsia',
    drop: 'drop-shadow-[0_0_5px_rgba(255,0,80,0.8)]',
    border: 'border-fuchsia-500/30',
    borderHalf: 'border-fuchsia-500/50',
    solid: 'bg-fuchsia-600',
    bgAlpha: 'bg-fuchsia-500/10',
    bgHover: 'hover:bg-fuchsia-500/20',
    glow: 'shadow-[0_0_15px_rgba(255,0,80,0.5)]',
    auraHigh: 'shadow-[0_0_100px_rgba(0,255,255,0.4)]',
    auraMed: 'shadow-[0_0_50px_rgba(255,0,80,0.3)]',
    auraLow: 'shadow-[0_0_20px_rgba(0,255,255,0.2)]',
    toastGlow: 'shadow-[0_0_30px_rgba(255,0,80,0.4)]',
    glowPrimary: '255, 0, 80',
    glowSecondary: '0, 255, 255'
  },
  
  // NEW VIVID THEMES
  synthwave: makeTheme('synthwave', 'bg-[#0d0221]', 'text-cyan-300', 'fuchsia'), 
  matcha: makeTheme('matcha', 'bg-[#0a120a]', 'text-lime-100', 'lime'), 
  bloodmoon: makeTheme('bloodmoon', 'bg-[#0a0000]', 'text-rose-100', 'red', 'bg-red-600'), 
  aurora: makeTheme('aurora', 'bg-[#001214]', 'text-white', 'teal'), 
  goldrush: makeTheme('goldrush', 'bg-[#0f0a00]', 'text-amber-100', 'amber'), 
  bubblegum: makeTheme('bubblegum', 'bg-[#1a0a14]', 'text-pink-200', 'sky'), 
  void: makeTheme('void', 'bg-[#000000]', 'text-zinc-500', 'zinc'), 
  hacker: makeTheme('hacker', 'bg-[#020a02]', 'text-lime-400', 'lime'),
  
  sakura: makeTheme('sakura', 'bg-[#1a0a10]', 'text-pink-300', 'pink'),
  ocean: makeTheme('ocean', 'bg-[#000a1a]', 'text-cyan-300', 'cyan'),
  dracula: makeTheme('dracula', 'bg-[#1a0a1a]', 'text-purple-400', 'fuchsia'),
  tokyo: makeTheme('tokyo', 'bg-[#0a0a1a]', 'text-indigo-400', 'blue'),
  forest: makeTheme('forest', 'bg-[#051a0a]', 'text-emerald-300', 'emerald'),
  obsidian: makeTheme('obsidian', 'bg-[#0f0f0f]', 'text-orange-500', 'orange'),
  glacier: makeTheme('glacier', 'bg-[#0a121a]', 'text-sky-200', 'sky')
};

export const THEME_KEYS = Object.keys(THEMES);
export const PRESET_KEYS = ['nord', 'matrix', 'spiderman', 'ironman', 'captain', 'madrid', 'barca', 'galaxy', 'synthwave', 'bloodmoon', 'bubblegum'];
export const SOUND_KEYS = ['thocky', 'linear', 'clicky', 'raindrops', 'arcade', 'modelm', 'alpaca'];

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  category: 'SKILL' | 'HARDCORE' | 'GRIND' | 'SUPER';
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'speed_demon', title: 'Speed Demon', desc: 'Break 100 WPM on any test.', icon: '⚡', category: 'SKILL' },
  { id: 'hyperspace', title: 'Hyperspace', desc: 'Break 140 WPM on any test.', icon: '🚀', category: 'SKILL' },
  { id: 'sniper', title: 'Sniper', desc: 'Finish a test of 50+ words with 100% Accuracy.', icon: '🎯', category: 'SKILL' },
  { id: 'unbreakable', title: 'Unbreakable', desc: 'Reach a flawless streak (Combo) of 200+.', icon: '🛡️', category: 'SKILL' },
  { id: 'daredevil', title: 'Daredevil', desc: 'Complete a test with Sudden Death activated.', icon: '💀', category: 'HARDCORE' },
  { id: 'jedi_senses', title: 'Jedi Senses', desc: 'Complete a test with Blind Mode and Fog of War.', icon: '🧠', category: 'HARDCORE' },
  { id: 'under_pressure', title: 'Under Pressure', desc: 'Complete a test with Overclocked (Accuracy > 95%).', icon: '⏱️', category: 'HARDCORE' },
  { id: 'masochist', title: 'Masochist', desc: 'Win with Sudden Death, Overclocked, Blind, and Fog active.', icon: '🔥', category: 'HARDCORE' },
  { id: 'apprentice', title: 'Apprentice', desc: 'Reach Level 5.', icon: '⭐', category: 'GRIND' },
  { id: 'grandmaster', title: 'Grandmaster', desc: 'Reach Level 20.', icon: '👑', category: 'GRIND' },
  { id: 'fashionista', title: 'Fashionista', desc: 'Cycle through every single theme.', icon: '👗', category: 'GRIND' },
  { id: 'keyboard_warrior', title: 'Keyboard Warrior', desc: 'Play 100 total tests.', icon: '⚔️', category: 'GRIND' },
  { id: 'cyber_ninja', title: 'The Cyber Ninja', desc: 'Unlock Speed Demon + Jedi Senses.', icon: '🥷', category: 'SUPER' },
  { id: 'perfectionist', title: 'The Perfectionist', desc: 'Unlock Sniper + Unbreakable.', icon: '✨', category: 'SUPER' },
  { id: 'type_nova', title: 'TYPE NOVA', desc: 'Unlock every single badge in the game.', icon: '🌌', category: 'SUPER' }
];

export type Phase = 'CONFIGURING' | 'READY' | 'COUNTDOWN' | 'TYPING' | 'FINISHED';
export type SoundProfile = typeof SOUND_KEYS[number];

// ─── SUPABASE ─────────────────────────────────────────────────────────
export const SUPABASE_URL = 'https://ikcshjktqmoqakesxzlo.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_MCITmPmDsVnZwjzVqmvvjQ_68JSO_W4';