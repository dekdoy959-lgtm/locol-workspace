-- Wave C-1 · Merge contacts RPC
-- Atomically reassigns all FKs from source_id → kept_id and deletes source.
-- The CALLER is responsible for first updating the kept contact with merged field values.

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

  -- group_members: drop source rows that already exist for kept, then move the rest
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

-- Allow authenticated users to call this function
revoke all on function public.merge_contacts(uuid, uuid) from public;
grant execute on function public.merge_contacts(uuid, uuid) to authenticated;
