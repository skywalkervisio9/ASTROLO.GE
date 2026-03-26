-- ============================================================
-- 004_synastry.sql — Connections + invite codes + readings
-- Two separate tables for connections and codes (audit trail)
-- ============================================================

-- Invite codes: the shareable link tokens
create table public.invite_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,             -- 7 alphanumeric chars
  inviter_id      uuid not null references public.users(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('couple', 'friend')),
  slot_number     integer not null,
  status          text not null default 'active'
                  check (status in ('active', 'used', 'expired')),
  used_by         uuid references public.users(id),
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_invite_codes_code on public.invite_codes(code);
create index idx_invite_codes_inviter on public.invite_codes(inviter_id);

-- Synastry connections: links two users
create table public.synastry_connections (
  id                uuid primary key default gen_random_uuid(),
  inviter_id        uuid not null references public.users(id) on delete cascade,
  invitee_id        uuid references public.users(id) on delete set null,
  relationship_type text not null check (relationship_type in ('couple', 'friend')),
  invite_code       text not null references public.invite_codes(code),
  slot_number       integer not null,
  status            text not null default 'pending'
                    check (status in ('pending', 'accepted', 'reading_generated')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_synastry_conn_inviter on public.synastry_connections(inviter_id);
create index idx_synastry_conn_invitee on public.synastry_connections(invitee_id);

create trigger synastry_connections_updated_at
  before update on public.synastry_connections
  for each row execute function public.set_updated_at();

-- Synastry readings: Claude-generated
create table public.synastry_readings (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null unique references public.synastry_connections(id) on delete cascade,
  user1_id        uuid not null references public.users(id),
  user2_id        uuid not null references public.users(id),
  relationship_type text not null check (relationship_type in ('couple', 'friend')),

  -- Call 1 output (English analytical document)
  analysis_en     text,

  -- Call 2 outputs (client-facing JSON)
  reading_ka      jsonb,
  reading_en      jsonb,

  -- Scores
  compatibility_score integer,
  category_scores     jsonb,

  -- Metadata
  prompt_version  text,
  model_call1     text,
  model_call2     text,
  tokens_call1    integer,
  tokens_call2_ka integer,
  tokens_call2_en integer,
  validation_warnings jsonb,

  created_at      timestamptz not null default now()
);

create index idx_synastry_readings_users on public.synastry_readings(user1_id, user2_id);
create index idx_synastry_readings_conn on public.synastry_readings(connection_id);
