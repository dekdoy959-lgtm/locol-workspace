import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ContactUpdate } from '../types/contact';

interface MergeContactsInput {
  /** The contact to keep (will receive the merged data) */
  keptId: string;
  /** The contact to delete (its FKs will be reassigned to keptId) */
  sourceId: string;
  /** The merged field values to write to the kept contact before merge */
  mergedData: ContactUpdate;
}

export function useMergeContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ keptId, sourceId, mergedData }: MergeContactsInput) => {
      // 1. Update kept contact with merged data
      const { error: updateError } = await supabase
        .from('contacts')
        .update(mergedData as never)
        .eq('id', keptId);
      if (updateError) throw updateError;

      // 2. Call atomic RPC to reassign FKs + delete source
      const { error: rpcError } = await supabase.rpc('merge_contacts' as never, {
        source_id: sourceId,
        kept_id: keptId,
      } as never);
      if (rpcError) throw rpcError;

      return { keptId, sourceId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['milestones'] });
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
