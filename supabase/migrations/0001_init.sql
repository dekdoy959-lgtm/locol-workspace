-- LOCOL Workspace · Initial schema
-- Run this in Supabase SQL Editor after creating the project.

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────
do $$ begin
  create type track_kind as enum ('apply', 'act', 'watch', 'contract', 'event');
exception when duplicate_object then null; end $$;

do $$ begin
  create type priority_kind as enum ('High', 'Medium', 'Low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tie_kind as enum ('Strong', 'Bridge', 'Weak');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commitment_direction as enum ('i_owe', 'they_owe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commitment_status as enum ('open', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type note_scope as enum ('contact', 'org', 'opportunity');
exception when duplicate_object then null; end $$;

do $$ begin
  create type team_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

-- ─── Team members (mirror auth.users) ────────────────────────
create table if not exists public.team_members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  initials text,
  avatar_url text,
  role team_role not null default 'member',
  created_at timestamptz not null default now()
);

-- ─── Organizations ───────────────────────────────────────────
create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  industry text,
  type text,
  hq text,
  size text,
  founded int,
  website text,
  our_tier smallint check (our_tier between 1 and 3),
  health text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Contacts (with multi-value JSON fields) ─────────────────
create table if not exists public.contacts (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text,
  nick_name text,
  suffix text,
  bio text,
  birthday date,

  -- Multi-value fields stored as JSONB arrays of typed objects
  phones jsonb not null default '[]',          -- [{label: 'Mobile', value: '+66...'}]
  emails jsonb not null default '[]',          -- [{label: 'Work', value: 'foo@bar.com'}]
  addresses jsonb not null default '[]',       -- [{label: 'HQ', value: '...'}]
  socials jsonb not null default '[]',         -- [{platform: 'Line', handle: '@abc', url: null}]
  orgs jsonb not null default '[]',            -- [{org_id, org_name, role, is_primary}]
  education jsonb not null default '[]',       -- [{school, degree, year}]

  tier smallint check (tier between 1 and 3),
  tie_type tie_kind,
  stage text,
  followup_status text,
  eng_current text,
  eng_target text,
  priority priority_kind,
  scenario text,
  scenario_step text,
  scenario_last_action_date date,
  freq_days int,
  last_contact_date date,
  health text,
  channel text,
  owner_id uuid references public.team_members(id) on delete set null,
  backup_id uuid references public.team_members(id) on delete set null,
  reviewer_id uuid references public.team_members(id) on delete set null,
  met_story text,
  value_exchange text,
  relation_types text[] not null default '{}',
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contacts_owner on public.contacts(owner_id);
create index if not exists idx_contacts_tier on public.contacts(tier);
create index if not exists idx_contacts_health on public.contacts(health);
create index if not exists idx_contacts_tags on public.contacts using gin(tags);

-- ─── Opportunities (5 tracks) ────────────────────────────────
create table if not exists public.opportunities (
  id uuid primary key default uuid_generate_v4(),
  track track_kind not null,
  title text not null,
  stage text not null,
  status text not null default 'New',
  priority priority_kind,
  source_url text,
  due_date date,
  owner_id uuid references public.team_members(id) on delete set null,
  reviewer_id uuid references public.team_members(id) on delete set null,
  ai_summary text,
  last_update_at timestamptz not null default now(),
  stale_since timestamptz,
  archived_at timestamptz,
  archived_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_opportunities_track on public.opportunities(track);
create index if not exists idx_opportunities_owner on public.opportunities(owner_id);
create index if not exists idx_opportunities_due on public.opportunities(due_date);

-- ─── Interactions ────────────────────────────────────────────
create table if not exists public.interactions (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  date date not null default current_date,
  channel text,
  direction text check (direction in ('inbound', 'outbound')),
  linked_scenario_step text,
  summary text not null,
  outcome text,
  logged_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_interactions_contact on public.interactions(contact_id, date desc);

-- ─── Commitments ─────────────────────────────────────────────
create table if not exists public.commitments (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  direction commitment_direction not null,
  description text not null,
  date_made date not null default current_date,
  due_date date,
  status commitment_status not null default 'open',
  linked_interaction_id uuid references public.interactions(id) on delete set null,
  evidence_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_commitments_contact on public.commitments(contact_id);
create index if not exists idx_commitments_status on public.commitments(status);

-- ─── Notes (polymorphic — contact / org / opportunity) ───────
create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  scope note_scope not null,
  target_id uuid not null,
  date date not null default current_date,
  text text not null,
  tags text[] not null default '{}',
  is_future boolean not null default false,
  created_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_target on public.notes(scope, target_id, date desc);

-- ─── Groups (with sub-groups via parent_id) ──────────────────
create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  parent_id uuid references public.groups(id) on delete cascade,
  cadence_days int,
  rule jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, contact_id)
);

create index if not exists idx_group_members_contact on public.group_members(contact_id);

-- ─── Relations (warm-intro graph) ────────────────────────────
create table if not exists public.relations (
  id uuid primary key default uuid_generate_v4(),
  from_contact_id uuid not null references public.contacts(id) on delete cascade,
  to_contact_id uuid references public.contacts(id) on delete cascade,
  to_org_id uuid references public.organizations(id) on delete cascade,
  to_opportunity_id uuid references public.opportunities(id) on delete cascade,
  type text not null,
  note text,
  created_at timestamptz not null default now(),
  check (
    (to_contact_id is not null)::int +
    (to_org_id is not null)::int +
    (to_opportunity_id is not null)::int = 1
  )
);

-- ─── Cross-layer: contacts ↔ opportunities ───────────────────
create table if not exists public.contact_opportunities (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  primary key (contact_id, opportunity_id)
);

-- ─── Per-track settings ──────────────────────────────────────
create table if not exists public.track_settings (
  track track_kind primary key,
  stale_threshold_days int,
  ping_enabled boolean not null default true,
  email_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Seed default per-track thresholds
insert into public.track_settings (track, stale_threshold_days, ping_enabled, email_notifications) values
  ('apply',    7,    true,  true),
  ('act',      7,    true,  true),
  ('watch',    null, false, false),
  ('contract', 14,   true,  true),
  ('event',    7,    true,  true)
on conflict (track) do nothing;

-- ─── updated_at trigger ──────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ declare t text;
begin
  foreach t in array array['organizations', 'contacts', 'opportunities', 'commitments']
  loop
    execute format('drop trigger if exists trg_touch_updated_at on public.%I', t);
    execute format('create trigger trg_touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ─── Auto-create team_member on signup ───────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.team_members (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row-Level Security (RLS) ────────────────────────────────
-- LOCOL is internal — every authenticated team_member can read/write everything.
-- Tighten later if multi-tenant becomes a concern.

alter table public.team_members        enable row level security;
alter table public.organizations       enable row level security;
alter table public.contacts            enable row level security;
alter table public.opportunities       enable row level security;
alter table public.interactions        enable row level security;
alter table public.commitments         enable row level security;
alter table public.notes               enable row level security;
alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.relations           enable row level security;
alter table public.contact_opportunities enable row level security;
alter table public.track_settings      enable row level security;

-- Policy template: any authenticated user can read/write
do $$ declare t text;
begin
  foreach t in array array[
    'team_members', 'organizations', 'contacts', 'opportunities',
    'interactions', 'commitments', 'notes', 'groups',
    'group_members', 'relations', 'contact_opportunities', 'track_settings'
  ]
  loop
    execute format('drop policy if exists "auth read %I" on public.%I', t, t);
    execute format('create policy "auth read %I" on public.%I for select using (auth.role() = ''authenticated'')', t, t);

    execute format('drop policy if exists "auth write %I" on public.%I', t, t);
    execute format('create policy "auth write %I" on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t, t);
  end loop;
end $$;
