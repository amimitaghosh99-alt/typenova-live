-- ============================================================================
-- TypeNova — auth, profiles & secure score submission
-- Run this once in the Supabase SQL Editor (see AUTH_SETUP.md).
-- Idempotent: safe to re-run.
-- ============================================================================

-- ── profiles ────────────────────────────────────────────────────────────────
-- One row per authenticated user. `username` is the locked leaderboard
-- identity; `data` is the synced progress blob (XP, achievements, heatmap,
-- history, personal bests, daily streak) mirrored from localStorage.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: self read"   on public.profiles;
drop policy if exists "profiles: self insert" on public.profiles;
drop policy if exists "profiles: self update" on public.profiles;

create policy "profiles: self read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: self insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

grant select, insert, update on public.profiles to authenticated;

-- ── leaderboard / daily_scores: tie scores to accounts ──────────────────────
-- Existing anonymous rows keep a NULL user_id (multiple NULLs are allowed by
-- the unique indexes). New rows are written exclusively by submit_score().
alter table public.leaderboard   add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.daily_scores  add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists leaderboard_user_id_key   on public.leaderboard  (user_id);
create unique index if not exists daily_scores_user_day_key on public.daily_scores (user_id, day);

-- Lock direct writes: only the SECURITY DEFINER RPC below may insert/update.
-- (Reads stay open so the leaderboard renders for everyone, logged in or not.)
revoke insert, update, delete on public.leaderboard  from anon, authenticated;
revoke insert, update, delete on public.daily_scores from anon, authenticated;

-- ── submit_score() ──────────────────────────────────────────────────────────
-- The only write path for scores. Runs as the table owner (SECURITY DEFINER)
-- so it can write past the revoked grants, while still deriving identity from
-- the caller's JWT (auth.uid()). Enforces server-side sanity limits and keeps
-- the single best score per user (per day for the daily board).
create or replace function public.submit_score(
  p_wpm      int,
  p_accuracy int,
  p_daily    boolean default false,
  p_day      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_wpm <= 0 or p_wpm > 250 or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'invalid score';
  end if;

  select username into v_name from public.profiles where id = v_uid;
  if v_name is null then
    raise exception 'no profile';
  end if;

  insert into public.leaderboard (user_id, username, wpm, accuracy)
  values (v_uid, v_name, p_wpm, p_accuracy)
  on conflict (user_id) do update
    set wpm      = greatest(public.leaderboard.wpm, excluded.wpm),
        accuracy = case when excluded.wpm >= public.leaderboard.wpm
                        then excluded.accuracy else public.leaderboard.accuracy end,
        username = excluded.username;

  if p_daily then
    insert into public.daily_scores (user_id, day, username, wpm, accuracy)
    values (v_uid, coalesce(p_day, to_char((now() at time zone 'utc')::date, 'YYYY-MM-DD')), v_name, p_wpm, p_accuracy)
    on conflict (user_id, day) do update
      set wpm      = greatest(public.daily_scores.wpm, excluded.wpm),
          accuracy = case when excluded.wpm >= public.daily_scores.wpm
                          then excluded.accuracy else public.daily_scores.accuracy end,
          username = excluded.username;
  end if;
end;
$$;

revoke all on function public.submit_score(int, int, boolean, text) from public, anon;
grant execute on function public.submit_score(int, int, boolean, text) to authenticated;
