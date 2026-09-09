-- ============================================================================
-- TypeNova — Publish Elo on the public dossier
--
-- `profiles.elo` is the ladder rating, and `profiles` is self-read only:
--
--   create policy "profiles: self read" on public.profiles
--     for select using (auth.uid() = id);
--
-- That policy is correct — `profiles` is private state — but it means no client
-- can ever read another operator's rating, so the dossier could show a rank and
-- a head-to-head record while leaving "their rating" permanently blank.
--
-- `public_profiles` is the surface that already exists for exactly this: it is
-- readable by anyone (`read all`, granted to `anon`) and holds only what an
-- operator publishes about themselves. So the rating is mirrored there rather
-- than loosening the policy on `profiles`.
--
-- Mirrored by trigger, not by the client. Every path that changes Elo goes
-- through `resolve_ranked_duel()` (SECURITY DEFINER), which writes `profiles`;
-- asking each client to also push a copy would mean a rating that silently
-- drifts whenever a session ends between the two writes.
--
-- Additive and idempotent: safe to re-run, and the dossier reads the column
-- best-effort so the page behaves identically on a project that has not applied
-- this yet.
-- ============================================================================

-- ── 1. The column ───────────────────────────────────────────────────────────
alter table public.public_profiles
  add column if not exists elo integer not null default 1000;

-- ── 2. Backfill ─────────────────────────────────────────────────────────────
-- Existing operators already have a rating on `profiles`; without this they
-- would all read as the 1000 default until their next resolved duel.
update public.public_profiles p
   set elo = pr.elo
  from public.profiles pr
 where pr.id = p.id
   and p.elo is distinct from pr.elo;

-- ── 3. Keep it in sync ──────────────────────────────────────────────────────
create or replace function public.sync_public_elo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No-op when the operator has not published a dossier yet; the backfill above
  -- covers them the next time this migration runs, and their first sync inserts
  -- the row with the default.
  update public.public_profiles
     set elo = new.elo,
         updated_at = now()
   where id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_public_elo() from anon, authenticated;

drop trigger if exists profiles_elo_to_public on public.profiles;
create trigger profiles_elo_to_public
  after insert or update of elo on public.profiles
  for each row
  execute function public.sync_public_elo();
