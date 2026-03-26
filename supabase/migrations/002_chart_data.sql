-- ============================================================
-- 002_chart_data.sql — Raw Astrologer API responses
-- One record per user, created once, never updated
-- ============================================================

create table public.chart_data (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references public.users(id) on delete cascade,

  -- Raw API response (full JSON from Astrologer API)
  api_response  jsonb not null,

  -- Extracted context text (fed to Claude Call 1)
  chart_context text not null,

  -- Extracted structured data (for frontend chart rendering)
  planets       jsonb,
  houses        jsonb,
  aspects       jsonb,
  points        jsonb,

  created_at    timestamptz not null default now()
);

create index idx_chart_data_user on public.chart_data(user_id);
