import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { MilestoneInsert, MilestoneRow, MilestoneUpdate } from '../types/milestone';

const MILESTONES_KEY = ['milestones'] as const;

export function useMilestones(contactId: string | undefined) {
  return useQuery({
    queryKey: [...MILESTONES_KEY, contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<MilestoneRow[]> => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('contact_id', contactId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MilestoneInsert) => {
      const { data, error } = await supabase
        .from('milestones')
        .insert(input as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as MilestoneRow;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...MILESTONES_KEY, vars.contact_id] });
    },
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: MilestoneUpdate }) => {
      const { data, error } = await supabase
        .from('milestones')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as MilestoneRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [...MILESTONES_KEY, data.contact_id] });
    },
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase.from('milestones').delete().eq('id', id);
      if (error) throw error;
      return { id, contactId };
    },
    onSuccess: ({ contactId }) => {
      qc.invalidateQueries({ queryKey: [...MILESTONES_KEY, contactId] });
    },
  });
}
