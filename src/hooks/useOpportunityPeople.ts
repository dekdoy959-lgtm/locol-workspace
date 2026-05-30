import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { OppPersonInsert, OppPersonRow, ParticipantRole, ParticipantStatus } from '../types/opportunityPeople';

const KEY = ['opportunity_people'] as const;

/** Fetch ALL opportunity_people rows — used by Summary table to denormalize */
export function useAllOpportunityPeople() {
  return useQuery({
    queryKey: [...KEY, 'all'],
    queryFn: async (): Promise<OppPersonRow[]> => {
      const { data, error } = await supabase
        .from('opportunity_people')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOpportunityPeople(opportunityId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'opp', opportunityId],
    enabled: !!opportunityId,
    queryFn: async (): Promise<OppPersonRow[]> => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from('opportunity_people')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All opportunity_people rows touching a contact. Used for cross-linked timeline. */
export function useContactOpportunityLinks(contactId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'contact', contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<OppPersonRow[]> => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('opportunity_people')
        .select('*')
        .eq('contact_id', contactId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOrgOpportunityLinks(orgId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'org', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<OppPersonRow[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('opportunity_people')
        .select('*')
        .eq('org_id', orgId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddOpportunityPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OppPersonInsert) => {
      const { data, error } = await supabase
        .from('opportunity_people')
        .insert(input as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as OppPersonRow;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, 'opp', vars.opportunity_id] });
      if (vars.contact_id) qc.invalidateQueries({ queryKey: [...KEY, 'contact', vars.contact_id] });
      if (vars.org_id) qc.invalidateQueries({ queryKey: [...KEY, 'org', vars.org_id] });
    },
  });
}

export function useUpdateOpportunityPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { status?: ParticipantStatus | null; role?: ParticipantRole; note?: string | null };
    }) => {
      const { data, error } = await supabase
        .from('opportunity_people')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as OppPersonRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteOpportunityPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('opportunity_people').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
