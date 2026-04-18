-- ============================================================
-- 009_reading_visibility.sql — Per-reading public/private flag
--
-- Replaces the "slug exists = public" model from 007 with an
-- explicit is_public boolean. Slug remains the URL identifier,
-- but access is now gated by is_public.
--
-- Default: true — existing rows and new readings are public
-- unless the owner opts out via settings.
-- ============================================================

-- ── natal_readings ──
alter table public.natal_readings
  add column is_public boolean not null default true;

-- Replace the old "slug exists" policy with an is_public gate.
-- Owners always see their own rows via the existing owner policy.
drop policy if exists "Anyone can view reading by share_slug" on public.natal_readings;

create policy "Anyone can view public reading by share_slug"
  on public.natal_readings for select
  using (share_slug is not null and is_public = true);

-- Owners can flip is_public (and any other self-owned fields) on their row.
create policy "Users can update own natal reading"
  on public.natal_readings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── synastry_readings ──
-- Mirror the same model so shared synastry links can be toggled.
-- share_slug didn't exist on this table yet; add both together.
alter table public.synastry_readings
  add column share_slug text unique,
  add column is_public boolean not null default true;

create unique index idx_synastry_readings_share_slug
  on public.synastry_readings(share_slug)
  where share_slug is not null;

create policy "Anyone can view public synastry by share_slug"
  on public.synastry_readings for select
  using (share_slug is not null and is_public = true);
