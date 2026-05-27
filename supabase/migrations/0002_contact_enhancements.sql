-- Wave A · Contact enhancements
-- - Birthday notification toggle per contact
-- - Avatar URL (for Wave B photo upload)
-- - freq_unit column to remember the display unit (days/weeks/months/years)

alter table public.contacts
  add column if not exists avatar_url text,
  add column if not exists birthday_notification_enabled boolean not null default false,
  add column if not exists freq_unit text check (freq_unit in ('days', 'weeks', 'months', 'years'));
