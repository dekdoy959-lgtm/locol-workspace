import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RelationInsert, RelationRow } from '../types/relation';

const RELATIONS_KEY = ['relations'] as const;

/** All relations touching this contact (any direction, any target type). */
export function useContactRelations(contactId: string | undefined) {
  return useQuery({
    queryKey: [...RELATIONS_KEY, 'contact', contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<RelationRow[]> => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('relations')
        .select('*')
        .or(`from_contact_id.eq.${contactId},to_contact_id.eq.${contactId}`);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All relations pointing to this org. */
export function useOrgRelations(orgId: string | undefined) {
  return useQuery({
    queryKey: [...RELATIONS_KEY, 'org', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<RelationRow[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('relations').select('*').eq('to_org_id', orgId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All relations pointing to this opportunity. */
export function useOpportunityRelations(oppId: string | undefined) {
  return useQuery({
    queryKey: [...RELATIONS_KEY, 'opp', oppId],
    enabled: !!oppId,
    queryFn: async (): Promise<RelationRow[]> => {
      if (!oppId) return [];
      const { data, error } = await supabase.from('relations').select('*').eq('to_opportunity_id', oppId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All relations in the workspace — used by the graph view. */
export function useAllRelations() {
  return useQuery({
    queryKey: [...RELATIONS_KEY, 'all'],
    queryFn: async (): Promise<RelationRow[]> => {
      const { data, error } = await supabase.from('relations').select('*');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateRelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RelationInsert) => {
      const { data, error } = await supabase
        .from('relations')
        .insert(input as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as RelationRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RELATIONS_KEY }),
  });
}

export function useDeleteRelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('relations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RELATIONS_KEY }),
  });
}
