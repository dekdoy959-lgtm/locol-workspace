import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

export type TeamMemberRow = Database['public']['Tables']['team_members']['Row'];
export type TeamMemberUpdate = Database['public']['Tables']['team_members']['Update'];

export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TeamMemberUpdate }) => {
      const { data, error } = await supabase
        .from('team_members')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as TeamMemberRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_members'] });
    },
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team_members'],
    queryFn: async (): Promise<TeamMemberRow[]> => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function teamMemberInitials(m: TeamMemberRow): string {
  if (m.initials) return m.initials.toUpperCase();
  if (m.full_name) {
    return m.full_name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }
  return m.email.slice(0, 2).toUpperCase();
}

export function teamMemberDisplayName(m: TeamMemberRow): string {
  return m.full_name ?? m.email;
}

/** Truncate email domain to first letter — keeps dropdown short.
 *  nine.tawan@gmail.com → nine.tawan@G  */
function shortEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user}@${domain[0].toUpperCase()}`;
}

/** Use in dropdowns where multiple members may share the same display name. */
export function teamMemberDropdownLabel(m: TeamMemberRow): string {
  return m.full_name ? `${m.full_name} · ${shortEmail(m.email)}` : m.email;
}
