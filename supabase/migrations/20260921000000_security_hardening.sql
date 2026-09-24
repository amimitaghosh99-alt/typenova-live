-- ============================================================================
-- TypeNova — Critical Security Hardening
--
-- Fixes 4 critical vulnerabilities:
--   #1: Admin privilege escalation via profiles self-update
--   #2: Elo siphoning via resolve_ranked_duel
--   #3: (ai-proxy fix is in the Edge Function, not SQL)
--   #4: Fake patron payments via patron_contributions INSERT
--
-- Also fixes:
--   - Daily score date spoofing (force CURRENT_DATE)
--   - public_profiles stat inflation (guard trigger)
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- FIX #1: Block direct client modification of is_admin and elo on profiles
-- ════════════════════════════════════════════════════════════════════════════

-- The guard uses a session-local GUC flag: trusted SECURITY DEFINER functions
-- (like resolve_ranked_duel, record_patron_success) set
-- app.bypass_column_guard = 'on' before touching protected columns, and
-- reset it afterward. Direct PostgREST requests never have this flag.

create or replace function guard_profiles_sensitive_columns()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.bypass_column_guard', true), '') = 'on' then
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin then
    raise exception 'admin status cannot be modified by client';
  end if;

  if new.elo is distinct from old.elo then
    raise exception 'elo cannot be modified by client';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profiles_update on public.profiles;
create trigger guard_profiles_update
  before update on public.profiles
  for each row execute function guard_profiles_sensitive_columns();


-- ════════════════════════════════════════════════════════════════════════════
-- FIX #1b: Block direct client inflation of public_profiles stats
-- ════════════════════════════════════════════════════════════════════════════

create or replace function guard_public_profiles_stats()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.bypass_column_guard', true), '') = 'on' then
    return new;
  end if;

  -- Only allow cosmetic updates from client (avatar, banner, title)
  -- Block stat columns
  if new.level is distinct from old.level then
    raise exception 'level cannot be modified by client';
  end if;
  if new.xp is distinct from old.xp then
    raise exception 'xp cannot be modified by client';
  end if;
  if new.max_wpm is distinct from old.max_wpm then
    raise exception 'max_wpm cannot be modified by client';
  end if;
  if new.avg_acc is distinct from old.avg_acc then
    raise exception 'avg_acc cannot be modified by client';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_public_profiles_update on public.public_profiles;
create trigger guard_public_profiles_update
  before update on public.public_profiles
  for each row execute function guard_public_profiles_stats();


-- ════════════════════════════════════════════════════════════════════════════
-- FIX #2: Harden resolve_ranked_duel against elo siphoning
--
-- Changes:
--   1. p_match_key is now REQUIRED (no default null)
--   2. Added opponent-pair cooldown (5 min between same pair)
--   3. Increased general cooldown from 20s to 60s
--   4. Sets bypass_column_guard flag for elo updates
-- ════════════════════════════════════════════════════════════════════════════

drop function if exists public.resolve_ranked_duel(uuid, jsonb, integer, integer, text);
drop function if exists public.resolve_ranked_duel(uuid, jsonb, integer, integer);

create or replace function public.resolve_ranked_duel(
  p_opponent_id   uuid,
  p_log           jsonb,
  p_time_ms       integer,
  p_opponent_wpm  integer,
  p_match_key     text       -- REQUIRED: no longer optional
) returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_winner_id   uuid := auth.uid();
  v_winner_wpm  integer;
  v_chars       integer;
  v_errors      integer;
  v_accuracy    numeric;
  v_first_time  numeric;
  v_last_time   numeric;
  v_log_duration numeric;

  v_winner_elo  integer;
  v_loser_elo   integer;

  v_winner_matches integer;
  v_loser_matches  integer;

  v_winner_k    integer := 32;
  v_loser_k     integer := 32;

  v_expected_score    numeric;
  v_wpm_diff          integer;
  v_margin_multiplier numeric;

  v_winner_elo_change integer;
  v_loser_elo_change  integer;

  v_last_match      timestamptz;
  v_last_pair_match timestamptz;
