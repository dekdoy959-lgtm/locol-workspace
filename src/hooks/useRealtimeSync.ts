import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Subscribe to Supabase realtime changes on key tables and invalidate
 * matching TanStack Query caches so all views stay in sync across tabs/users.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('locol-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        () => qc.invalidateQueries({ queryKey: ['contacts'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organizations' },
        () => qc.invalidateQueries({ queryKey: ['organizations'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { scope?: string; target_id?: string } | null;
          if (row?.scope && row.target_id) {
            qc.invalidateQueries({ queryKey: ['notes', row.scope, row.target_id] });
          } else {
            qc.invalidateQueries({ queryKey: ['notes'] });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interactions' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { contact_id?: string } | null;
          if (row?.contact_id) {
            qc.invalidateQueries({ queryKey: ['interactions', row.contact_id] });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commitments' },
        () => qc.invalidateQueries({ queryKey: ['commitments'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'milestones' },
        () => qc.invalidateQueries({ queryKey: ['milestones'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunity_people' },
        () => qc.invalidateQueries({ queryKey: ['opportunity_people'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'relations' },
        () => qc.invalidateQueries({ queryKey: ['relations'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        () => qc.invalidateQueries({ queryKey: ['groups'] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'track_settings' },
        () => qc.invalidateQueries({ queryKey: ['track_settings'] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
