/**
 * Workspace-wide hooks needed by the /calendar page.
 * Pulls all-future commitments + all-future reminder notes (single query each)
 * + a wide-window pull of the user's Google Calendar.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  CalendarAuthError,
  listCalendarEvents,
  type CalendarEvent,
} from '../lib/google-calendar';
import type { Database } from '../types/database';
import { todayLocalISO } from '../lib/dateUtil';

type CommitmentRow = Database['public']['Tables']['commitments']['Row'];
type NoteRow = Database['public']['Tables']['notes']['Row'];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** All open commitments with a due_date. */
export function useAllOpenCommitments() {
  return useQuery({
    queryKey: ['commitments', 'all-open'],
    queryFn: async (): Promise<CommitmentRow[]> => {
      const { data, error } = await supabase
        .from('commitments')
        .select('*')
        .eq('status', 'open')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All future-dated reminder notes (is_future=true, date >= today). */
export function useAllFutureNotes() {
  const today = todayLocalISO();
  return useQuery({
    queryKey: ['notes', 'all-future', today],
    queryFn: async (): Promise<NoteRow[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('is_future', true)
        .gte('date', today)
        .order('date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * All Google Calendar events in a wide window (default: -30d to +90d).
 * Used by the /calendar page for workspace-wide schedule.
 */
export function useWideCalendarEvents() {
  const { providerToken, user } = useAuth();
  return useQuery({
    // Partition by user.id so a shared device can't serve User A's cached
    // calendar events to User B (PII leak).
    queryKey: ['calendar', 'wide', user?.id],
    enabled: !!providerToken,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!providerToken) return [];
      const timeMin = new Date(Date.now() - 30 * MS_PER_DAY).toISOString();
      const timeMax = new Date(Date.now() + 90 * MS_PER_DAY).toISOString();
      return listCalendarEvents(providerToken, { timeMin, timeMax, maxResults: 250 });
    },
    retry: (failureCount, error) => {
      if (error instanceof CalendarAuthError) return false;
      return failureCount < 2;
    },
  });
}
