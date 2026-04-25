-- ============================================================
-- 010_natal_readings_generation_status.sql
-- Track Call 2 progress so silent failures stop hanging the
-- loading screen. Column is null for rows generated before this
-- migration; status route treats null as legacy/complete-or-pending.
-- ============================================================

alter table public.natal_readings
  add column if not exists generation_status text,
  add column if not exists generation_error  text,
  add column if not exists generation_started_at timestamptz,
  add column if not exists generation_finished_at timestamptz;

-- Allowed values: 'generating' | 'failed' | 'complete' (null = legacy)
alter table public.natal_readings
  drop constraint if exists natal_readings_generation_status_check;
alter table public.natal_readings
  add constraint natal_readings_generation_status_check
  check (generation_status is null or generation_status in ('generating', 'failed', 'complete'));
