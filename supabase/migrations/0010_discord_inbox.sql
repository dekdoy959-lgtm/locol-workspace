-- LOCOL Workspace · Discord inbox table + storage bucket
-- Stores every raw message sent to #bot-inbox-opms in Discord,
-- before and after it is processed into an opportunity or contact.

-- ─── Table ───────────────────────────────────────────────────────────────────

create table if not exists public.discord_inbox (
  id                      uuid        primary key default gen_random_uuid(),
  discord_message_id      text        unique not null,
  channel_id              text        not null,
  author_id               text        not null,
  author_name             text        not null,
  original_text           text,
  -- [{filename, storage_path, content_type}]
  attachment_paths        jsonb       not null default '[]'::jsonb,
  -- [{url, title}]
  extracted_links         jsonb       not null default '[]'::jsonb,
  -- [{url}]
  qr_codes_found          jsonb       not null default '[]'::jsonb,
  -- 'apply' | 'watch' | 'event' | 'contact'
  detected_category       text,
  ai_summary              text,
  -- full structured data extracted by Gemma4 (title, due_date, org_name, …)
  ai_extracted_data       jsonb       not null default '{}'::jsonb,
  -- pending | processing | done | failed | review_needed
  processing_status       text        not null default 'pending',
  error_message           text,
  created_opportunity_id  uuid        references public.opportunities (id) on delete set null,
  created_contact_id      uuid        references public.contacts (id) on delete set null,
  created_at              timestamptz not null default now(),
  processed_at            timestamptz
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists discord_inbox_status_idx
  on public.discord_inbox (processing_status);

create index if not exists discord_inbox_created_at_idx
  on public.discord_inbox (created_at desc);

create index if not exists discord_inbox_category_idx
  on public.discord_inbox (detected_category);

-- ─── Row-Level Security ──────────────────────────────────────────────────────

alter table public.discord_inbox enable row level security;

-- Service role (used by Amos bot) gets full access
create policy "Service role full access"
  on public.discord_inbox
  for all
  to service_role
  using (true)
  with check (true);

-- Authenticated users can read all inbox records
create policy "Authenticated read"
  on public.discord_inbox
  for select
  to authenticated
  using (true);

-- ─── Storage bucket ──────────────────────────────────────────────────────────
-- Stores original Discord images attached to inbox messages.
-- Public read so the OPMS frontend can display thumbnails.

insert into storage.buckets (id, name, public)
values ('discord-attachments', 'discord-attachments', true)
on conflict (id) do nothing;
