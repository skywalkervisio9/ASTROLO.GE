-- ============================================================
-- 005_tier_model.sql — New tier model
-- Changes:
--   1. Add 'invited+' to account_type enum (via check constraint)
--   2. Drop free_section_pick column (section-pick system removed)
-- ============================================================

-- 1. Update account_type check constraint to include 'invited+'
alter table public.users
  drop constraint if exists users_account_type_check;

alter table public.users
  add constraint users_account_type_check
  check (account_type in ('free', 'premium', 'invited', 'invited+'));

-- 2. Drop the free section pick column
alter table public.users
  drop column if exists free_section_pick;
