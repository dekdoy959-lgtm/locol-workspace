import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { OrgInsert, OrgRow, OrgUpdate } from '../types/organization';

const ORGS_KEY = ['organizations'] as const;

export function useOrganizations() {
  return useQuery({
    queryKey: ORGS_KEY,
    queryFn: async (): Promise<OrgRow[]> => {
      const { data, error } = await supabase.from('organizations').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: [...ORGS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<OrgRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OrgInsert) => {
      const { data, error } = await supabase
        .from('organizations')
        .insert(input as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as OrgRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORGS_KEY }),
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: OrgUpdate }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as OrgRow;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ORGS_KEY });
      qc.invalidateQueries({ queryKey: [...ORGS_KEY, id] });
    },
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORGS_KEY }),
  });
}
