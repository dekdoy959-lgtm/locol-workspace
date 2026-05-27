import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { OpportunityInsert, OpportunityRow, OpportunityUpdate, TrackKey } from '../types/opportunity';

const OPP_KEY = ['opportunities'] as const;

export function useOpportunities(track?: TrackKey | null) {
  return useQuery({
    queryKey: [...OPP_KEY, track ?? 'all'],
    queryFn: async (): Promise<OpportunityRow[]> => {
      let query = supabase.from('opportunities').select('*').is('archived_at', null);
      if (track) query = query.eq('track', track);
      const { data, error } = await query.order('last_update_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: [...OPP_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<OpportunityRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OpportunityInsert) => {
      const { data, error } = await supabase
        .from('opportunities')
        .insert(input as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as OpportunityRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OPP_KEY }),
  });
}

export function useUpdateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: OpportunityUpdate }) => {
      const fullPatch = { ...patch, last_update_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('opportunities')
        .update(fullPatch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as OpportunityRow;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: OPP_KEY });
      qc.invalidateQueries({ queryKey: [...OPP_KEY, id] });
    },
  });
}

export function useDeleteOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('opportunities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OPP_KEY }),
  });
}
