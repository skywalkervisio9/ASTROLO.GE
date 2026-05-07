-- ============================================================
-- Allow synastry participants to update visibility fields on their
-- shared reading row (mirror natal_readings owner-update policy).
-- ============================================================

create policy "Synastry participants can update readings they share"
  on public.synastry_readings for update
  using (auth.uid() = user1_id or auth.uid() = user2_id)
  with check (auth.uid() = user1_id or auth.uid() = user2_id);
