-- Wave B-2 · Milestones per contact
-- 3 sides: them (what they want), us (what we want from them), shared (joint goal)

do $$ begin
  create type milestone_side as enum ('them', 'us', 'shared');
exception when duplicate_object then null; end $$;

create table if not exists public.milestones (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  side milestone_side not null,
  title text not null,
  date date,
  description text,
  achieved boolean not null default false,
  achieved_at date,
  sort_order int not null default 0,
  created_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_milestones_contact on public.milestones(contact_id, side);

-- updated_at trigger
drop trigger if exists trg_touch_updated_at on public.milestones;
create trigger trg_touch_updated_at
  before update on public.milestones
  for each row execute function public.touch_updated_at();

-- RLS — same pattern as other tables (any authenticated team member)
alter table public.milestones enable row level security;

drop policy if exists "auth read milestones" on public.milestones;
create policy "auth read milestones"
  on public.milestones for select
  using (auth.role() = 'authenticated');

drop policy if exists "auth write milestones" on public.milestones;
create policy "auth write milestones"
  on public.milestones for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
