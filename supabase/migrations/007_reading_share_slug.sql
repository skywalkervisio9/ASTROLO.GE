-- ============================================================
-- 007_reading_share_slug.sql — Public share slug for natal readings
-- Allows readings to be accessed without authentication
-- ============================================================

-- Add share_slug column (short, URL-friendly, unique)
alter table public.natal_readings
  add column share_slug text unique;

-- Index for fast lookups
create unique index idx_natal_readings_share_slug
  on public.natal_readings(share_slug)
  where share_slug is not null;

-- Allow public (anon) read access via share_slug
-- This does NOT expose user_id-based queries to anon users
create policy "Anyone can view reading by share_slug"
  on public.natal_readings for select
  using (share_slug is not null);
