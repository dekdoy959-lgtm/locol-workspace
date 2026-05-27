import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { OpportunityRow } from '../types/opportunity';

/**
 * Fetch opportunities that link to a given contact via opportunity_people.
 * Returns opportunity rows joined with role/status from the link row.
 */
export interface LinkedOpportunity extends OpportunityRow {
  link_role: 'organizer' | 'attendee';
  link_status: string | null;
}

export function useLinkedOpportunitiesForContact(contactId: string | undefined) {
  return useQuery({
    queryKey: ['linked-opportunities', 'contact', contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<LinkedOpportunity[]> => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('opportunity_people')
        .select('role, status, opportunities(*)')
        .eq('contact_id', contactId);
      if (error) throw error;
      const rows = (data ?? []) as { role: 'organizer' | 'attendee'; status: string | null; opportunities: OpportunityRow | null }[];
      return rows
        .filter((r) => r.opportunities)
        .map((r) => ({ ...(r.opportunities as OpportunityRow), link_role: r.role, link_status: r.status }));
    },
  });
}

export function useLinkedOpportunitiesForOrg(orgId: string | undefined) {
  return useQuery({
    queryKey: ['linked-opportunities', 'org', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<LinkedOpportunity[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('opportunity_people')
        .select('role, status, opportunities(*)')
        .eq('org_id', orgId);
      if (error) throw error;
      const rows = (data ?? []) as { role: 'organizer' | 'attendee'; status: string | null; opportunities: OpportunityRow | null }[];
      return rows
        .filter((r) => r.opportunities)
        .map((r) => ({ ...(r.opportunities as OpportunityRow), link_role: r.role, link_status: r.status }));
    },
  });
}
