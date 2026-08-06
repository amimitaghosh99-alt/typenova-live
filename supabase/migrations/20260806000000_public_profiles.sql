-- ============================================================================
-- TypeNova - Public Player Profiles
-- Creates the public_profiles table to store public-facing stats for 
-- player profiles (visible to everyone).
-- ============================================================================

create table if not exists public.public_profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  username text not null unique,
  level integer not null default 1,
  xp integer not null default 0,
  equipped_title text not null default 'novice',
  unlocked_badges text[] not null default array['novice'],
  max_wpm integer not null default 0,
  avg_acc integer not null default 0,
  tests_completed integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.public_profiles enable row level security;

drop policy if exists "public_profiles: read all" on public.public_profiles;
drop policy if exists "public_profiles: self insert" on public.public_profiles;
drop policy if exists "public_profiles: self update" on public.public_profiles;

-- Allow anyone to read the public profiles
create policy "public_profiles: read all" on public.public_profiles for select using (true);

-- Allow users to insert/update their own profile
create policy "public_profiles: self insert" on public.public_profiles for insert with check (auth.uid() = id);
create policy "public_profiles: self update" on public.public_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

grant select, insert, update on public.public_profiles to authenticated;
grant select on public.public_profiles to anon;