begin
  if v_winner_id is null then raise exception 'not authenticated'; end if;
  if p_opponent_id = v_winner_id then raise exception 'cannot duel yourself'; end if;

  -- SECURITY: match_key is now mandatory and must be non-trivial
  if p_match_key is null or length(trim(p_match_key)) < 8 then
    raise exception 'match_key is required';
  end if;

  -- Idempotency: this duel may already have been resolved by the other client.
  if exists (select 1 from public.ranked_matches where match_key = p_match_key) then
    raise exception 'duel already resolved';
  end if;

  -- General cooldown: 60 seconds between any ranked match (was 20s)
  select created_at into v_last_match from public.ranked_matches
  where winner_id = v_winner_id order by created_at desc limit 1;

  if v_last_match is not null and now() - v_last_match < interval '60 seconds' then
    raise exception 'Anti-cheat: match submitted too quickly (spam protection)';
  end if;

  -- Pair cooldown: 5 minutes between matches against the same opponent
  select created_at into v_last_pair_match from public.ranked_matches
  where ((winner_id = v_winner_id and loser_id = p_opponent_id)
      or (winner_id = p_opponent_id and loser_id = v_winner_id))
  order by created_at desc limit 1;

  if v_last_pair_match is not null and now() - v_last_pair_match < interval '5 minutes' then
    raise exception 'Anti-cheat: too many matches against the same opponent';
  end if;

  -- ── Keystroke log validation ──────────────────────────────────────────────
  if p_log is not null and jsonb_typeof(p_log) = 'array' and jsonb_array_length(p_log) > 0 and p_time_ms > 0 then
    select
      count(*) filter (where not coalesce((elem->>'isBackspace')::boolean, false)),
      count(*) filter (where not coalesce((elem->>'isBackspace')::boolean, false) and coalesce((elem->>'isError')::boolean, false))
    into v_chars, v_errors
    from jsonb_array_elements(p_log) as elem;

    v_first_time := (p_log->0->>'time')::numeric;
    v_last_time  := (p_log->(jsonb_array_length(p_log) - 1)->>'time')::numeric;
    v_log_duration := v_last_time - v_first_time;

    if p_time_ms < v_log_duration - 5000 then
       raise exception 'Anti-cheat: spoofed match time';
    end if;

    v_winner_wpm := round(((v_chars - v_errors) / 5.0) / (greatest(p_time_ms, v_log_duration) / 60000.0));
    v_accuracy   := ((v_chars - v_errors)::numeric / greatest(v_chars, 1)::numeric) * 100.0;
  else
    raise exception 'invalid payload: log and time required';
  end if;

  -- ── Elo lookup ────────────────────────────────────────────────────────────
  select elo into v_winner_elo from public.profiles where id = v_winner_id;
  select elo into v_loser_elo  from public.profiles where id = p_opponent_id;

  if v_winner_elo is null then raise exception 'winner profile not found'; end if;
  if v_loser_elo  is null then raise exception 'opponent profile not found'; end if;

  -- ── Dynamic K-Factor ──────────────────────────────────────────────────────
  select count(*) into v_winner_matches from public.ranked_matches
  where winner_id = v_winner_id or loser_id = v_winner_id;
  select count(*) into v_loser_matches from public.ranked_matches
  where winner_id = p_opponent_id or loser_id = p_opponent_id;

  if v_winner_matches < 10 then v_winner_k := 64;
  elsif v_winner_elo > 2000 then v_winner_k := 16;
  end if;

  if v_loser_matches < 10 then v_loser_k := 64;
  elsif v_loser_elo > 2000 then v_loser_k := 16;
  end if;

  -- ── Elo calculation ───────────────────────────────────────────────────────
  v_expected_score    := 1.0 / (1.0 + power(10, (v_loser_elo - v_winner_elo) / 400.0));
  v_winner_elo_change := round(v_winner_k * (1.0 - v_expected_score));
  v_loser_elo_change  := round(v_loser_k * (1.0 - v_expected_score));

  -- Margin of Victory Multiplier
  v_wpm_diff := abs(v_winner_wpm - p_opponent_wpm);
  v_margin_multiplier := 1.0 + (ln(v_wpm_diff + 1) / 8.0);
  if v_margin_multiplier > 1.5 then v_margin_multiplier := 1.5; end if;

  v_winner_elo_change := round(v_winner_elo_change * v_margin_multiplier);
  v_loser_elo_change  := round(v_loser_elo_change * v_margin_multiplier);

  -- High Accuracy Bonus
  if v_accuracy >= 98.0 then
    v_winner_elo_change := v_winner_elo_change + 3;
  end if;

  -- Minimum gains/losses
  if v_winner_elo_change < 1 then v_winner_elo_change := 1; end if;
  if v_loser_elo_change  < 1 then v_loser_elo_change  := 1; end if;
  if v_loser_elo - v_loser_elo_change < 0 then v_loser_elo_change := v_loser_elo; end if;

  -- ── Audit row (unique index on match_key prevents concurrent dupes) ──────
  insert into public.ranked_matches (winner_id, loser_id, winner_wpm, loser_wpm, elo_transfer, match_key)
  values (v_winner_id, p_opponent_id, v_winner_wpm, p_opponent_wpm, v_winner_elo_change, p_match_key);

  -- ── Apply Elo transfer (bypass the column guard trigger) ─────────────────
  perform set_config('app.bypass_column_guard', 'on', true);

  update public.profiles set elo = elo + v_winner_elo_change where id = v_winner_id;
  update public.profiles set elo = greatest(0, elo - v_loser_elo_change) where id = p_opponent_id;

  perform set_config('app.bypass_column_guard', '', true);

  return v_winner_elo_change;
