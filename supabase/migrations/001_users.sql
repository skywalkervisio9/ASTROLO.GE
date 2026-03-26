-- ============================================================
-- 001_users.sql — Core user profiles
-- Schema: public | Depends on: auth.users (Supabase Auth)
-- ============================================================

create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_letter text generated always as (upper(left(coalesce(full_name, email), 1))) stored,

  -- Birth data (separate fields for flexible UI)
  birth_day       smallint,
  birth_month     smallint,
  birth_year      smallint,
  birth_hour      smallint,           -- null = "unknown" → noon chart
  birth_minute    smallint,
  birth_city      text,
  birth_lat       double precision,
  birth_lng       double precision,
  birth_timezone  text,
  gender          text check (gender in ('female', 'male', 'non-binary')),

  -- Account & tier
  account_type          text not null default 'free'
                        check (account_type in ('free', 'premium', 'invited')),
  natal_chart_unlocked  boolean not null default false,
  invite_slots_purchased integer not null default 0,
  free_section_pick     text check (free_section_pick in (
                          'characteristics', 'relationships', 'work',
                          'shadow', 'spiritual', 'potential'
                        )),

  -- Language
  language text not null default 'ka' check (language in ('ka', 'en')),

  -- Metadata
  prompt_version text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Auto-create user row on Supabase Auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();
