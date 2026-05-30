-- LOCOL Workspace · Multi-role team assignments per opportunity
--
-- Background: opportunities.owner_id / reviewer_id can only express 2 roles
-- per opp. For trips and events we need to track multiple internal roles:
--   - document_lead   (คนทำเอกสาร)
--   - coordinator     (คนประสานงาน)
--   - traveler        (คนไปจริง · ฟาร์ม / event)
--   - support         (ทั่วไป)
--   - owner / reviewer also stored here as a single source of truth
--                     (kept in opportunities.owner_id/reviewer_id too for
--                      backward compat and simple queries)
--
-- One person can hold multiple roles on the same opportunity. Same role
-- can be held by multiple people (e.g. 3 travelers on a trip).
--
-- Optional `trip_stop_id` lets a person be assigned to a specific stop
-- within a trip's itinerary (e.g. "นาย ก ไปจุดที่ 1, นาย ข ไปจุดที่ 2").
-- Null = whole-opportunity assignment.

create table if not exists public.opportunity_team_assignments (
  id              uuid        primary key default gen_random_uuid(),
  opportunity_id  uuid        not null references public.opportunities(id) on delete cascade,
  team_member_id  uuid        not null references public.team_members(id) on delete cascade,
  role            text        not null
                              check (role in ('owner','reviewer','document_lead','coordinator','traveler','support')),
  -- Optional: assign to a specific stop within the trip itinerary
  trip_stop_id    uuid        references public.trip_stops(id) on delete cascade,
  note            text,
  created_at      timestamptz not null default now(),
  created_by      uuid        references public.team_members(id) on delete set null,
  -- Dedup: same person can't have the same role twice on same opp/stop
  unique (opportunity_id, team_member_id, role, trip_stop_id)
);

-- ─── Indexes ────────────────────────────────────────────────────────
create index if not exists idx_opp_team_opp
  on public.opportunity_team_assignments(opportunity_id);
create index if not exists idx_opp_team_member
  on public.opportunity_team_assignments(team_member_id);
create index if not exists idx_opp_team_role
  on public.opportunity_team_assignments(role);
create index if not exists idx_opp_team_stop
  on public.opportunity_team_assignments(trip_stop_id) where trip_stop_id is not null;

-- ─── RLS ────────────────────────────────────────────────────────────
alter table public.opportunity_team_assignments enable row level security;

drop policy if exists "Authenticated read" on public.opportunity_team_assignments;
create policy "Authenticated read"
  on public.opportunity_team_assignments for select
  to authenticated using (true);

drop policy if exists "Authenticated write" on public.opportunity_team_assignments;
create policy "Authenticated write"
  on public.opportunity_team_assignments for all
  to authenticated
  using (true) with check (true);

-- ─── Realtime ───────────────────────────────────────────────────────
alter publication supabase_realtime add table public.opportunity_team_assignments;

comment on table public.opportunity_team_assignments is
  'Many-to-many team role assignments per opportunity. Optional trip_stop_id for per-stop assignments.';
