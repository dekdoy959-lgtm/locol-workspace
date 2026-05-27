-- Storage RLS for the "avatars" bucket
-- - Anyone (even unauthenticated) can READ — already covered by the "Public bucket" flag,
--   but we add an explicit policy too.
-- - Authenticated team members can INSERT / UPDATE / DELETE.

-- Read (public)
drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Insert (authenticated only)
drop policy if exists "Authenticated can upload avatars" on storage.objects;
create policy "Authenticated can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

-- Update (authenticated only — upsert needs this)
drop policy if exists "Authenticated can update avatars" on storage.objects;
create policy "Authenticated can update avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

-- Delete (authenticated only)
drop policy if exists "Authenticated can delete avatars" on storage.objects;
create policy "Authenticated can delete avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');
