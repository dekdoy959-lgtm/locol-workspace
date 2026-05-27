import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserAlertPrefsRow {
  user_id: string;
  enabled: boolean;
  stale_opportunities: boolean;
  cold_contacts: boolean;
  reminder_notes: boolean;
  birthdays: boolean;
  commitment_overdue: boolean;
  digest_hour: number;
  updated_at: string;
}

const KEY = ['user_alert_prefs'] as const;

export function useMyAlertPrefs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UserAlertPrefsRow | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_alert_prefs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      // If no row exists yet, return defaults
      return (
        data ?? {
          user_id: user.id,
          enabled: true,
          stale_opportunities: true,
          cold_contacts: true,
          reminder_notes: true,
          birthdays: true,
          commitment_overdue: true,
          digest_hour: 9,
          updated_at: new Date().toISOString(),
        }
      );
    },
  });
}

export function useUpdateMyAlertPrefs() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (patch: Partial<UserAlertPrefsRow>) => {
      if (!user?.id) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('user_alert_prefs')
        .upsert(
          { user_id: user.id, ...patch, updated_at: new Date().toISOString() } as never,
          { onConflict: 'user_id' },
        )
        .select('*')
        .single();
      if (error) throw error;
      return data as UserAlertPrefsRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, user?.id] }),
  });
}
