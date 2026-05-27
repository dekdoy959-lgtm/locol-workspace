import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

export type CommitmentRow = Database['public']['Tables']['commitments']['Row'];
export type CommitmentInsert = Database['public']['Tables']['commitments']['Insert'];

const KEY = ['commitments'] as const;

export function useContactCommitments(contactId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<CommitmentRow[]> => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('contact_id', contactId)
        .order('date_made', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Open commitments across all contacts — for briefing/dashboard */
export function useAllOpenCommitments() {
  return useQuery({
    queryKey: [...KEY, 'all-open'],
    queryFn: async (): Promise<CommitmentRow[]> => {
      const { data, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('status', 'open')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCommitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommitmentInsert) => {
      const { data, error } = await supabase
        .from('commitments')
        .insert(input as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as CommitmentRow;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.contact_id] });
      qc.invalidateQueries({ queryKey: [...KEY, 'all-open'] });
    },
  });
}

export function useUpdateCommitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<CommitmentRow, 'status' | 'description' | 'due_date' | 'evidence_link'>>;
    }) => {
      const { data, error } = await supabase
        .from('commitments')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as CommitmentRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [...KEY, data.contact_id] });
      qc.invalidateQueries({ queryKey: [...KEY, 'all-open'] });
    },
  });
}

export function useDeleteCommitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase.from('commitments').delete().eq('id', id);
      if (error) throw error;
      return { id, contactId };
    },
    onSuccess: ({ contactId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, contactId] });
      qc.invalidateQueries({ queryKey: [...KEY, 'all-open'] });
    },
  });
}
