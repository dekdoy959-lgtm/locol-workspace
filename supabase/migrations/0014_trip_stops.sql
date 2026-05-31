-- LOCOL Workspace · Trip itinerary
--
-- Trips (track='trip' opportunities) can span multiple days, with each day
-- visiting multiple farms/places/provinces. The single set of detail fields
-- (farm_name, province, location_name) on the opportunity can't represent
-- that, so we add a child table for stops.
--
-- Each stop = one place visited on one day. Stops belong to a trip
-- (opportunity), are grouped by day_date, and ordered within the day
-- by sort_order.
--
-- Cascading delete: removing the trip removes all its stops automatically.

create table if not exists public.trip_stops (
  id              uuid        primary key default gen_random_uuid(),
  opportunity_id  uuid        not null references public.opportunities(id) on delete cascade,
  day_date        date        not null,
  sort_order      int         not null default 0,
  -- Time strings are free-form (e.g. "09:00", "afternoon", "evening")
  start_time      text,
  end_time        text,
  stop_type       text        not null default 'farm'
                              check (stop_type in ('farm', 'place', 'workshop', 'meeting', 'lodging', 'transport', 'other')),
  -- Place identification
  name            text,       -- ชื่อฟาร์ม / ชื่อสถานที่
  province        text,       -- เชียงราย · เชียงใหม่ · ...
  location_name   text,       -- อำเภอ / ตำบล / address
  -- People at this stop
  owner_name      text,       -- ชื่อเจ้าของฟาร์ม / contact ที่นัด
  owner_phone     text,
  -- Activity
  purpose         text,       -- ทำอะไรที่นี่
  agenda          text,       -- agenda สั้น ๆ
  emphasis        text,       -- สิ่งที่อยากเน้น (สำหรับ marketing content)
  notes           text,       -- หมายเหตุอื่น ๆ
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Indexes ────────────────────────────────────────────────────────
create index if not exists idx_trip_stops_opp
  on public.trip_stops(opportunity_id, day_date, sort_order);

create index if not exists idx_trip_stops_day
  on public.trip_stops(day_date);

create index if not exists idx_trip_stops_province
  on public.trip_stops(province);

-- ─── updated_at trigger ─────────────────────────────────────────────
create or replace function public.trip_stops_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trip_stops_updated_at on public.trip_stops;
create trigger trip_stops_updated_at
  before update on public.trip_stops
  for each row execute function public.trip_stops_set_updated_at();

-- ─── Row-Level Security ─────────────────────────────────────────────
alter table public.trip_stops enable row level security;

-- NOTE: 0014/0015 use the 'to authenticated using (true)' role-targeting style.
-- It is equivalent to the older 'using (auth.role() = ''authenticated'')' style
-- on other tables — both grant access only to signed-in users.
drop policy if exists "Authenticated read" on public.trip_stops;
create policy "Authenticated read"
  on public.trip_stops for select
  to authenticated using (true);

drop policy if exists "Authenticated write" on public.trip_stops;
create policy "Authenticated write"
  on public.trip_stops for all
  to authenticated
  using (true) with check (true);

-- ─── Realtime ───────────────────────────────────────────────────────
-- Add trip_stops to the realtime publication so live updates work
alter publication supabase_realtime add table public.trip_stops;

comment on table public.trip_stops is 'Itinerary stops for trip (track=trip) opportunities. Grouped by day_date.';
