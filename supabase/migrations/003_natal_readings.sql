-- ============================================================
-- 003_natal_readings.sql — Claude-generated natal readings
-- Bilingual: both KA and EN generated upfront and stored
-- ============================================================

create table public.natal_readings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.users(id) on delete cascade,

  -- Call 1 output (English analytical document, internal)
  analysis_en     text,

  -- Call 2 outputs (client-facing JSON)
  reading_ka      jsonb,        -- Full 8-section reading in Georgian
  reading_en      jsonb,        -- Full 8-section reading in English

  -- Generation metadata
  prompt_version  text,
  model_call1     text,
  model_call2     text,
  tokens_call1    integer,
  tokens_call2_ka integer,
  tokens_call2_en integer,

  -- Validation
  validation_warnings jsonb,    -- Array of warning strings (don't block save)

  created_at      timestamptz not null default now()
);

create index idx_natal_readings_user on public.natal_readings(user_id);
