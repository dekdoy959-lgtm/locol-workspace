-- Allow authenticated users to delete discord_inbox records from the frontend.
-- Without this, the supabase anon/auth client gets RLS-blocked on DELETE.

drop policy if exists "Authenticated delete" on public.discord_inbox;

create policy "Authenticated delete"
  on public.discord_inbox
  for delete
  to authenticated
  using (true);
