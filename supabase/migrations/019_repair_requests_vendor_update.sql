-- Allow authenticated vendors to update repair request status
-- (e.g. pending → quoted after generating a quote from a lead).

drop policy if exists "Authenticated users can update repair requests"
  on public.repair_requests;

create policy "Authenticated users can update repair requests"
  on public.repair_requests
  for update
  to authenticated
  using (true)
  with check (true);

grant update on public.repair_requests to authenticated;
