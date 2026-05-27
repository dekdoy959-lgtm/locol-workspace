import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { GroupInsert, GroupRow, GroupUpdate } from '../types/group';
import type { ContactRow } from '../types/contact';

const GROUPS_KEY = ['groups'] as const;

export function useGroups() {
  return useQuery({
    queryKey: GROUPS_KEY,
    queryFn: async (): Promise<GroupRow[]> => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: [...GROUPS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<GroupRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from('groups').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useGroupMemberCounts() {
  return useQuery({
    queryKey: [...GROUPS_KEY, 'member-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.from('group_members').select('group_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { group_id: string }[]) {
        counts[row.group_id] = (counts[row.group_id] ?? 0) + 1;
      }
      return counts;
    },
  });
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: [...GROUPS_KEY, 'members', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<ContactRow[]> => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select('contact_id, contacts(*)')
        .eq('group_id', groupId);
      if (error) throw error;
      const rows = (data ?? []) as { contacts: ContactRow | null }[];
      return rows.map((r) => r.contacts).filter((c): c is ContactRow => c != null);
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GroupInsert) => {
      const { data, error } = await supabase.from('groups').insert(input as never).select('*').single();
      if (error) throw error;
      return data as GroupRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUPS_KEY }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: GroupUpdate }) => {
      const { data, error } = await supabase
        .from('groups')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as GroupRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUPS_KEY }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: GROUPS_KEY }),
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, contactId }: { groupId: string; contactId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, contact_id: contactId } as never);
      if (error && error.code !== '23505') throw error; // ignore duplicate
    },
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: GROUPS_KEY });
      qc.invalidateQueries({ queryKey: [...GROUPS_KEY, 'members', groupId] });
    },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, contactId }: { groupId: string; contactId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('contact_id', contactId);
      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: GROUPS_KEY });
      qc.invalidateQueries({ queryKey: [...GROUPS_KEY, 'members', groupId] });
    },
  });
}
