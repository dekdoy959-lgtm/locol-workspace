-- LOCOL Workspace · Promote external timeline items to team-visible interactions
--
-- Background: Timeline pulls Gmail messages + Calendar events from each logged-in
-- user's personal Google account (via Google OAuth provider_token). These items
-- are visible ONLY to that user — teammates don't see them.
--
-- This migration adds columns so that the user can choose to "share" a
-- Gmail/Calendar item with the team by inserting it into the shared
-- `interactions` table.
--
-- Dedup: same contact + source + external_id can only be inserted once
-- (so re-clicking "share" on the same email won't duplicate the row).

-- ─── Add columns ────────────────────────────────────────────────────
alter table public.interactions
  add column if not exists source       text   not null default 'manual',
  add column if not exists external_id  text,
  add column if not exists external_url text,
  add column if not exists subject      text,
  add column if not exists metadata     jsonb  not null default '{}'::jsonb;

-- ─── Enforce allowed source values ──────────────────────────────────
alter table public.interactions
  drop constraint if exists interactions_source_check;
alter table public.interactions
  add  constraint interactions_source_check
       check (source in ('manual', 'gmail', 'calendar'));

-- ─── Dedup index ────────────────────────────────────────────────────
-- One entry per (contact, source, external_id) for external sources.
-- Manual entries can repeat freely (external_id is null).
create unique index if not exists interactions_external_unique_idx
  on public.interactions (contact_id, source, external_id)
  where source != 'manual' and external_id is not null;

-- ─── Helper index for "by-source" queries ────────────────────────────
create index if not exists interactions_source_idx
  on public.interactions (source);

-- ─── Comments for self-documentation ────────────────────────────────
comment on column public.interactions.source       is 'manual | gmail | calendar — where this interaction came from';
comment on column public.interactions.external_id  is 'Gmail message ID or Google Calendar event ID — null for manual';
comment on column public.interactions.external_url is 'Deep link back to Gmail/Calendar — for "Open in Gmail" buttons';
comment on column public.interactions.subject      is 'Email subject — only for source=gmail';
comment on column public.interactions.metadata     is 'Extra info: attendees, snippet, meet link, location, etc.';
