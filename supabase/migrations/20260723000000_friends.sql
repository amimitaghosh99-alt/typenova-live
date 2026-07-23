-- ============================================================================
-- TypeNova — Friends System
-- Run this once in the Supabase SQL Editor to create the friends table.
-- ============================================================================

create table if not exists public.user_friends (
  user_id uuid references auth.users (id) on delete cascade,
  friend_username text not null references public.profiles (username) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_username)
);

alter table public.user_friends enable row level security;

drop policy if exists "friends: self read" on public.user_friends;
drop policy if exists "friends: self insert" on public.user_friends;
drop policy if exists "friends: self delete" on public.user_friends;

create policy "friends: self read" on public.user_friends for select using (auth.uid() = user_id);
create policy "friends: self insert" on public.user_friends for insert with check (auth.uid() = user_id);
create policy "friends: self delete" on public.user_friends for delete using (auth.uid() = user_id);

grant select, insert, delete on public.user_friends to authenticated;
