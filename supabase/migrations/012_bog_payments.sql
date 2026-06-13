alter table public.payments
  add column if not exists provider_order_id text;

create unique index if not exists idx_payments_provider_order_id
  on public.payments(provider, provider_order_id)
  where provider_order_id is not null;

create or replace function public.complete_payment_once(
  p_payment_id uuid,
  p_provider_tx_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'payment_not_found';
  end if;

  if v_payment.status = 'completed' then
    return false;
  end if;

  update public.payments
  set
    status = 'completed',
    provider_tx_id = coalesce(p_provider_tx_id, provider_tx_id),
    metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb)
  where id = p_payment_id;

  if v_payment.payment_type = 'premium_upgrade' then
    update public.users
    set account_type = 'premium', natal_chart_unlocked = true
    where id = v_payment.user_id;
  elsif v_payment.payment_type = 'natal_unlock' then
    update public.users
    set natal_chart_unlocked = true
    where id = v_payment.user_id;
  elsif v_payment.payment_type = 'invite_slot' then
    update public.users
    set invite_slots_purchased = invite_slots_purchased + 1
    where id = v_payment.user_id;
  end if;

  return true;
end;
$$;

create or replace function public.fail_payment_once(
  p_payment_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'payment_not_found';
  end if;

  if v_payment.status = 'completed' then
    return false;
  end if;

  update public.payments
  set
    status = 'failed',
    metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb)
  where id = p_payment_id;

  return true;
end;
$$;