# TypeNova — Login & Cloud Sync setup

The app code for Google login, cloud progress sync, and login-gated
leaderboard submission is already in place. Two things must be configured in
your Supabase / Google dashboards before it works end to end.

Supabase project: `ikcshjktqmoqakesxzlo` (URL in `src/data/constants.ts`).

---

## 1. Run the database migration

Open **Supabase → SQL Editor**, paste the contents of
[`supabase/migrations/20260721000000_auth_profiles.sql`](supabase/migrations/20260721000000_auth_profiles.sql),
and run it. It is idempotent (safe to re-run). It:

- creates the `profiles` table (one row per user: locked `username` +
  `data` JSON blob of synced progress) with row-level security;
- adds a `user_id` column to `leaderboard` and `daily_scores`;
- **revokes** direct insert/update on those two tables, so scores can only be
  written through the `submit_score()` function;
- creates `submit_score(p_wpm, p_accuracy, p_daily, p_day)` — a
  `SECURITY DEFINER` RPC that derives the user from their login, enforces the
  WPM/accuracy sanity limits server-side, and keeps the single best score per
  user (per day for the daily board).

> Existing anonymous leaderboard rows are preserved (they keep a `NULL`
> `user_id`). Reads stay public so the board still renders for logged-out
> visitors — they just can't submit.

## 2. Enable Google sign-in

**a. Create Google OAuth credentials**
1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → OAuth consent screen** → configure (External is fine; add
   your email as a test user while unpublished).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   → *Web application*.
4. Under **Authorized redirect URIs**, add your Supabase callback:
   ```
   https://ikcshjktqmoqakesxzlo.supabase.co/auth/v1/callback
   ```
5. Copy the **Client ID** and **Client secret**.

**b. Turn it on in Supabase**
1. **Supabase → Authentication → Providers → Google** → enable, paste the
   Client ID + secret, save.
2. **Authentication → URL Configuration**:
   - **Site URL**: your app origin (e.g. `http://localhost:5173` for dev, or your
     deployed URL).
   - **Redirect URLs**: add every origin the app runs on (dev + prod). The app
     asks Supabase to return to `window.location.origin`, so each origin must be
     listed here.

That's it. Reload the app → **Log in** (top-right) → Google → pick a display
name on first login. Progress then merges across devices and the leaderboard
**Save** button submits under your account.

---

## Behaviour notes

- **Guests** can still play everything; they see **"Log in to submit"** on the
  results screen instead of a save box.
- **First login** merges any progress already in that browser's `localStorage`
  into the new account (best-of merge — nothing is lost).
- **Sync is best-of / idempotent**: XP & tests take the max, achievements &
  history union, personal bests & heatmap keep the strongest, daily streak
  keeps the most recent. Re-syncing never double-counts.
- Until step 2 is done, the **Log in** button will error (provider not
  configured); until step 1 is done, submitting a score returns an error. The
  rest of the app is unaffected.
