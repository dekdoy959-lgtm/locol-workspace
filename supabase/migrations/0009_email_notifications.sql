-- Email notification infrastructure
-- - user_alert_prefs: per-user toggle for each alert type
-- - alert_log: audit trail · prevents duplicate alerts (unique per day+type+entity+recipient)

do $$ begin
  create type alert_type_kind as enum (
    'stale_opportunity',
    'cold_contact',
    'reminder_note',
    'birthday',
    'commitment_overdue'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.user_alert_prefs (
  user_id uuid primary key references public.team_members(id) on delete cascade,
  enabled boolean not null default true,
  stale_opportunities boolean not null default true,
  cold_contacts boolean not null default true,
  reminder_notes boolean not null default true,
  birthdays boolean not null default true,
  commitment_overdue boolean not null default true,
  digest_hour smallint not null default 9 check (digest_hour between 0 and 23),
  updated_at timestamptz not null default now()
);

alter table public.user_alert_prefs enable row level security;

drop policy if exists "auth read user_alert_prefs" on public.user_alert_prefs;
create policy "auth read user_alert_prefs"
  on public.user_alert_prefs for select
  using (auth.role() = 'authenticated');

drop policy if exists "auth write user_alert_prefs" on public.user_alert_prefs;
create policy "auth write user_alert_prefs"
  on public.user_alert_prefs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─── Alert log ────────────────────────────────────────────────────
create table if not exists public.alert_log (
  id uuid primary key default uuid_generate_v4(),
  alert_type alert_type_kind not null,
  entity_table text not null,
  entity_id uuid not null,
  recipient_email text not null,
  recipient_user_id uuid references public.team_members(id) on delete set null,
  subject text,
  sent_at timestamptz not null default now(),
  sent_date date not null default current_date,
  -- Prevent re-sending the same alert to the same person on the same day
  unique (alert_type, entity_id, recipient_email, sent_date)
);

create index if not exists idx_alert_log_recipient on public.alert_log(recipient_user_id);
create index if not exists idx_alert_log_sent_date on public.alert_log(sent_date desc);

alter table public.alert_log enable row level security;

drop policy if exists "auth read alert_log" on public.alert_log;
create policy "auth read alert_log"
  on public.alert_log for select
  using (auth.role() = 'authenticated');

-- Service role only for inserting (script-driven)
drop policy if exists "service write alert_log" on public.alert_log;
create policy "service write alert_log"
  on public.alert_log for insert
  with check (true);

-- ─── Auto-create default prefs for every existing team_member ─────
insert into public.user_alert_prefs (user_id)
  select id from public.team_members
  on conflict (user_id) do nothing;

-- ─── Auto-create prefs for new signups ────────────────────────────
create or replace function public.create_default_alert_prefs()
returns trigger as $$
begin
  insert into public.user_alert_prefs (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_team_member_alert_prefs on public.team_members;
create trigger on_team_member_alert_prefs
  after insert on public.team_members
  for each row execute function public.create_default_alert_prefs();
