-- LOCOL Workspace · Fix merge_contacts to preserve newer FK tables
--
-- Background: merge_contacts (0005) was written before:
--   - opportunity_people (0006) — organizer/attendee links
--   - opportunity_team_assignments (0015) — internal role assignments
--   - discord_inbox (0010/0011) — created_contact_id
--
-- All three have FKs to contacts with ON DELETE CASCADE. When merge_contacts
-- finishes with `delete from contacts where id = source_id`, those rows are
-- silently destroyed instead of being reassigned to kept_id.
--
-- Real impact: ops user merges 2 dup contacts → all events/trips that had
-- the source contact as organizer/attendee/traveler/etc. lose those links.
-- Discord captures linked to source contact lose their cross-link too.
--
-- This migration replaces merge_contacts with a v2 that handles all FKs.

create or replace function public.merge_contacts(source_id uuid, kept_id uuid)
returns void as $$
begin
  if source_id = kept_id then
    raise exception 'source_id and kept_id must be different';
  end if;

  if not exists (select 1 from public.contacts where id = source_id) then
    raise exception 'source contact % not found', source_id;
  end if;

  if not exists (select 1 from public.contacts where id = kept_id) then
    raise exception 'kept contact % not found', kept_id;
  end if;

  -- group_members: drop source rows that already exist for kept, then move
  delete from public.group_members
   where contact_id = source_id
     and group_id in (select group_id from public.group_members where contact_id = kept_id);
  update public.group_members set contact_id = kept_id where contact_id = source_id;

  -- contact_opportunities: same pattern
  delete from public.contact_opportunities
   where contact_id = source_id
     and opportunity_id in (select opportunity_id from public.contact_opportunities where contact_id = kept_id);
  update public.contact_opportunities set contact_id = kept_id where contact_id = source_id;

  -- relations: drop self-loops that would result, then reassign
  delete from public.relations
   where (from_contact_id = source_id and to_contact_id = kept_id)
      or (from_contact_id = kept_id   and to_contact_id = source_id);
  update public.relations set from_contact_id = kept_id where from_contact_id = source_id;
  update public.relations set to_contact_id   = kept_id where to_contact_id   = source_id;

  -- opportunity_people (added in 0006): dedupe on (opportunity_id, role, contact_id)
  -- then reassign. Note: schema requires exactly one of contact_id/org_id set,
  -- so a source row with contact_id and a kept row with the same opp+role would
  -- be exact duplicates after reassign.
  delete from public.opportunity_people
   where contact_id = source_id
     and (opportunity_id, role) in (
       select opportunity_id, role from public.opportunity_people
       where contact_id = kept_id
     );
  update public.opportunity_people set contact_id = kept_id where contact_id = source_id;

  -- discord_inbox.created_contact_id: just reassign, no dedupe needed
  -- (FK is nullable + a single discord message can only point to one contact)
  update public.discord_inbox set created_contact_id = kept_id where created_contact_id = source_id;

  -- Simple FK reassignments
  update public.interactions set contact_id = kept_id where contact_id = source_id;
  update public.commitments  set contact_id = kept_id where contact_id = source_id;
  update public.milestones   set contact_id = kept_id where contact_id = source_id;

  -- Polymorphic notes (scope='contact' + target_id)
  update public.notes
     set target_id = kept_id
   where scope = 'contact' and target_id = source_id;

  -- Finally, delete the source contact
  delete from public.contacts where id = source_id;
end;
$$ language plpgsql security definer;

revoke all on function public.merge_contacts(uuid, uuid) from public;
grant execute on function public.merge_contacts(uuid, uuid) to authenticated;

-- Note: opportunity_team_assignments references team_members(id), NOT contacts —
-- so it's not affected by contact merge. This migration intentionally doesn't
-- touch it.

comment on function public.merge_contacts(uuid, uuid) is
  'v2 (migration 0017): preserves opportunity_people, discord_inbox.created_contact_id, and all original FK reassignments.';
