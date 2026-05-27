import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

export type InteractionRow = Database['public']['Tables']['interactions']['Row'];
export type InteractionInsert = Database['public']['Tables']['interactions']['Insert'];

export const INTERACTION_CHANNELS = [
  'Line',
  'Email',
  'Phone',
  'SMS',
  'Facebook Messenger',
  'WhatsApp',
  'WeChat',
  'In Person',
  'Video Call',
  'Other',
];

const KEY = ['interactions'] as const;

export function useContactInteractions(contactId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<InteractionRow[]> => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('contact_id', contactId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InteractionInsert) => {
      const { data, error } = await supabase
        .from('interactions')
        .insert(input as never)
        .select('*')
        .single();
      if (error) throw error;

      // Also update contact.last_contact_date
      if (input.contact_id && input.date) {
        await supabase
          .from('contacts')
          .update({ last_contact_date: input.date } as never)
          .eq('id', input.contact_id);
      }

      return data as InteractionRow;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.contact_id] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useDeleteInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase.from('interactions').delete().eq('id', id);
      if (error) throw error;
      return { id, contactId };
    },
    onSuccess: ({ contactId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, contactId] });
    },
  });
}
