-- ============================================================================
-- TypeNova - Avatar & Banner Profiles Update
-- Adds avatar_id and banner_id to public_profiles.
-- ============================================================================

-- Add new columns for profile customization
alter table public.public_profiles add column if not exists avatar_id text not null default 'default';
alter table public.public_profiles add column if not exists banner_id text not null default 'basic_dark';
