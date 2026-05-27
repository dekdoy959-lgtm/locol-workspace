import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { MilestoneRow } from '../types/milestone';

export function useAllMilestones() {
  return useQuery({
    queryKey: ['milestones', 'all'],
    queryFn: async (): Promise<MilestoneRow[]> => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .order('date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
