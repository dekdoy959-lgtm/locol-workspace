-- Mark whether we actually know a contact or organization
-- - known     : we have an existing relationship
-- - prospect  : we want to build a relationship (warm target)
-- - cold      : aware of them, not actively engaged
-- - archived  : used to engage, no longer relevant

do $$ begin
  create type relationship_status as enum ('known', 'prospect', 'cold', 'archived');
exception when duplicate_object then null; end $$;

alter table public.contacts
  add column if not exists relationship_status relationship_status not null default 'cold';

alter table public.organizations
  add column if not exists relationship_status relationship_status not null default 'cold';

create index if not exists idx_contacts_relationship_status on public.contacts(relationship_status);
create index if not exists idx_organizations_relationship_status on public.organizations(relationship_status);
