import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

export type TripStopRow = Database['public']['Tables']['trip_stops']['Row'];
export type TripStopInsert = Database['public']['Tables']['trip_stops']['Insert'];
export type TripStopUpdate = Database['public']['Tables']['trip_stops']['Update'];

export type StopType = TripStopRow['stop_type'];

export const STOP_TYPE_META: Record<StopType, { label: string; icon: string }> = {
  farm:      { label: 'ฟาร์ม',        icon: '🐄' },
  place:     { label: 'สถานที่',      icon: '📍' },
  workshop:  { label: 'Workshop',     icon: '🛠' },
  meeting:   { label: 'ประชุม',       icon: '🤝' },
  lodging:   { label: 'ที่พัก',        icon: '🏨' },
  transport: { label: 'การเดินทาง',  icon: '🚗' },
  other:     { label: 'อื่นๆ',         icon: '📌' },
};

const KEY = ['trip-stops'] as const;

/** Fetch ALL trip stops across all trips — used by Calendar page */
export function useAllTripStops() {
  return useQuery({
    queryKey: [...KEY, 'all'],
    queryFn: async (): Promise<TripStopRow[]> => {
      const { data, error } = await supabase
        .from('trip_stops')
        .select('*')
        .order('day_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTripStops(opportunityId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, opportunityId],
    enabled: !!opportunityId,
    queryFn: async (): Promise<TripStopRow[]> => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from('trip_stops')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('day_date', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Group stops by day for rendering */
export function groupStopsByDay(stops: TripStopRow[]): { date: string; stops: TripStopRow[] }[] {
  const map = new Map<string, TripStopRow[]>();
  for (const s of stops) {
    const arr = map.get(s.day_date) ?? [];
    arr.push(s);
    map.set(s.day_date, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stops]) => ({ date, stops }));
}

export function useCreateTripStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TripStopInsert) => {
      const { data, error } = await supabase
        .from('trip_stops')
        .insert(input as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as TripStopRow;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.opportunity_id] });
    },
  });
}

export function useUpdateTripStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      opportunityId,
      patch,
    }: {
      id: string;
      opportunityId: string;
      patch: TripStopUpdate;
    }) => {
      const { error } = await supabase
        .from('trip_stops')
        .update(patch as never)
        .eq('id', id);
      if (error) throw error;
      return { id, opportunityId };
    },
    onSuccess: ({ opportunityId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, opportunityId] });
    },
  });
}

export function useDeleteTripStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, opportunityId }: { id: string; opportunityId: string }) => {
      const { error } = await supabase.from('trip_stops').delete().eq('id', id);
      if (error) throw error;
      return { id, opportunityId };
    },
    onSuccess: ({ opportunityId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, opportunityId] });
    },
  });
}
