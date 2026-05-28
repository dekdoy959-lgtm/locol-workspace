-- Allow authenticated users to delete and update discord_inbox records from the frontend.
-- Without these, the supabase anon/auth client gets RLS-blocked.

drop policy if exists "Authenticated delete" on public.discord_inbox;
create policy "Authenticated delete"
  on public.discord_inbox
  for delete
  to authenticated
  using (true);

drop policy if exists "Authenticated update" on public.discord_inbox;
create policy "Authenticated update"
  on public.discord_inbox
  for update
  to authenticated
  using (true)
  with check (true);
