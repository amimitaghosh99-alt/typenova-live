-- Fix Anti-cheat logic where missing isBackspace caused the filter to fail

create or replace function public.submit_score(
  p_wpm      int,
  p_accuracy int,
  p_time_ms  int,
  p_log      jsonb,
  p_daily    boolean default false,
  p_day      text default null
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
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_wpm <= 0 or p_wpm > 250 or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'invalid score limit';
  end if;
  
  if p_log is not null and jsonb_typeof(p_log) = 'array' and jsonb_array_length(p_log) > 0 and p_time_ms > 0 then
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
    values (v_uid, p_day, v_name, p_wpm, p_accuracy)
    on conflict (user_id, day) do update
      set wpm      = greatest(public.daily_scores.wpm, excluded.wpm),
          accuracy = case when excluded.wpm >= public.daily_scores.wpm
                          then excluded.accuracy else public.daily_scores.accuracy end,
          username = excluded.username;
  end if;
end;
$$;


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

  select created_at into v_last_match from public.ranked_matches 
  where winner_id = v_winner_id order by created_at desc limit 1;
  
  if v_last_match is not null and now() - v_last_match < interval '20 seconds' then
    raise exception 'Anti-cheat trigger: Match submitted too quickly (spam protection)';
  end if;

  if p_log is not null and jsonb_typeof(p_log) = 'array' and jsonb_array_length(p_log) > 0 and p_time_ms > 0 then
    select 
      count(*) filter (where not coalesce((elem->>'isBackspace')::boolean, false)),
      count(*) filter (where not coalesce((elem->>'isBackspace')::boolean, false) and coalesce((elem->>'isError')::boolean, false))
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

  select elo into v_winner_elo from public.profiles where id = v_winner_id;
  select elo into v_loser_elo from public.profiles where id = p_opponent_id;
  
  if v_winner_elo is null then v_winner_elo := 1000; end if;
  if v_loser_elo is null then v_loser_elo := 1000; end if;

  v_expected_score := 1.0 / (1.0 + power(10, (v_loser_elo - v_winner_elo) / 400.0));
  v_elo_change := round(v_k_factor * (1.0 - v_expected_score));
  
  if v_elo_change < 1 then
    v_elo_change := 1;
  end if;
  
  if v_loser_elo - v_elo_change < 0 then
    v_elo_change := v_loser_elo;
  end if;

  update public.profiles set elo = elo + v_elo_change where id = v_winner_id;
  update public.profiles set elo = elo - v_elo_change where id = p_opponent_id;
  
  insert into public.ranked_matches (winner_id, loser_id, winner_wpm, loser_wpm, elo_transfer)
  values (v_winner_id, p_opponent_id, v_winner_wpm, p_opponent_wpm, v_elo_change);

  return v_elo_change;
end;
$$;
