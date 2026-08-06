-- ============================================================================
-- TypeNova - Bug Reports & Admin Inbox
-- Adds an `is_admin` flag to profiles, creates the `bug_reports` table,
-- and configures a storage bucket for screenshots.
-- ============================================================================

-- 1. Add is_admin to profiles (default false)
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 2. Create the bug_reports table
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  username text,
  message text not null,
  screenshot_url text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- 3. RLS for bug_reports
alter table public.bug_reports enable row level security;

drop policy if exists "bug_reports: anyone can insert" on public.bug_reports;
drop policy if exists "bug_reports: admins can read all" on public.bug_reports;
drop policy if exists "bug_reports: admins can update" on public.bug_reports;
drop policy if exists "bug_reports: admins can delete" on public.bug_reports;

-- Anyone authenticated can insert
create policy "bug_reports: anyone can insert" on public.bug_reports for insert to authenticated with check (true);

-- Only admins can read/update/delete
create policy "bug_reports: admins can read all" on public.bug_reports for select using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true)
);
create policy "bug_reports: admins can update" on public.bug_reports for update using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true)
);
create policy "bug_reports: admins can delete" on public.bug_reports for delete using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true)
);

grant select, insert, update, delete on public.bug_reports to authenticated;

-- 4. Set up Storage Bucket for screenshots
insert into storage.buckets (id, name, public) 
values ('bug-reports', 'bug-reports', true)
on conflict (id) do update set public = true;

-- Drop old storage policies if they exist (to be safe)
drop policy if exists "bug-reports: public read" on storage.objects;
drop policy if exists "bug-reports: auth insert" on storage.objects;
drop policy if exists "bug-reports: admin delete" on storage.objects;

-- Allow anyone to view the screenshots (they will only have the URL if they are an admin anyway)
create policy "bug-reports: public read" on storage.objects for select 
using ( bucket_id = 'bug-reports' );

-- Allow authenticated users to upload screenshots
create policy "bug-reports: auth insert" on storage.objects for insert to authenticated
with check ( bucket_id = 'bug-reports' );

-- Allow admins to delete screenshots
create policy "bug-reports: admin delete" on storage.objects for delete to authenticated
using ( 
  bucket_id = 'bug-reports' and
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true)
);
