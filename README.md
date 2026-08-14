<div align="center">

# ⚡ TypeNova

### *The Next-Gen Cybernetic Gamified Typing Platform*

[![Version](https://img.shields.io/badge/version-2.5.0-cyan?style=for-the-badge&logo=rocket)](https://github.com/amimitaghosh99-alt/typenova-live)
[![License: MIT](https://img.shields.io/badge/License-MIT-00f2fe?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![React 19](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-22c55e?style=for-the-badge)](CONTRIBUTING.md)

[**Explore Live Demo**](https://typenova-live.vercel.app) • [**Read the PRD**](PRD.md) • [**Architecture Specs**](ARCHITECTURE.md) • [**Roadmap**](ROADMAP.md)

</div>

---

## 🌌 Overview

**TypeNova** is an open-source, ultra-low latency gamified typing platform engineered for competitive speed typists, software engineers, and gamers. 

Combining **sub-millisecond mechanical input processing**, **3D CyberHands RPG progression**, **real-time multiplayer racing**, and an **autonomous AI Coach (Aru)**, TypeNova transforms daily touch-typing practice into an adrenaline-fueled cybernetic sport.

```
       ┌────────────────────────────────────────────────────────┐
       │     ___ _   _ ___ _____ _____ _   _ _____  ___         │
       │    |_ _| \ | |_ _|_   _|_   _| \ | | ____|/ _ \        │
       │     | ||  \| || |  | |   | | |  \| |  _| | | | |       │
       │     | || |\  || |  | |   | | | |\  | |___| |_| |       │
       │    |___|_| \_|___| |_|   |_| |_| \_|_____|\___/        │
       │           NEXT-GEN GAMIFIED TYPING SUITE               │
       └────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

### ⚡ 1. High-Frequency Mechanical Typing Engine
* **$< 2\text{ms}$ Input Processing:** Zero layout thrashing and reflow-free caret tracking targeting a solid **120+ FPS**.
* **Comprehensive Game Modes:**
  * **Time Trials:** 15s, 30s, 60s, 120s high-intensity sprints.
  * **Word Sets:** 10, 25, 50, 100 benchmark batches.
  * **Code Mode:** Real-world programming syntax across 15+ languages (*JavaScript, TypeScript, Python, Rust, Go, C++, HTML/CSS, SQL, Bash*).
  * **Quotes:** Literary, philosophical, and cyberpunk lore quotes.
* **Cognitive Training Modifiers:**
  * **Blind Mode:** Hides input errors to enforce pure muscle memory.
  * **Mirrored Mode:** Flipped layout challenging spatial cognition.
  * **Fog Mode:** Procedural mist that hides upcoming words until current targets are cleared.

---

### 🤖 2. Smart AI Coach (Aru) & BYOK Intelligence
* **Bring Your Own Key (BYOK):** Seamless multi-provider support for **Groq**, **OpenAI**, **Anthropic (Claude)**, **Google Gemini**, **DeepSeek**, and **OpenRouter**.
* **Zero-Latency Local AI:** Automatic integration with Chrome's built-in **Gemini Nano** Prompt API (`window.ai`) for 100% private on-device intelligence with 0 API keys required.
* **Dynamic Weakness Diagnostics:** Real-time analysis of slow bigrams (e.g. `th`, `str`, `ing`) and instantaneous generation of targeted micro-drills to fix specific finger weaknesses.
* **Support Technician Bot:** In-app diagnostics that automatically tests, validates, and slots API keys upon pasting into the terminal.

---

### 🎮 3. RPG Academy & CyberHands Progression
* **Formulaic XP & Tier Ranks:** Earn XP based on `(WPM × Accuracy) + Streak Bonus` and climb from *Novice* to *NetRunner* and *Singularity God*.
* **Interactive 3D CyberHands:** Real-time visual overlay mirroring physical finger placement with unlockable skins (*Neon Cyan, Obsidian, Gold Foil, Holographic Prism*).
* **Daily Bounties & Trophy Showcase:** Rotating daily quests with achievement badges displayed on public player profile cards.

---

### 🏁 4. Real-Time Multiplayer Racing & Comms
* **WebSocket Synced Drag Races:** Public matchmaking queues and private custom-code race rooms.
* **Interactive Post-Match Telemetry:** Keystroke-by-keystroke replay visualizer with live speed curves, error heatmaps, and in-lobby chat.
* **P2P WebRTC Video/Audio Calls:** Floating, draggable picture-in-picture video chat during matches with 0 server media relay.

---

### 🎨 5. Cybernetic Aesthetics & Audio FX
* **Kinetic 3D Mechanical Keyboard:** Full 100% mechanical keyboard rendered in Three.js on landing views, featuring reactive physical key depression and emissive bloom.
* **WebGL Fluid Simulation (`SplashCursor`):** GPU-accelerated fluid mechanics reacting to cursor velocity.
* **Acoustic Switch Synthesis:** Multi-sampled mechanical switch sound profiles (*Cherry MX Blue, Red, Brown, Topre, Typewriter, Cyber Laser*).
* **15+ Themes:** Starfield, Matrix CRT, Cyberpunk, Dracula, Nord, Obsidian, Synthwave, Vaporwave, and more.

---

### 📱 6. Progressive Web App (PWA)
* **Install Anywhere:** Native windowed app experience on Windows, macOS, Linux, iOS, and Android.
* **Offline-First:** Service worker pre-caching ensures typing tests, quotes, code drills, and audio synthesizers run seamlessly without internet connectivity.

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Core Frontend** | [React 19](https://react.dev/), [TypeScript 5.8](https://www.typescriptlang.org/), [Vite 7](https://vite.dev/) |
| **Styling & UI** | [Tailwind CSS v3.4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/) |
| **3D & Visuals** | [Three.js](https://threejs.org/), Custom GLSL Shaders, WebGL Fluid Simulation, [Framer Motion](https://www.framer.com/motion/) |
| **Audio Engine** | Web Audio API Low-Latency Synthesizer |
| **Backend & Cloud** | [Supabase](https://supabase.com/) (Auth, PostgreSQL, Row-Level Security, Realtime Subscriptions) |
| **Realtime & Comms** | WebSockets (Socket.io) + WebRTC Peer-to-Peer |
| **PWA & Offline** | `vite-plugin-pwa`, Workbox Pre-caching |

---

## ⚡ Quickstart & Local Development

### Prerequisites
* **Node.js** 20.x or higher
* **npm** or **pnpm** / **yarn**

### 1. Clone the Repository
```bash
git clone https://github.com/amimitaghosh99-alt/typenova-live.git
cd typenova-live
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the sample environment file:
```bash
cp .env.example .env
```
Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to launch TypeNova.

### 5. Build for Production
```bash
npm run build
npm run preview
```

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Tab</kbd> + <kbd>Enter</kbd> | Restart current typing test |
| <kbd>Esc</kbd> | Open / Close Settings modal |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Quick Command Palette |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> | Toggle Aru AI Coach drawer |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> | Quick Join Multiplayer Arena |

---

## 📂 Project Structure

```
typenova/
├── public/                 # PWA icons, manifest, static sound samples
├── src/
│   ├── components/         # 40+ UI components, modals, and overlays
│   │   ├── academy/        # CyberHands visualizer & virtual keyboard
│   │   ├── graphs/         # Replay telemetry & performance charts
│   │   ├── ui/             # Radix UI primitives & Starfield canvas
│   │   ├── AIChatBot.tsx   # Aru AI Assistant drawer with LaserFlow shaders
│   │   ├── KineticKeyboard.tsx # 3D Three.js reactive keyboard
│   │   ├── SplashCursor.tsx # GPU fluid simulation
│   │   └── TypingArea.tsx  # Low-latency typing input & gliding caret
│   ├── contexts/           # Loader, VideoCall, and WebRTC state providers
│   ├── data/               # Themes, switch sound profiles, quote datasets
│   ├── hooks/              # Core engines (useTypingEngine, useRace, useRPGSystem, etc.)
│   ├── lib/                # AI client, Supabase client, audio synthesizer, technician brain
│   ├── pages/              # Login, Landing, and Arena views
│   ├── App.tsx             # Root container & HUD orchestrator
│   └── main.tsx            # Application entry & Service Worker registration
├── vite.config.ts          # Vite configuration & VitePWA manifest
├── PRD.md                  # Comprehensive Product Requirements Document
├── ARCHITECTURE.md         # System Architecture & Technical Specifications
├── CONTRIBUTING.md         # Developer contribution guidelines
└── LICENSE                 # MIT License
```

---

## 🤝 Contributing

We welcome contributions from developers, designers, and typing enthusiasts!  
Check out our [**Contributing Guide**](CONTRIBUTING.md) to get started with pull requests, issue reporting, and style guidelines.

---

## 📄 License

TypeNova is 100% Free and Open Source under the **[MIT License](LICENSE)**.

---

<div align="center">

**Built with precision for the global typing community.**  
⭐ *If you love TypeNova, give us a star on [GitHub](https://github.com/amimitaghosh99-alt/typenova-live)!*

</div>
