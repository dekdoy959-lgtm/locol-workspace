import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ContactInsert, ContactRow, ContactUpdate } from '../types/contact';

const CONTACTS_KEY = ['contacts'] as const;

export function useContacts() {
  return useQuery({
    queryKey: CONTACTS_KEY,
    queryFn: async (): Promise<ContactRow[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('first_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<ContactRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContactInsert) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert(input as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as ContactRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ContactUpdate }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as ContactRow;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEY });
      qc.invalidateQueries({ queryKey: [...CONTACTS_KEY, id] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}
