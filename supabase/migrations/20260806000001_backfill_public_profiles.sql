-- ============================================================================
-- TypeNova - Backfill Public Profiles
-- Copies all existing users from the private `profiles` table into the new
-- `public_profiles` table so that older users are immediately discoverable.
-- ============================================================================

insert into public.public_profiles (id, username)
select id, username from public.profiles
on conflict (id) do nothing;
