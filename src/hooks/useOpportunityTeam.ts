import { colors } from '../styles/tokens';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../types/database';

export type TeamAssignmentRow = Database['public']['Tables']['opportunity_team_assignments']['Row'];
export type TeamAssignmentInsert = Database['public']['Tables']['opportunity_team_assignments']['Insert'];

export type TeamRole = TeamAssignmentRow['role'];

export const TEAM_ROLE_META: Record<TeamRole, { label: string; icon: string; color: string }> = {
  owner:          { label: 'Owner · เจ้าของหลัก',       icon: '👑', color: '#99CE24' },
  reviewer:       { label: 'Reviewer · ผู้ตรวจสอบ',     icon: '✓',  color: colors.warn },
  document_lead:  { label: 'Document Lead · คนทำเอกสาร', icon: '📝', color: colors.olive },
  coordinator:    { label: 'Coordinator · คนประสานงาน', icon: '🤝', color: '#d99a66' },
  traveler:       { label: 'Traveler · คนไป',           icon: '✈',  color: colors.danger },
  support:        { label: 'Support · ทั่วไป',           icon: '🛟', color: '#747474' },
};

export const TEAM_ROLE_ORDER: TeamRole[] = [
  'owner',
  'reviewer',
  'document_lead',
  'coordinator',
  'traveler',
  'support',
];

const KEY = ['opp-team-assignments'] as const;

/** Fetch ALL team assignments across all opps — for summary table */
export function useAllOpportunityTeam() {
  return useQuery({
    queryKey: [...KEY, 'all'],
    queryFn: async (): Promise<TeamAssignmentRow[]> => {
      const { data, error } = await supabase
        .from('opportunity_team_assignments')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOpportunityTeam(opportunityId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, opportunityId],
    enabled: !!opportunityId,
    queryFn: async (): Promise<TeamAssignmentRow[]> => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from('opportunity_team_assignments')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Group assignments by role for rendering */
export function groupAssignmentsByRole(
  assignments: TeamAssignmentRow[],
): Record<TeamRole, TeamAssignmentRow[]> {
  const groups: Record<TeamRole, TeamAssignmentRow[]> = {
    owner: [],
    reviewer: [],
    document_lead: [],
    coordinator: [],
    traveler: [],
    support: [],
  };
  for (const a of assignments) {
    groups[a.role]?.push(a);
  }
  return groups;
}

export function useAssignmentsByMember(opportunityId: string | undefined) {
  const { data: assignments = [] } = useOpportunityTeam(opportunityId);
  return useMemo(() => {
    const byMember = new Map<string, TeamRole[]>();
    for (const a of assignments) {
      const arr = byMember.get(a.team_member_id) ?? [];
      arr.push(a.role);
      byMember.set(a.team_member_id, arr);
    }
    return byMember;
  }, [assignments]);
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TeamAssignmentInsert, 'created_by'>) => {
      const payload = { ...input, created_by: user?.id ?? null } as TeamAssignmentInsert;
      const { data, error } = await supabase
        .from('opportunity_team_assignments')
        .insert(payload as never)
        .select('*')
        .single();
      if (error) throw error;
      // Sync owner_id / reviewer_id onto opportunities row so legacy queries
      // (and Briefing's "My" filter) match. Only writes if role is owner/reviewer
      // AND the field is currently null (don't clobber existing single-value).
      if (input.role === 'owner' || input.role === 'reviewer') {
        const field = input.role === 'owner' ? 'owner_id' : 'reviewer_id';
        await supabase
          .from('opportunities')
          .update({ [field]: input.team_member_id } as never)
          .eq('id', input.opportunity_id)
          .is(field, null);
        qc.invalidateQueries({ queryKey: ['opportunities'] });
      }
      return data as TeamAssignmentRow;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.opportunity_id] });
      qc.invalidateQueries({ queryKey: [...KEY, 'all'] });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, opportunityId }: { id: string; opportunityId: string }) => {
      const { error } = await supabase
        .from('opportunity_team_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, opportunityId };
    },
    onSuccess: ({ opportunityId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, opportunityId] });
    },
  });
}
