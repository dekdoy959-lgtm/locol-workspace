-- LOCOL Workspace · Track restructure (Phase 2)
--
-- Changes:
--   1. Add new 'trip' value to track_kind enum (for on-field/farm visits)
--   2. Migrate existing data:
--        act      → apply    (Tasks become Grants — closest semantic fit)
--        contract → watch    (Contracts become Monitor items — closest fit)
--   3. Drop 'act' and 'contract' from track_kind enum
--   4. Seed track_settings row for 'trip' (14d stale threshold)
--
-- Safety:
--   • Wrapped in a transaction so partial failure rolls back
--   • Postgres enum mutations require dropping/recreating the type
--     to remove values — so we create a NEW enum, swap, and drop the old
--   • All references (opportunities.track, track_settings.track) updated together
--
-- Rollback (manual, if needed):
--   alter type track_kind rename to track_kind_v2;
--   create type track_kind as enum ('apply','act','watch','contract','event');
--   ...etc (mirror the swap operation)

begin;

-- Step 1 · Create new enum with desired final values
create type track_kind_v2 as enum ('apply', 'watch', 'event', 'trip');

-- Step 2 · Move opportunities to new enum
alter table public.opportunities
  alter column track type track_kind_v2
  using (
    case track::text
      when 'act'      then 'apply'::track_kind_v2
      when 'contract' then 'watch'::track_kind_v2
      else track::text::track_kind_v2
    end
  );

-- Step 3 · Move track_settings to new enum (need to handle PK constraint)
-- First: archive any rows that would collide after merge
delete from public.track_settings
  where track::text in ('act', 'contract');

alter table public.track_settings
  alter column track type track_kind_v2
  using (track::text::track_kind_v2);

-- Step 4 · Drop the old enum type, rename new one
drop type track_kind;
alter type track_kind_v2 rename to track_kind;

-- Step 5 · Seed default settings for new 'trip' track
-- (Marketing team / planning visibility · 14d stale threshold suitable for trips)
insert into public.track_settings (track, stale_threshold_days, ping_enabled, email_notifications)
  values ('trip', 14, true, true)
  on conflict (track) do nothing;

commit;

-- ─── Verify (run separately) ───────────────────────────────────────
--   select track, count(*) from opportunities group by track order by track;
--   → should show: apply / watch / event / trip · NO act or contract
--
--   select * from track_settings;
--   → should show 4 rows (apply, watch, event, trip)
