import { useQuery } from '@tanstack/react-query';
import { CalendarAuthError, listEventsForContact, type CalendarEvent } from '../lib/google-calendar';
import { useAuth } from '../contexts/AuthContext';

export function useCalendarEvents(emails: string[]) {
  const { providerToken } = useAuth();
  // Stable key based on sorted emails
  const sortedEmails = [...emails].map((e) => e.toLowerCase().trim()).filter(Boolean).sort();

  return useQuery({
    queryKey: ['calendar', 'events', sortedEmails],
    enabled: !!providerToken && sortedEmails.length > 0,
    staleTime: 5 * 60 * 1000, // cache 5 min
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!providerToken) return [];
      return listEventsForContact(providerToken, sortedEmails);
    },
    retry: (failureCount, error) => {
      if (error instanceof CalendarAuthError) return false;
      return failureCount < 2;
    },
  });
}
