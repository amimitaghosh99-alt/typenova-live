# Contributing to TypeNova

Thank you for your interest in contributing to **TypeNova**! We are thrilled to welcome developers, designers, typists, and cyber-enthusiasts from around the globe.

---

## 📜 Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started & Local Setup](#getting-started--local-setup)
3. [Branching & Commit Standards](#branching--commit-standards)
4. [Development Guidelines](#development-guidelines)
5. [Submitting a Pull Request (PR)](#submitting-a-pull-request-pr)
6. [Adding Custom Themes & Sound Profiles](#adding-custom-themes--sound-profiles)

---

## 1. Code of Conduct
All contributors and maintainers are expected to uphold our [**Code of Conduct**](CODE_OF_CONDUCT.md). Please treat all community members with respect and kindness.

---

## 2. Getting Started & Local Setup

### 2.1 Prerequisites
* **Node.js:** v20.x or higher
* **Package Manager:** `npm` (v10+), `pnpm`, or `yarn`
* **Git:** Latest version

### 2.2 Local Setup
1. **Fork the Repository** on GitHub.
2. **Clone your fork locally:**
   ```bash
   git clone https://github.com/<your-username>/typenova-live.git
   cd typenova-live
   ```
3. **Install Dependencies:**
   ```bash
   npm install
   ```
4. **Create a Local Environment File:**
   ```bash
   cp .env.example .env
   ```
5. **Launch the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Branching & Commit Standards

We follow the [**Conventional Commits**](https://www.conventionalcommits.org/) specification:

### Branch Naming:
* `feat/short-description` (for new features)
* `fix/short-description` (for bug fixes)
* `perf/short-description` (for performance improvements)
* `docs/short-description` (for documentation changes)

### Commit Messages:
```
<type>(<optional scope>): <description>

[optional body]
```

**Examples:**
* `feat(typing): add custom quote author attribution display`
* `fix(starfield): eliminate canvas re-render glitch on keypress`
* `perf(caret): replace DOM bounding rect calculations with CSS transforms`
* `docs(readme): add installation guide for macOS and Linux`

---

## 4. Development Guidelines

### 4.1 Strict Performance Rules (120+ FPS Target)
* **Zero Forced Reflows:** Never call synchronous layout measurement functions (`getBoundingClientRect()`, `offsetWidth`, `scrollHeight`) in keystroke handlers or animation loops.
* **Component Memoization:** Wrap high-frequency UI components in `React.memo`.
* **Resource Disposal:** Ensure all WebGL contexts, Three.js geometries/materials, event listeners, and timers are cleanly disposed when unmounting.

### 4.2 Code Style & Linting
Run the typechecker and linter before submitting code:
```bash
# Type check TypeScript
npx tsc --noEmit

# Run ESLint
npm run lint

# Test production build
npm run build
```

---

## 5. Submitting a Pull Request (PR)

1. Ensure your branch is rebased onto the latest `main` branch.
2. Verify that `npx tsc --noEmit` and `npm run build` pass with 0 errors.
3. Open a Pull Request on GitHub with a clear description:
   * **What problem does this solve?**
   * **Screenshots / GIFs of visual changes**
   * **Any performance implications or benchmarks**
4. Tag a maintainer for review. We aim to review all PRs within 48 hours!

---

## 6. Adding Custom Themes & Sound Profiles

### Adding a New Theme:
1. Open `src/data/constants.ts`.
2. Add your theme object to the `THEMES` dictionary specifying background classes, text colors, accent glows, and border tokens.

### Adding a Mechanical Switch Sound Profile:
1. Add high-quality audio WAV/MP3 keypress samples to `public/sounds/`.
2. Register the sound profile in `src/hooks/useAudioEngine.ts` with low-latency Web Audio API gain and buffer configurations.

---

<div align="center">
Thank you for building the future of typing with us! 🚀
</div>
