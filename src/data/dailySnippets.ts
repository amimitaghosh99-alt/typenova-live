/**
 * Dedicated 31-Day Daily Challenge Snippet Library.
 *
 * Provides exactly one unique, complete, beautifully crafted passage
 * for every day of any month (Days 1 to 31). Each snippet is self-contained
 * (~45 to 65 words), grammatically complete, and never cut off mid-sentence.
 */

export interface DailySnippet {
  day: number;
  title: string;
  category: 'NEURO' | 'TECH' | 'COSMOS' | 'NATURE' | 'PHILOSOPHY' | 'CRAFT';
  text: string;
}

export const DAILY_SNIPPETS: DailySnippet[] = [
  {
    day: 1,
    title: "The Architecture of Thought",
    category: "NEURO",
    text: "Clear thinking demands disciplined structure. When complex problems arise, break them down into fundamental truths rather than copying external conventions. True mastery begins by questioning assumptions, discarding mental clutter, and allowing logic to dictate each step forward. With patience and calm focus, chaotic noise resolves into enduring understanding."
  },
  {
    day: 2,
    title: "Deep Space Exploration",
    category: "COSMOS",
    text: "Far beyond the orbit of Neptune, solitary probes drift silently through the interstellar vacuum. Across billions of miles, faint radio signals bridge the cosmic expanse, carrying precious telemetry back to Earth. Each transmission reminds us that curiosity can outlast generations and pierce the coldest depths of the universe."
  },
  {
    day: 3,
    title: "Synaptic Velocity",
    category: "NEURO",
    text: "Muscle memory is forged through patient repetition. Each deliberate keystroke reinforces neural pathways, wrapping nerve fibers in insulating myelin until deliberate effort transforms into instinctive speed. Trust your fingers, breathe steadily, and let rhythm guide your cadence without rushing ahead of your natural perception."
  },
  {
    day: 4,
    title: "The Silent Forest",
    category: "NATURE",
    text: "Dawn breaks quietly across the northern pines, filtering pale amber light through heavy mist. Ancient evergreen branches absorb every stray sound, leaving only the soft drip of condensed morning dew upon the mossy earth. In this sanctuary of stillness, time slows, and the frantic pace of the modern world dissolves."
  },
  {
    day: 5,
    title: "Quantum Decoherence",
    category: "TECH",
    text: "Subatomic particles exist in delicate superpositions until an observation collapses their probabilities into a singular outcome. Modern quantum computers isolate these fragile wave functions within cryogenic chambers, cooling processors close to absolute zero to prevent stray thermal vibrations from disturbing the fragile calculations."
  },
  {
    day: 6,
    title: "The Rhythm of Creation",
    category: "CRAFT",
    text: "Master craftspeople do not hurry their instruments. Whether carving resonant tonewood, shaping molten glass, or writing elegant algorithms, the best work emerges from steady, continuous momentum. Learn to relish the tactile feedback of your tools, for enduring quality is the natural byproduct of deliberate devotion."
  },
  {
    day: 7,
    title: "Cybernetic Horizon",
    category: "TECH",
    text: "The boundary between human cognition and synthetic intelligence grows thinner with each passing year. High-bandwidth neural interfaces translate motor impulses into digital commands with astonishing fidelity. As computational fabrics weave into our daily routines, humanity embarks on a bold journey toward symbiotic evolution."
  },
  {
    day: 8,
    title: "The Oceanic Abyss",
    category: "NATURE",
    text: "Miles beneath the sunlit ocean surface, crushing pressures create an alien realm of total darkness. Strange bioluminescent creatures flicker like wandering stars, illuminating volcanic hydrothermal vents that spew mineral-rich fluids into the icy water. Life thrives here against all odds, sustained by chemical heat."
  },
  {
    day: 9,
    title: "The Ancient Library",
    category: "PHILOSOPHY",
    text: "Within the vaulted stone arches of the forgotten archive, dust motes drift across weathered vellum manuscripts. Bound in aged leather, these forgotten folios hold centuries of philosophical contemplation, scientific curiosity, and poetry. Every page serves as a quiet dialogue across time between restless minds."
  },
  {
    day: 10,
    title: "Algorithmic Symmetry",
    category: "TECH",
    text: "Mathematical beauty often hides within recursive formulas and balanced tree structures. A well-designed function solves intricate problems with breathtaking economy, executing transformations in logarithmic time while preserving absolute clarity. Elegance in software is never accidental; it is simplicity engineered with uncompromising precision."
  },
  {
    day: 11,
    title: "The Mountain Ascent",
    category: "NATURE",
    text: "High upon the windswept granite ridge, the air grows thin and cold. Every deliberate step demands focus, balance, and unwavering resolve. As the clouds part below, vast valleys unfold like miniature tapestries, rewarding those who endured the steep climb with an unclouded view of the world."
  },
  {
    day: 12,
    title: "Temporal Mechanics",
    category: "COSMOS",
    text: "Einstein revealed that time is not a universal constant, but a flexible fabric warped by mass and velocity. Near the boundary of a spinning black hole, minutes stretch into cosmic epochs. We are perpetual travelers along these temporal geodesics, carried forward inexorably by the thermodynamic arrow of entropy."
  },
  {
    day: 13,
    title: "The Artisan Forge",
    category: "CRAFT",
    text: "Sparks cascade across the darkened anvil as rhythmic hammer strikes fold glowing carbon steel. Repeated heating, hammering, and quenching align the crystalline microstructure of the metal, transforming a brittle ingot into an extraordinarily resilient edge. Heat and pressure forge enduring resilience."
  },
  {
    day: 14,
    title: "The Microscopic World",
    category: "NEURO",
    text: "Inside every biological cell, millions of molecular machines execute coordinated chemical reactions with microscopic precision. Motor proteins march along microtubule highways, transporting cellular cargo to sustain life. What appears static to our eyes is actually a whirlwind of microscopic activity and purpose."
  },
  {
    day: 15,
    title: "The Midnight City",
    category: "TECH",
    text: "Rain falls over the neon-lit boulevard, casting shimmering reflections across wet pavement. High overhead, automated monorails glide silently along elevated concrete pylons, while fiber optic arteries pulse beneath the streets. The sleepless metropolis hums with millions of interwoven voices, data streams, and dreams."
  },
  {
    day: 16,
    title: "The Stoic Compass",
    category: "PHILOSOPHY",
    text: "External events lie outside your control, but your judgment and actions remain entirely your own. True tranquility is cultivated by distinguishing what you can influence from what you must accept. Anchor your focus in integrity and steady purpose, and no external turmoil can disrupt your inner citadel."
  },
  {
    day: 17,
    title: "Bioluminescent Tides",
    category: "NATURE",
    text: "At midnight along the secluded coastline, rolling surf glows with an ethereal turquoise radiance. Microscopic phytoplankton ignite upon contact with breaking waves, illuminating the dark shoreline with cold living light. Walking along the wet sand leaves glowing footprints that fade softly into the starlit night."
  },
  {
    day: 18,
    title: "The Silicon Compiler",
    category: "TECH",
    text: "Compilers translate abstract human reasoning into binary silicon execution. Lexical analysis strips whitespace, parsers build hierarchical syntax trees, and optimization passes eliminate redundant logic until thousands of lines of source code condense into blazing-fast machine instructions."
  },
  {
    day: 19,
    title: "The Desert Starlight",
    category: "COSMOS",
    text: "Under the vast dome of the desert sky, obsidian shadows stretch across undulating sand dunes. Free from the ambient glare of civil networks, the Milky Way stretches overhead in magnificent detail. Ancient navigators charted their journeys by these celestial landmarks, steering by timeless starlight."
  },
  {
    day: 20,
    title: "Neuroplasticity",
    category: "NEURO",
    text: "The human brain is an ever-changing landscape that rewires itself in response to experience. Synapses strengthen with consistent practice and fade through disuse. When you encounter friction or struggle, realize that your nervous system is actively reorganizing to make tomorrow's effort feel effortless."
  },
  {
    day: 21,
    title: "The Great Barrier",
    category: "NATURE",
    text: "Beneath turquoise tropical swells, vast coral colonies construct the largest living structures visible from orbit. Millions of tiny polyps secret calcium carbonate foundations over centuries, building vibrant marine cities that shelter thousands of species within an intricate underwater ecosystem."
  },
  {
    day: 22,
    title: "The Grand Automaton",
    category: "CRAFT",
    text: "Fine horology marries physics with aesthetic grace. Hand-beveled brass wheels, tempered steel pinions, and synthetic rubies interact within a miniature escapement, beating five times every second to divide continuous time into orderly fractions of mechanical beauty."
  },
  {
    day: 23,
    title: "The Aurora Borealis",
    category: "COSMOS",
    text: "Solar winds collide with Earth's protective magnetic envelope, channeling charged particles toward the polar skies. High in the ionosphere, excited oxygen and nitrogen atoms release ribbons of emerald and violet luminescence that ripple like celestial curtains across the subarctic night."
  },
  {
    day: 24,
    title: "The Hermit's Lantern",
    category: "PHILOSOPHY",
    text: "Solitude is not loneliness; it is the quiet forge of self-knowledge. In intentional silence, the relentless clamor of modern expectation falls away, allowing authentic convictions to rise to the surface. Protect your attention fiercely, for where your focus goes, your life invariably follows."
  },
  {
    day: 25,
    title: "Gravitational Waves",
    category: "COSMOS",
    text: "A billion years ago, two colossal black holes merged in a violent cosmic collision. The ripples in the fabric of spacetime raced across the cosmos at light speed, finally vibrating laser interferometers on Earth by less than the width of an atomic nucleus. Invisible ripples whisper cosmic history."
  },
  {
    day: 26,
    title: "The Glassmaker's Breath",
    category: "CRAFT",
    text: "Pure silica sand melts into brilliant molten quartz within the furnace crucible. With gentle rotation on a hollow blowpipe, the artisan shapes glowing liquid crystal using air, wooden paddles, and gravity. As the vessel cools, fragile fluidity freezes into timeless clarity."
  },
  {
    day: 27,
    title: "Subterranean Caverns",
    category: "NATURE",
    text: "Limestone caverns carve silent cathedrals deep beneath the mountains. Over countless millennia, mineral-rich drops of water deposit microscopic calcite crystals, gradually growing slender stalactites from high cavern ceilings to mirror the stillness of subterranean crystal pools below."
  },
  {
    day: 28,
    title: "The Kinetic Engine",
    category: "TECH",
    text: "Balanced flywheels spin inside evacuated casings, storing kinetic energy with minimal friction. Ceramic bearings and magnetic levitation ensure that rotational inertia converts back into electrical power instantly during peak demands, stabilizing regional power grids with clean physics."
  },
  {
    day: 29,
    title: "The Digital Loom",
    category: "CRAFT",
    text: "Two centuries ago, punch cards guided the mechanical needles of the Jacquard loom, weaving intricate silk tapestries. That visionary fusion of automated logic and material craft planted the seeds of modern computation, proving that complex ideas could be codified into programmable sequences."
  },
  {
    day: 30,
    title: "The Celestial Equinox",
    category: "COSMOS",
    text: "Twice each year, planetary orbit aligns such that the sun shines directly on the equator, dividing day and night into equal halves across the globe. This quiet celestial balance marks the perpetual changing of seasons, reminding us of our planet's graceful symmetry in cosmic space."
  },
  {
    day: 31,
    title: "The Infinite Horizon",
    category: "PHILOSOPHY",
    text: "Mastery has no final destination; it is an ongoing journey of deliberate self-refinement. Speed and accuracy are merely milestones along a path of deepening harmony between thought, intention, and action. Continue forward with curiosity, practice with joy, and celebrate every keystroke."
  }
];

/**
 * Returns today's curated snippet based on the day of the month (1-31).
 * Every player on the same calendar day gets the exact same snippet globally.
 */
export function getDailySnippet(date: Date = new Date()): DailySnippet {
  const dayOfMonth = date.getDate(); // 1 to 31
  // Use dayOfMonth directly (clamped 1..31)
  const index = Math.max(0, Math.min(DAILY_SNIPPETS.length - 1, dayOfMonth - 1));
  return DAILY_SNIPPETS[index];
}

/**
 * Returns the exact text for today's daily challenge.
 */
export function getDailyChallengeText(date: Date = new Date()): string {
  return getDailySnippet(date).text;
}

/**
 * Returns the word count of today's snippet.
 */
export function getDailyChallengeWordCount(date: Date = new Date()): number {
  return getDailyChallengeText(date).trim().split(/\s+/).length;
}
