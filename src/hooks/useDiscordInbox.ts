import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type InboxRow = Database['public']['Tables']['discord_inbox']['Row'];

export function useDiscordInboxForOpportunity(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['discord-inbox-opp', opportunityId],
    enabled: !!opportunityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discord_inbox')
        .select('*')
        .eq('created_opportunity_id', opportunityId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as InboxRow | null;
    },
    staleTime: 60_000,
  });
}

export function useDiscordInboxForContact(contactId: string | undefined) {
  return useQuery({
    queryKey: ['discord-inbox-contact', contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discord_inbox')
        .select('*')
        .eq('created_contact_id', contactId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as InboxRow | null;
    },
    staleTime: 60_000,
  });
}
