-- ============================================================
-- 013_dob_corrections.sql
-- Track the single DOB correction allowed to full-reading (premium / invited+)
-- users. Free users correct unlimited times and never touch this counter.
--
-- MANUAL APPLY: migrations are not auto-applied to prod. Run this in the
-- Supabase Studio SQL editor, then: notify pgrst, 'reload schema';
-- ============================================================

alter table public.users
  add column if not exists dob_corrections_used smallint not null default 0;
