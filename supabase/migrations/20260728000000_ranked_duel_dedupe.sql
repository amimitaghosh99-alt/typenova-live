-- ============================================================================
-- TypeNova — Ranked duel: idempotent resolution
--
-- Both clients in a 1v1 could resolve the same duel: whoever finished first
-- treated "opponent hasn't finished yet" as a win, and if that finish
-- broadcast was dropped the other player did the same. That wrote two
-- mirrored rows and moved Elo twice. Every race now carries a host-minted
-- id (`p_match_key`); the audit row is written first and a unique index
-- makes the second attempt fail before any rating is touched.
--
-- Also restores the "profile not found" guard that 20260726000003 dropped:
-- without it, an opponent id with no profile row defaulted to 1000 Elo, the
-- balance update silently matched zero rows, and the audit insert then blew
-- up on the auth.users foreign key.
-- ============================================================================

alter table public.ranked_matches add column if not exists match_key text;

create unique index if not exists ranked_matches_match_key_uniq
  on public.ranked_matches (match_key)
  where match_key is not null;

-- Drop the 4-arg version so the new signature can't be shadowed by an overload.
drop function if exists public.resolve_ranked_duel(uuid, jsonb, integer, integer);

create or replace function public.resolve_ranked_duel(
  p_opponent_id uuid,
  p_log jsonb,
  p_time_ms integer,
  p_opponent_wpm integer,
  p_match_key text default null
) returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_winner_id uuid := auth.uid();
  v_winner_wpm integer;
  v_chars integer;
  v_errors integer;
  v_accuracy numeric;
  v_first_time numeric;
  v_last_time numeric;
  v_log_duration numeric;

  v_winner_elo integer;
  v_loser_elo integer;

  v_winner_matches integer;
  v_loser_matches integer;

  v_winner_k integer := 32;
  v_loser_k integer := 32;

  v_expected_score numeric;
  v_wpm_diff integer;
  v_margin_multiplier numeric;

  v_winner_elo_change integer;
  v_loser_elo_change integer;

  v_last_match timestamptz;
begin
  if v_winner_id is null then raise exception 'not authenticated'; end if;
  if p_opponent_id = v_winner_id then raise exception 'cannot duel yourself'; end if;

  -- Idempotency: this duel may already have been resolved by the other client.
  if p_match_key is not null
     and exists (select 1 from public.ranked_matches where match_key = p_match_key) then
    raise exception 'duel already resolved';
  end if;

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
    v_accuracy := ((v_chars - v_errors)::numeric / greatest(v_chars, 1)::numeric) * 100.0;
  else
    raise exception 'invalid payload: log and time required';
  end if;

  select elo into v_winner_elo from public.profiles where id = v_winner_id;
  select elo into v_loser_elo from public.profiles where id = p_opponent_id;

  -- A missing profile means the opponent id isn't a real account. Fail loudly
  -- rather than assuming 1000 and writing a half-applied transfer.
  if v_winner_elo is null then raise exception 'winner profile not found'; end if;
  if v_loser_elo is null then raise exception 'opponent profile not found'; end if;

  -- Dynamic K-Factor calculation
  select count(*) into v_winner_matches from public.ranked_matches where winner_id = v_winner_id or loser_id = v_winner_id;
  select count(*) into v_loser_matches from public.ranked_matches where winner_id = p_opponent_id or loser_id = p_opponent_id;

  if v_winner_matches < 10 then v_winner_k := 64;
  elsif v_winner_elo > 2000 then v_winner_k := 16;
  end if;

  if v_loser_matches < 10 then v_loser_k := 64;
  elsif v_loser_elo > 2000 then v_loser_k := 16;
  end if;

  -- Base Elo Calculation
  v_expected_score := 1.0 / (1.0 + power(10, (v_loser_elo - v_winner_elo) / 400.0));
  v_winner_elo_change := round(v_winner_k * (1.0 - v_expected_score));
  v_loser_elo_change := round(v_loser_k * (1.0 - v_expected_score));

  -- Margin of Victory Multiplier
  v_wpm_diff := abs(v_winner_wpm - p_opponent_wpm);
  v_margin_multiplier := 1.0 + (ln(v_wpm_diff + 1) / 8.0);
  if v_margin_multiplier > 1.5 then v_margin_multiplier := 1.5; end if;

  v_winner_elo_change := round(v_winner_elo_change * v_margin_multiplier);
  v_loser_elo_change := round(v_loser_elo_change * v_margin_multiplier);

  -- High Accuracy Bonus
  if v_accuracy >= 98.0 then
    v_winner_elo_change := v_winner_elo_change + 3;
  end if;

  -- Minimum gains/losses
  if v_winner_elo_change < 1 then v_winner_elo_change := 1; end if;
  if v_loser_elo_change < 1 then v_loser_elo_change := 1; end if;
  if v_loser_elo - v_loser_elo_change < 0 then v_loser_elo_change := v_loser_elo; end if;

  -- Audit row first: the unique index on match_key is what makes a concurrent
  -- duplicate abort the whole transaction before any rating moves.
  insert into public.ranked_matches (winner_id, loser_id, winner_wpm, loser_wpm, elo_transfer, match_key)
  values (v_winner_id, p_opponent_id, v_winner_wpm, p_opponent_wpm, v_winner_elo_change, p_match_key);

  update public.profiles set elo = elo + v_winner_elo_change where id = v_winner_id;
  update public.profiles set elo = greatest(0, elo - v_loser_elo_change) where id = p_opponent_id;

  return v_winner_elo_change;
end;
$$;
