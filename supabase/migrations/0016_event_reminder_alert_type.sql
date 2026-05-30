-- LOCOL Workspace · Add 'event_reminder' to alert_type_kind + variant column
--
-- Background: scripts/notifications/run.mjs writes alert_type='event_reminder'
-- but the enum doesn't include it. Plus the runner concatenated
-- `${opp.id}-t${daysUntil}` into entity_id (uuid column) which would fail.
-- Both bugs cause the cron to crash or spam.
--
-- Fix:
--  1. Add 'event_reminder' to the enum
--  2. Add `variant` text column for distinguishing T-7 vs T-1 reminders
--     (so the unique constraint can dedup correctly per (opp, variant, day))
--  3. Update the unique constraint to include variant

-- Step 1: add enum value
alter type alert_type_kind add value if not exists 'event_reminder';

-- Step 2: add variant column (e.g. 't7', 't1', null for non-reminders)
alter table public.alert_log
  add column if not exists variant text;

-- Step 3: replace the unique constraint to include variant
-- (Postgres has no IF EXISTS for DROP CONSTRAINT — wrap in DO block)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'alert_log_alert_type_entity_id_recipient_email_sent_date_key'
  ) then
    alter table public.alert_log
      drop constraint alert_log_alert_type_entity_id_recipient_email_sent_date_key;
  end if;
end $$;

create unique index if not exists alert_log_dedup_idx
  on public.alert_log (alert_type, entity_id, recipient_email, sent_date, coalesce(variant, ''));

-- Step 4: optional — add select policy so users can audit their own alerts
drop policy if exists "auth read own alert_log" on public.alert_log;
create policy "auth read own alert_log"
  on public.alert_log for select
  to authenticated
  using (recipient_user_id = auth.uid());

comment on column public.alert_log.variant is 'Sub-discriminator for the same alert_type · e.g. event_reminder uses ''t7''/''t1''';
