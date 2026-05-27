import { useQuery } from '@tanstack/react-query';
import { GmailAuthError, listEmailsForContact, type GmailMessageMeta } from '../lib/google-gmail';
import { useAuth } from '../contexts/AuthContext';

export function useGmailMessages(emails: string[]) {
  const { providerToken } = useAuth();
  const sortedEmails = [...emails].map((e) => e.toLowerCase().trim()).filter(Boolean).sort();

  return useQuery({
    queryKey: ['gmail', 'messages', sortedEmails],
    enabled: !!providerToken && sortedEmails.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<GmailMessageMeta[]> => {
      if (!providerToken) return [];
      return listEmailsForContact(providerToken, sortedEmails, 30);
    },
    retry: (failureCount, error) => {
      if (error instanceof GmailAuthError) return false;
      return failureCount < 2;
    },
  });
}
