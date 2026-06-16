-- 0019 · Trip scope (Domestic / International) + Trip Intelligence Briefing
-- Adds two columns to opportunities:
--   trip_scope  — splits ลงพื้นที่ (track='trip') into ในประเทศ vs ต่างประเทศ
--   briefing    — full Trip Intelligence Briefing (Parts A/B/C) stored as JSONB,
--                 shape driven by src/types/briefing.ts (flexible, no migration per field)
-- Safe to re-run.

alter table public.opportunities
  add column if not exists trip_scope text
    check (trip_scope in ('domestic', 'international'));

alter table public.opportunities
  add column if not exists briefing jsonb not null default '{}'::jsonb;

-- Optional: quick filter for the inbox split (cheap, partial)
create index if not exists opportunities_trip_scope_idx
  on public.opportunities (trip_scope)
  where track = 'trip';
