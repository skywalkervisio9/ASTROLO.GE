-- ============================================================
-- 006_rls_policies.sql — Row Level Security
-- All tables: users see only their own data
-- ============================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.chart_data enable row level security;
alter table public.natal_readings enable row level security;
alter table public.invite_codes enable row level security;
alter table public.synastry_connections enable row level security;
alter table public.synastry_readings enable row level security;
alter table public.payments enable row level security;

-- ── users ──
create policy "Users can view own profile"
  on public.users for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- ── chart_data ──
create policy "Users can view own chart data"
  on public.chart_data for select using (auth.uid() = user_id);

create policy "Service can insert chart data"
  on public.chart_data for insert with check (auth.uid() = user_id);

-- ── natal_readings ──
create policy "Users can view own natal reading"
  on public.natal_readings for select using (auth.uid() = user_id);

create policy "Service can insert natal reading"
  on public.natal_readings for insert with check (auth.uid() = user_id);

-- ── invite_codes ──
create policy "Users can view own invite codes"
  on public.invite_codes for select using (auth.uid() = inviter_id);

create policy "Users can create invite codes"
  on public.invite_codes for insert with check (auth.uid() = inviter_id);

create policy "Anyone can validate invite codes"
  on public.invite_codes for select using (status = 'active');

-- ── synastry_connections ──
create policy "Users can view connections where they are inviter or invitee"
  on public.synastry_connections for select
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

create policy "Users can create connections"
  on public.synastry_connections for insert
  with check (auth.uid() = inviter_id);

create policy "Users can update connections they are part of"
  on public.synastry_connections for update
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- ── synastry_readings ──
create policy "Users can view synastry where they are a participant"
  on public.synastry_readings for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- ── payments ──
create policy "Users can view own payments"
  on public.payments for select using (auth.uid() = user_id);

create policy "Users can create own payments"
  on public.payments for insert with check (auth.uid() = user_id);
