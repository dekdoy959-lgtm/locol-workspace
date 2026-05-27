import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useAllTags() {
  return useQuery({
    queryKey: ['contacts', 'all-tags'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from('contacts').select('tags');
      if (error) throw error;
      const set = new Set<string>();
      const rows = (data ?? []) as { tags: string[] | null }[];
      for (const row of rows) {
        for (const tag of row.tags ?? []) {
          if (typeof tag === 'string' && tag.trim()) set.add(tag.trim());
        }
      }
      return Array.from(set).sort();
    },
    staleTime: 60_000,
  });
}
