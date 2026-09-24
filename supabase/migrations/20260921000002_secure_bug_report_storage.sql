-- ============================================================================
-- TypeNova — Secure Bug Report Screenshot Storage (Phase 3)
--
-- Hardens the bug-reports storage bucket:
--   1. Changes bucket access from public to private (no unauthenticated URLs).
--   2. Replaces blanket authenticated read with strict owner-or-admin read policy.
-- ============================================================================

-- 1. Enforce private bucket configuration
update storage.buckets
set public = false
where id = 'bug-reports';

-- 2. Drop the overly-permissive read policy
drop policy if exists "bug-reports: auth read" on storage.objects;
drop policy if exists "bug-reports: public read" on storage.objects;
drop policy if exists "bug-reports: admin or owner read" on storage.objects;

-- 3. Restrict read access strictly to the owner (who uploaded it) or an administrator
create policy "bug-reports: admin or owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bug-reports'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.is_admin = true
      )
    )
  );
