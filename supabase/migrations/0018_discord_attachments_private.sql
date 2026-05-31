-- LOCOL Workspace · Make the discord-attachments bucket PRIVATE
--
-- Background: 0010 created the bucket with public=true, so anyone holding (or
-- guessing) a storage path could read attachments without auth — these can be
-- screenshots of private partner conversations, contracts, ID cards, etc.
--
-- Fix:
--  1. Flip the bucket to private. Public URLs (.../object/public/...) stop working.
--  2. Add an authenticated SELECT policy on storage.objects for this bucket so
--     createSignedUrl() — which the client calls under the user's JWT — succeeds.
--
-- The app now resolves a short-lived signed URL per attachment
-- (src/components/discord/DiscordAttachment.tsx) instead of a public URL.
-- The Discord bot keeps uploading via the service role, which bypasses RLS.

-- Step 1: flip to private
update storage.buckets
   set public = false
 where id = 'discord-attachments';

-- Step 2: allow authenticated users to read (and thus sign URLs for) objects
-- in this bucket only.
drop policy if exists "auth read discord-attachments" on storage.objects;
create policy "auth read discord-attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'discord-attachments');
