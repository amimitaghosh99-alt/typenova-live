# Security Policy & Data Privacy

## 🔒 Supported Versions

We actively provide security patches and updates for the following versions:

| Version | Supported |
| :--- | :--- |
| **2.5.x (Current)** | :white_check_mark: Yes |
| **2.4.x** | :white_check_mark: Yes |
| **< 2.4.0** | :x: No (Please upgrade to latest) |

---

## 🛡️ Data Privacy & BYOK Architecture

TypeNova is architected with an **offline-first, zero-knowledge security model**:

1. **Client-Side API Key Storage (BYOK):**
   * All user-provided AI keys (Groq, OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter) are stored exclusively in the browser's `localStorage` on your local device.
   * Keys are **never logged, saved, or routed** through any TypeNova backend servers. All AI network requests originate directly from the user's browser client to the respective provider API endpoints via HTTPS.

2. **Supabase Row-Level Security (RLS):**
   * All user profiles, race records, and social friend lists in the Supabase PostgreSQL database are protected by strict Row-Level Security policies.
   * Users can only read and modify their own records unless explicitly permitted by public leaderboard views.

3. **WebRTC Media Privacy:**
   * Audio/Video calling during multiplayer matches is strictly Peer-to-Peer (P2P). No video or audio streams are recorded, processed, or relayed through our application servers.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within TypeNova, please report it responsibly:

1. **Do not disclose the issue publicly** on GitHub issues, Discord, or public forums.
2. Email your findings directly to the core maintainers:
   * **Email:** `security@typenova.dev` *(or open a private security advisory on GitHub)*
3. **Include the following details:**
   * Description of the vulnerability
   * Steps to reproduce or proof-of-concept
   * Potential impact of the issue

### Our Commitment:
* We will acknowledge receipt of your report within **24 hours**.
* We will provide an estimated timeline for remediation within **72 hours**.
* We will credit your disclosure in our security release notes (unless you prefer to remain anonymous).

---

*Thank you for helping keep the TypeNova platform and its community safe!*
