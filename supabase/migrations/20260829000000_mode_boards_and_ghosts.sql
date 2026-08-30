-- ============================================================================
-- TypeNova V3 — Ghost Net & Per-Mode Leaderboards
--
-- Two changes, one insert path:
--
--   1. `mode_scores` partitions the leaderboard by game mode, so a 15-second
--      sprint no longer competes with a 100-word marathon. One row per
--      (user, mode) holding that user's best run in that mode.
--
--   2. Every row carries the *replayable ghost* for that run. `submit_score`
--      already received the full keystroke log to verify WPM against and then
--      threw it away; it now reduces that verified log to an input-length-over-
--      time curve and stores it, which is exactly what the client-side ghost
--      pacer consumes. Any leaderboard row becomes a raceable opponent.
--
-- Ghost data is derived server-side from the log the server already validated,
-- so a client cannot publish a ghost that disagrees with its accepted score.
-- The stored curve deliberately contains no typed characters — only timing and
-- input length — so submitting a score never publishes text content.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ── mode_scores ─────────────────────────────────────────────────────────────
create table if not exists public.mode_scores (
  user_id     uuid    not null references auth.users (id) on delete cascade,
  -- Canonical mode identifier, e.g. 'NOVICE:t30' or 'ADEPT:w50'.
  -- Format is enforced by submit_score() so clients cannot invent partitions.
  mode_key    text    not null,
  username    text    not null,
  wpm         integer not null,
  accuracy    integer not null,
  consistency integer,
  time_ms     integer not null,
  keystrokes  integer not null,
  -- [{ "t": <ms since start>, "chars": <input length> }, ...]
  ghost       jsonb   not null default '[]'::jsonb,
  achieved_at timestamptz not null default now(),
  primary key (user_id, mode_key)
);

-- The board query is `where mode_key = $1 order by wpm desc limit N`.
create index if not exists mode_scores_board_idx
  on public.mode_scores (mode_key, wpm desc);

alter table public.mode_scores enable row level security;

-- Reads are open so boards and ghosts render for everyone, signed in or not.
drop policy if exists "mode_scores: read all" on public.mode_scores;
create policy "mode_scores: read all" on public.mode_scores for select using (true);

grant select on public.mode_scores to anon, authenticated;
-- Writes go exclusively through submit_score() (SECURITY DEFINER).
revoke insert, update, delete on public.mode_scores from anon, authenticated;

-- ── build_pace_samples() ────────────────────────────────────────────────────
-- Reduce a keystroke log to the ghost curve the client's pacer replays.
-- Mirrors `buildPaceSamples()` in src/App.tsx: backspaces that shrank the input
-- step the counter down, everything else steps it up, and the series is
-- rebased so the first keystroke sits at t = 0.
create or replace function public.build_pace_samples(p_log jsonb)
returns jsonb
language sql
immutable
as $$
  with strokes as (
    select
      ord,
      (elem->>'time')::numeric as ts,
      case when coalesce((elem->>'isBackspace')::boolean, false) then -1 else 1 end as delta
    from jsonb_array_elements(p_log) with ordinality as e(elem, ord)
  ),
  running as (
    select
      ord,
      ts - min(ts) over () as rel_t,
      greatest(0, sum(delta) over (order by ord rows between unbounded preceding and current row)) as chars
    from strokes
  )
  select coalesce(
    jsonb_build_array(jsonb_build_object('t', 0, 'chars', 0)) ||
      jsonb_agg(jsonb_build_object('t', round(rel_t), 'chars', chars) order by ord),
    '[]'::jsonb
  )
  from running;
$$;

-- ── submit_score() ──────────────────────────────────────────────────────────
-- Dropped and recreated rather than replaced: adding defaulted arguments would
-- leave the 6-argument signature in place as a separate overload, and a call
-- omitting the new arguments would then be ambiguous ("function is not
-- unique"). Clients that have not shipped the new arguments keep working —
-- p_mode_key defaults to null, which simply skips the mode board write.
drop function if exists public.submit_score(int, int, int, jsonb, boolean, text);
drop function if exists public.submit_score(int, int, int, jsonb, boolean, text, text, int);

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

  -- A mode key partitions a public board, so it is validated as strictly as a
  -- score: exact shape only, never free text.
  if p_mode_key is not null and p_mode_key !~ '^[A-Z]{1,16}:[tw][0-9]{1,5}$' then
    raise exception 'invalid mode key: %', p_mode_key;
  end if;

  if p_log is not null and jsonb_typeof(p_log) = 'array' and jsonb_array_length(p_log) > 0 and p_time_ms > 0 then
    v_strokes := jsonb_array_length(p_log);
    -- Bounds the ghost blob and the validation scan. A 120s run at 200 WPM is
    -- well under 3k strokes, so this only rejects synthetic payloads.
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

  if p_daily and p_day is not null then
    insert into public.daily_scores (user_id, day, username, wpm, accuracy)
    values (v_uid, p_day::date, v_name, p_wpm, p_accuracy)
    on conflict (user_id, day) do update
      set wpm      = greatest(public.daily_scores.wpm, excluded.wpm),
          accuracy = case when excluded.wpm >= public.daily_scores.wpm
                          then excluded.accuracy else public.daily_scores.accuracy end,
          username = excluded.username;
  end if;

  -- ── Ghost Net: per-mode board + replayable ghost ──────────────────────────
  if p_mode_key is not null then
    v_cons := case when p_consistency between 0 and 100 then p_consistency else null end;
    v_ghost := public.build_pace_samples(p_log);

    insert into public.mode_scores (
      user_id, mode_key, username, wpm, accuracy, consistency, time_ms, keystrokes, ghost, achieved_at
    )
    values (
      v_uid, p_mode_key, v_name, p_wpm, p_accuracy, v_cons, v_time_ms, v_strokes, v_ghost, now()
    )
    -- The ghost must always describe the run whose WPM is on the board, so it
    -- is replaced only when the score is actually beaten.
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
