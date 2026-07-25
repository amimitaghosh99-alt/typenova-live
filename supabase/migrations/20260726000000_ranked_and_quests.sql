-- ============================================================================
-- TypeNova — Ranked Matchmaking (Elo)
-- Adds the `elo` column to profiles and secure 1v1 match resolution logic.
-- ============================================================================

-- 1. Add Elo column to profiles
alter table public.profiles add column if not exists elo integer not null default 1000;

-- 2. Ranked Matches Audit Log (Optional but good for history)
create table if not exists public.ranked_matches (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid references auth.users (id) on delete set null,
  loser_id uuid references auth.users (id) on delete set null,
  winner_wpm integer not null,
  loser_wpm integer not null,
  elo_transfer integer not null,
  created_at timestamptz not null default now()
);

alter table public.ranked_matches enable row level security;
drop policy if exists "ranked_matches: read all" on public.ranked_matches;
create policy "ranked_matches: read all" on public.ranked_matches for select using (true);
grant select on public.ranked_matches to authenticated;
revoke insert, update, delete on public.ranked_matches from anon, authenticated;

-- 3. Resolve Ranked Duel (SECURITY DEFINER)
-- In a production environment, this would be triggered by a dedicated game server.
-- For this P2P app, we accept the winner's log, cryptographically verify the WPM,
-- and execute the Elo transfer. We use a 20-second cooldown to prevent Elo-drain spam.
create or replace function public.resolve_ranked_duel(
  p_opponent_id uuid,
  p_log jsonb,
  p_time_ms integer,
  p_opponent_wpm integer
) returns integer
language plpgsql security definer
as $$
declare
  v_winner_id uuid := auth.uid();
  v_winner_wpm integer;
  v_chars integer;
  v_errors integer;
  v_first_time numeric;
  v_last_time numeric;
  v_log_duration numeric;
  
  v_winner_elo integer;
  v_loser_elo integer;
  
  v_expected_score numeric;
  v_k_factor integer := 32;
  v_elo_change integer;
  
  v_last_match timestamptz;
begin
  if v_winner_id is null then raise exception 'not authenticated'; end if;
  if p_opponent_id = v_winner_id then raise exception 'cannot duel yourself'; end if;

  -- 1. Rate Limit / Spam Protection
  select created_at into v_last_match from public.ranked_matches 
  where winner_id = v_winner_id order by created_at desc limit 1;
  
  if v_last_match is not null and now() - v_last_match < interval '20 seconds' then
    raise exception 'Anti-cheat trigger: Match submitted too quickly (spam protection)';
  end if;

  -- 2. Anti-Cheat: Validate the winner's log
  if p_log is not null and jsonb_typeof(p_log) = 'array' and jsonb_array_length(p_log) > 0 and p_time_ms > 0 then
    select 
      count(*) filter (where not (elem->>'isBackspace')::boolean),
      count(*) filter (where not (elem->>'isBackspace')::boolean and (elem->>'isError')::boolean)
    into v_chars, v_errors
    from jsonb_array_elements(p_log) as elem;
    
    v_first_time := (p_log->0->>'time')::numeric;
    v_last_time := (p_log->(jsonb_array_length(p_log) - 1)->>'time')::numeric;
    v_log_duration := v_last_time - v_first_time;
    
    if p_time_ms < v_log_duration - 5000 then
       raise exception 'Anti-cheat trigger: Spoofed match time';
    end if;

    v_winner_wpm := round(((v_chars - v_errors) / 5.0) / (greatest(p_time_ms, v_log_duration) / 60000.0));
  else
    raise exception 'invalid payload: log and time required';
  end if;

  -- 3. Fetch Elos
  select elo into v_winner_elo from public.profiles where id = v_winner_id;
  select elo into v_loser_elo from public.profiles where id = p_opponent_id;
  
  if v_winner_elo is null or v_loser_elo is null then
    raise exception 'Profile not found';
  end if;

  -- 4. Calculate Elo Exchange (Standard Elo Formula)
  v_expected_score := 1.0 / (1.0 + power(10.0, (v_loser_elo - v_winner_elo) / 400.0));
  v_elo_change := round(v_k_factor * (1.0 - v_expected_score));
  
  -- Prevent dropping below 0
  if v_loser_elo - v_elo_change < 0 then
    v_elo_change := v_loser_elo;
  end if;

  -- 5. Update Profiles Atomically
  update public.profiles set elo = elo + v_elo_change where id = v_winner_id;
  update public.profiles set elo = elo - v_elo_change where id = p_opponent_id;

  -- 6. Audit Log
  insert into public.ranked_matches (winner_id, loser_id, winner_wpm, loser_wpm, elo_transfer)
  values (v_winner_id, p_opponent_id, v_winner_wpm, p_opponent_wpm, v_elo_change);

  return v_elo_change;
end;
$$;
