# Security Policy & Architecture

## 🔒 Supported Versions

We actively provide security patches and dependency updates for the following versions:

| Version | Supported | Notes |
| :--- | :--- | :--- |
| **3.1.x (Current)** | :white_check_mark: Yes | Mainline production release with BYOK client isolation & real-time engine |
| **3.0.x** | :white_check_mark: Yes | Critical security hotfixes only |
| **< 3.0.0** | :x: No | Unsupported; upgrade immediately |

---

## 🛡️ BYOK (Bring-Your-Own-Key) Client Architecture

TypeNova implements an **offline-first, zero-knowledge client security model** for all AI features (Aru AI Coaching, Live Keystroke Biomechanics, and Support Technician).

### Where User API Keys Are Stored in the Browser

User-provided API keys (Groq, OpenAI, Google Gemini, Anthropic, OpenRouter, Moonshot, Zhipu, MiniMax) are stored exclusively in the browser using the Web Storage API:

1. **Storage Mechanisms & Keys**:
   All AI configuration keys are defined in [`src/lib/aiClient.ts`](file:///src/lib/aiClient.ts):
   * **`typezen_byok_key`**: Stores the raw user API key.
   * **`typenova_ai_key_persistence`**: Stores the user's storage mode selection (`'persistent'` vs `'session'`).
   * **`typezen_byok_url`**: Stores the user's configured OpenAI-compatible API base URL (defaults to `https://api.groq.com/openai/v1`).
   * **`typezen_byok_model`**: Stores the chosen model identifier (defaults to `groq/compound-mini`).
   * **`typenova_usage_tokens` / `typenova_daily_tokens` / `typenova_daily_requests`**: Stores local client-side token accounting and quota telemetry (never synchronized to servers).

2. **Dual Persistence Modes**:
   * **Persistent Mode (`localStorage`)**: The key is stored in browser `localStorage`. It remains available across browser sessions and tabs on the local device until explicitly purged.
   * **Session-Only Mode (`sessionStorage`)**: The key is stored strictly in memory via `sessionStorage`. When the browser tab or window is closed, the key is permanently and automatically destroyed by the browser engine.

3. **Zero Backend Transit Guarantee**:
   * User keys are **never transmitted to, routed through, or cached on TypeNova servers, edge functions, or proxies**.
   * All LLM inferences are dispatched via direct HTTPS `fetch()` requests from the user's browser client directly to the respective AI provider's official API endpoints.
   * TypeNova's backend cannot read, leak, or log user keys because it never receives them.

4. **UI Masking & 1-Click Key Destruction**:
   * **Redaction**: Keys are never displayed in full within UI modals or screens. The `redactApiKey()` utility masks the key body, displaying only the leading 4 and trailing 4 characters (e.g. `sk-p••••••••••••••••klmn`).
   * **Instant Purge**: Selecting **"Purge Key & Diagnostics"** in Settings calls `clearAllAIData()`, immediately deleting all keys from both `localStorage` and `sessionStorage`, wiping token and request history, and firing a cross-tab synchronization event to erase active keys in memory.

---

## 🗄️ Supabase Row-Level Security (RLS) Policy

### Mandatory RLS Enforcement

> [!IMPORTANT]
> **Row-Level Security (RLS) MUST ALWAYS BE ENABLED** on all PostgreSQL tables in the `public` schema. Disabling RLS on any table exposes application data to unauthorized public read/write access via the client PostgREST API.

All TypeNova database tables enforce strict RLS policies:

```sql
-- Enforced across all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mode_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patron_contributions ENABLE ROW LEVEL SECURITY;
```

### Table Access Boundaries & Anti-Tamper Guards

1. **User Profiles (`profiles`)**:
   * Authenticated users may read public profile fields.
   * Users may only update their own profile record (`auth.uid() = id`).
   * Sensitive columns (`is_admin`, `elo`) are protected by database trigger guards (`guard_profiles_sensitive_columns`), blocking direct client escalation even if an update request is signed with a valid JWT.

2. **Ranked Matches & Elo Duels (`ranked_matches`)**:
   * Match results and rating adjustments cannot be directly inflated by client updates. Duel outcomes and Elo calculation are processed exclusively through PostgreSQL `SECURITY DEFINER` stored procedures (`resolve_ranked_duel`).

3. **Direct Messages (`direct_messages`)**:
   * Private communications are restricted strictly to conversation participants (`auth.uid() = sender_id OR auth.uid() = recipient_id`).

4. **Patron Contributions & Leaderboards (`patron_contributions`, `mode_scores`)**:
   * Contributions cannot be fabricated via client `INSERT` queries; verified webhooks and server-side functions validate transaction records.
   * Mode scores enforce server-side constraints and anticheat verification before inclusion on public boards.

5. **Client Key Safety**:
   * The frontend application must only ever be configured with `VITE_SUPABASE_ANON_KEY` (public anonymous role).
   * The Supabase `service_role` key must **NEVER** be committed to the repository, bundled into client code, or exposed in environment configurations.

---

## 🔍 Automated Security Scanning & Continuous Audit

TypeNova uses multiple complementary automated security systems:

### 1. CodeQL Static Application Security Testing (SAST)
* Configured in [`.github/workflows/codeql.yml`](file:///.github/workflows/codeql.yml).
* Automatically analyzes TypeScript and JavaScript source code on every push and pull request to `main`, as well as on a weekly scheduled cron.
* Scans for security vulnerabilities including cross-site scripting (XSS), prototype pollution, SQL/query injection, and insecure API handling.

### 2. Dependabot Dependency & Vulnerability Alerts
* Configured in [`.github/dependabot.yml`](file:///.github/dependabot.yml).
* Periodically scans `npm` packages and GitHub Actions workflows for known CVEs.
* Automatically generates pull requests with security patches when vulnerable dependencies are identified.

### 3. Secret Scanning & Push Protection
* **Gitleaks CI Workflow**: Configured in [`.github/workflows/secret-scan.yml`](file:///.github/workflows/secret-scan.yml) to scan all git commits and PRs using `gitleaks/gitleaks-action`.
* **GitHub Native Secret Scanning**: Free for public GitHub repositories.
  To ensure native GitHub protection is active on the repository:
  1. Navigate to **Settings** > **Code security and analysis** on GitHub.
  2. Enable **Secret scanning** (detects leaked tokens and API credentials).
  3. Enable **Push protection** (blocks git pushes containing detected secrets before they reach the remote repository).
  4. Enable **Dependabot alerts** and **Dependabot security updates**.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within TypeNova, please report it responsibly:

1. **Do not disclose the issue publicly** on GitHub issues, Discord, or social media.
2. Open a **[GitHub Private Security Advisory](https://github.com/amimitaghosh99-alt/typenova-live/security/advisories/new)** under the **Security** tab of the repository. This enables private coordination and validation with maintainers prior to disclosure.
3. **Include in your report:**
   * A clear summary of the vulnerability.
   * Step-by-step instructions or minimal proof-of-concept to reproduce.
   * The potential security impact on users or the platform.

### Remediation Timeline
* **Acknowledgement:** Within 24 hours.
* **Triage & Assessment:** Within 48 hours.
* **Patch & Disclosure:** Within 7 calendar days for high/critical severity issues.
