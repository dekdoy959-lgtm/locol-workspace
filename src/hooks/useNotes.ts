import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { NoteInsert, NoteRow, NoteScope, NoteUpdate } from '../types/note';

const NOTES_KEY = ['notes'] as const;

export function useNotes(scope: NoteScope, targetId: string | undefined) {
  return useQuery({
    queryKey: [...NOTES_KEY, scope, targetId],
    enabled: !!targetId,
    queryFn: async (): Promise<NoteRow[]> => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('scope', scope)
        .eq('target_id', targetId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NoteInsert) => {
      const { data, error } = await supabase.from('notes').insert(input as never).select('*').single();
      if (error) throw error;
      return data as NoteRow;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...NOTES_KEY, vars.scope, vars.target_id] });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: NoteUpdate }) => {
      const { data, error } = await supabase
        .from('notes')
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as NoteRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [...NOTES_KEY, data.scope, data.target_id] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scope, targetId }: { id: string; scope: NoteScope; targetId: string }) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      return { id, scope, targetId };
    },
    onSuccess: ({ scope, targetId }) => {
      qc.invalidateQueries({ queryKey: [...NOTES_KEY, scope, targetId] });
    },
  });
}
