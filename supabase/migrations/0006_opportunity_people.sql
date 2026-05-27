-- Wave: Opportunity Organizers + Attendees
-- One junction table for both — role distinguishes organizer vs attendee.
-- Each row links opportunity to EITHER a contact OR an organization (XOR).

do $$ begin
  create type participant_status as enum (
    'VVIP', 'Invitee', 'Audience', 'Speaker', 'Sponsor', 'Other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type participant_role as enum ('organizer', 'attendee');
exception when duplicate_object then null; end $$;

create table if not exists public.opportunity_people (
  id uuid primary key default uuid_generate_v4(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  role participant_role not null,
  status participant_status,
  note text,
  created_at timestamptz not null default now(),
  -- Exactly one of contact_id / org_id must be set
  check ((contact_id is not null)::int + (org_id is not null)::int = 1)
);

create index if not exists idx_op_people_opp on public.opportunity_people(opportunity_id);
create index if not exists idx_op_people_contact on public.opportunity_people(contact_id);
create index if not exists idx_op_people_org on public.opportunity_people(org_id);

-- RLS — same pattern as other tables
alter table public.opportunity_people enable row level security;

drop policy if exists "auth read opportunity_people" on public.opportunity_people;
create policy "auth read opportunity_people"
  on public.opportunity_people for select
  using (auth.role() = 'authenticated');

drop policy if exists "auth write opportunity_people" on public.opportunity_people;
create policy "auth write opportunity_people"
  on public.opportunity_people for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
