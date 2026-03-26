-- ============================================================
-- 005_payments.sql — Transaction history
-- Supports TBC Pay and BOG iPay (Georgian banks)
-- ============================================================

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,

  -- Product
  payment_type    text not null check (payment_type in (
                    'premium_upgrade',    -- Free → Premium (15 GEL)
                    'natal_unlock',       -- Invited → unlock full natal (5 GEL)
                    'invite_slot'         -- Additional synastry slot (5 GEL)
                  )),
  amount          numeric(10,2) not null,
  currency        text not null default 'GEL',

  -- Provider
  provider        text not null check (provider in ('tbc', 'bog')),
  provider_tx_id  text,                   -- Bank's transaction reference
  idempotency_key text unique,            -- Prevent double-charge

  -- Status
  status          text not null default 'pending'
                  check (status in ('pending', 'completed', 'failed', 'refunded')),

  -- Flexible metadata
  metadata        jsonb default '{}',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_payments_user on public.payments(user_id);
create index idx_payments_status on public.payments(status);
create index idx_payments_idempotency on public.payments(idempotency_key);

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();
