-- 0020 · Team access management (Phase 5a — soft gating, RLS unchanged)
-- Adds team_members.status so an admin can approve / disable members in-app.
-- New signups land as 'pending'; existing members stay 'active' (column default).
-- ⚠️ This does NOT change RLS yet (Phase 5b). It's a UX gate + admin backend.

alter table public.team_members
  add column if not exists status text not null default 'active'
    check (status in ('pending', 'active', 'disabled'));

-- New Google signups become 'pending' until an admin approves them in /team.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.team_members (id, email, full_name, avatar_url, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- ⚠️ CHANGE this to your LOCOL admin Google account(s) before running.
-- Guarantees at least one active admin who can approve everyone else.
update public.team_members
  set role = 'admin', status = 'active'
  where email in ('locol.beef@gmail.com');
