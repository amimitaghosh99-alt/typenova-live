-- ============================================================================
-- TypeNova — Security Hardening Phase 2
--
-- Fixes remaining vulnerabilities:
--   1. Storage bucket path enforcement (user-scoped uploads)
--   2. Anti-cheat: inter-keystroke timing analysis in submit_score
--   3. Anti-cheat: per-user submission cooldown
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- FIX: Storage bucket — user-scoped upload paths + auth-only reads
-- ════════════════════════════════════════════════════════════════════════════

-- Drop old overly-permissive policies
drop policy if exists "bug-reports: public read" on storage.objects;
drop policy if exists "bug-reports: auth insert" on storage.objects;

-- Only authenticated users can view screenshots (not the general internet)
create policy "bug-reports: auth read" on storage.objects
  for select to authenticated
  using (bucket_id = 'bug-reports');

-- Uploads must go under the user's own folder: {user_id}/filename
create policy "bug-reports: auth scoped insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bug-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ════════════════════════════════════════════════════════════════════════════
-- FIX: Anti-cheat — submission cooldown tracking
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists last_submit_at timestamptz;


-- ════════════════════════════════════════════════════════════════════════════
-- FIX: Anti-cheat — hardened submit_score with IKD analysis + cooldown
--
-- New checks:
--   1. Per-user cooldown: 1 submission per 10 seconds
--   2. Inter-keystroke timing: reject if >20% of intervals are <10ms
--   3. Inter-keystroke timing: reject if median interval is <15ms
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
  v_last_submit timestamptz;
  v_fast_count  int;
  v_total_ikd   int;
  v_median_ikd  numeric;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_wpm <= 0 or p_wpm > 250 or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'invalid score limit';
  end if;

  if p_mode_key is not null and p_mode_key !~ '^[A-Z]{1,16}:[tw][0-9]{1,5}$' then
    raise exception 'invalid mode key: %', p_mode_key;
  end if;

  -- ── Anti-cheat: submission cooldown (10 seconds) ──────────────────────────
  select last_submit_at into v_last_submit from public.profiles where id = v_uid;
  if v_last_submit is not null and now() - v_last_submit < interval '10 seconds' then
    raise exception 'Anti-cheat: submitting too quickly (cooldown)';
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

    -- ── Anti-cheat: inter-keystroke timing analysis ─────────────────────────
    -- Reject synthetic keystroke logs with inhumanly fast or uniform timing.
    if v_strokes > 20 then
      select
        count(*) filter (where ikd is not null and ikd < 10),
        count(*) filter (where ikd is not null),
        percentile_cont(0.5) within group (order by ikd)
      into v_fast_count, v_total_ikd, v_median_ikd
      from (
        select
          (elem->>'time')::numeric
            - lag((elem->>'time')::numeric) over (order by ordinality) as ikd
        from jsonb_array_elements(p_log) with ordinality as x(elem, ordinality)
      ) sub
      where ikd is not null and ikd >= 0;

      -- More than 20% of intervals under 10ms → bot
      if v_total_ikd > 0 and v_fast_count::numeric / v_total_ikd > 0.20 then
        raise exception 'Anti-cheat: inhuman keystroke timing detected';
      end if;

      -- Median interval under 15ms → biologically impossible sustained speed
      if v_median_ikd is not null and v_median_ikd < 15 then
        raise exception 'Anti-cheat: keystroke rate exceeds human limits';
      end if;
    end if;
  else
    raise exception 'invalid payload: log and time required';
  end if;

  -- ── Update cooldown timestamp ─────────────────────────────────────────────
  update public.profiles set last_submit_at = now() where id = v_uid;

  select username into v_name from public.profiles where id = v_uid;
  if v_name is null then raise exception 'no profile'; end if;

  insert into public.leaderboard (user_id, username, wpm, accuracy)
  values (v_uid, v_name, p_wpm, p_accuracy)
  on conflict (user_id) do update
    set wpm      = greatest(public.leaderboard.wpm, excluded.wpm),
        accuracy = case when excluded.wpm >= public.leaderboard.wpm
                        then excluded.accuracy else public.leaderboard.accuracy end,
        username = excluded.username;

  -- SECURITY: always use current_date, never trust client-supplied date
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