end;
$$;

revoke all on function public.resolve_ranked_duel(uuid, jsonb, integer, integer, text) from public, anon;
grant execute on function public.resolve_ranked_duel(uuid, jsonb, integer, integer, text) to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- FIX #4: Lock down patron_contributions INSERT policy
--
-- Old policy: WITH CHECK (true)  ← anyone can insert captured payments!
-- New policy: must be 'created' status with perk_granted = false
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "patron_contributions: users insert" on public.patron_contributions;
create policy "patron_contributions: users insert" on public.patron_contributions
  for insert
  with check (
    status = 'created'
    and perk_granted = false
  );


-- ════════════════════════════════════════════════════════════════════════════
-- FIX (MEDIUM): Force CURRENT_DATE for daily scores in submit_score
--
-- Replaces the entire function to change one line:
--   p_day::date  →  current_date
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.submit_score(
  p_wpm         int,
  p_accuracy    int,
  p_time_ms     int,
  p_log         jsonb,
  p_daily       boolean default false,
  p_day         text    default null,
  p_mode_key    text    default null,
  p_consistency int     default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_name     text;
  v_chars    int := 0;
  v_errors   int := 0;
  v_calc_wpm int := 0;
  v_strokes  int := 0;
  v_cons     int;
  v_ghost    jsonb;
  v_time_ms  int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_wpm <= 0 or p_wpm > 250 or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'invalid score limit';
  end if;

  if p_mode_key is not null and p_mode_key !~ '^[A-Z]{1,16}:[tw][0-9]{1,5}$' then
    raise exception 'invalid mode key: %', p_mode_key;
  end if;

  if p_log is not null and jsonb_typeof(p_log) = 'array' and jsonb_array_length(p_log) > 0 and p_time_ms > 0 then
    v_strokes := jsonb_array_length(p_log);
    if v_strokes > 20000 then
      raise exception 'invalid payload: keystroke log too large (%)', v_strokes;
    end if;

    select
      count(*) filter (where not coalesce((elem->>'isBackspace')::boolean, false)),
      count(*) filter (where not coalesce((elem->>'isBackspace')::boolean, false) and coalesce((elem->>'isError')::boolean, false))
    into v_chars, v_errors
    from jsonb_array_elements(p_log) as elem;

    declare
      v_first_time numeric := (p_log->0->>'time')::numeric;
      v_last_time numeric := (p_log->(jsonb_array_length(p_log) - 1)->>'time')::numeric;
      v_log_duration numeric := v_last_time - v_first_time;
    begin
      if p_time_ms < v_log_duration - 5000 then
         raise exception 'Anti-cheat trigger: Spoofed time. Claimed %, actual %', p_time_ms, v_log_duration;
      end if;

      v_calc_wpm := round(((v_chars - v_errors) / 5.0) / (greatest(p_time_ms, v_log_duration) / 60000.0));

      if abs(v_calc_wpm - p_wpm) > 5 then
        raise exception 'Anti-cheat trigger: Calculated WPM (%) differs from submitted WPM (%)', v_calc_wpm, p_wpm;
      end if;

      v_time_ms := greatest(p_time_ms, ceil(v_log_duration))::int;
    end;
  else
    raise exception 'invalid payload: log and time required';
  end if;

  select username into v_name from public.profiles where id = v_uid;
  if v_name is null then raise exception 'no profile'; end if;

  insert into public.leaderboard (user_id, username, wpm, accuracy)
  values (v_uid, v_name, p_wpm, p_accuracy)
  on conflict (user_id) do update
    set wpm      = greatest(public.leaderboard.wpm, excluded.wpm),
        accuracy = case when excluded.wpm >= public.leaderboard.wpm
                        then excluded.accuracy else public.leaderboard.accuracy end,
        username = excluded.username;

  -- SECURITY FIX: always use current_date, never trust client-supplied date
  if p_daily then
    insert into public.daily_scores (user_id, day, username, wpm, accuracy)
    values (v_uid, current_date, v_name, p_wpm, p_accuracy)
    on conflict (user_id, day) do update
      set wpm      = greatest(public.daily_scores.wpm, excluded.wpm),
          accuracy = case when excluded.wpm >= public.daily_scores.wpm
                          then excluded.accuracy else public.daily_scores.accuracy end,
          username = excluded.username;
  end if;

  -- ── Ghost Net: per-mode board + replayable ghost ──────────────────────────
  if p_mode_key is not null then
    v_cons  := case when p_consistency between 0 and 100 then p_consistency else null end;
    v_ghost := public.build_pace_samples(p_log);

    insert into public.mode_scores (
      user_id, mode_key, username, wpm, accuracy, consistency, time_ms, keystrokes, ghost, achieved_at
    )
    values (
      v_uid, p_mode_key, v_name, p_wpm, p_accuracy, v_cons, v_time_ms, v_strokes, v_ghost, now()
    )
    on conflict (user_id, mode_key) do update
      set username    = excluded.username,
          wpm         = greatest(public.mode_scores.wpm, excluded.wpm),
          accuracy    = case when excluded.wpm > public.mode_scores.wpm
                             then excluded.accuracy else public.mode_scores.accuracy end,
          consistency = case when excluded.wpm > public.mode_scores.wpm
                             then excluded.consistency else public.mode_scores.consistency end,
          time_ms     = case when excluded.wpm > public.mode_scores.wpm
                             then excluded.time_ms else public.mode_scores.time_ms end,
          keystrokes  = case when excluded.wpm > public.mode_scores.wpm
                             then excluded.keystrokes else public.mode_scores.keystrokes end,
          ghost       = case when excluded.wpm > public.mode_scores.wpm
                             then excluded.ghost else public.mode_scores.ghost end,
          achieved_at = case when excluded.wpm > public.mode_scores.wpm
                             then excluded.achieved_at else public.mode_scores.achieved_at end;
  end if;
end;
$$;

revoke all on function public.submit_score(int, int, int, jsonb, boolean, text, text, int) from public, anon;
grant execute on function public.submit_score(int, int, int, jsonb, boolean, text, text, int) to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- FIX (MEDIUM): Add size constraint on profiles.data JSONB
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  drop constraint if exists profiles_data_size_limit;

alter table public.profiles
  add constraint profiles_data_size_limit
  check (octet_length(data::text) < 1048576);  -- 1 MB max
