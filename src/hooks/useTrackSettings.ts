import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TrackKey } from '../types/opportunity';

export interface TrackSettingsRow {
  track: TrackKey;
  stale_threshold_days: number | null;
  ping_enabled: boolean;
  email_notifications: boolean;
  updated_at: string;
}

const KEY = ['track_settings'] as const;

export function useTrackSettings() {
  return useQuery({
    queryKey: KEY,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TrackSettingsRow[]> => {
      const { data, error } = await supabase.from('track_settings').select('*').order('track');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateTrackSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      track,
      patch,
    }: {
      track: TrackKey;
      patch: Partial<Pick<TrackSettingsRow, 'stale_threshold_days' | 'ping_enabled' | 'email_notifications'>>;
    }) => {
      const { data, error } = await supabase
        .from('track_settings')
        .update({ ...patch, updated_at: new Date().toISOString() } as never)
        .eq('track', track)
        .select('*')
        .single();
      if (error) throw error;
      return data as TrackSettingsRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Helper: get stale threshold for a given track. Returns null = never stale (e.g. Watch). */
export function getStaleThreshold(settings: TrackSettingsRow[] | undefined, track: TrackKey): number | null {
  if (!settings) return 7; // safe default while loading
  const s = settings.find((s) => s.track === track);
  return s?.stale_threshold_days ?? null;
}
