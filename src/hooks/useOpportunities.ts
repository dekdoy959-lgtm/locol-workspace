import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { OpportunityInsert, OpportunityRow, OpportunityUpdate, TrackKey } from '../types/opportunity';

const OPP_KEY = ['opportunities'] as const;

export function useOpportunities(track?: TrackKey | null) {
  return useQuery({
    queryKey: [...OPP_KEY, track ?? 'all'],
    queryFn: async (): Promise<OpportunityRow[]> => {
      let query = supabase.from('opportunities').select('*').is('archived_at', null);
      if (track) query = query.eq('track', track);
      const { data, error } = await query.order('last_update_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: [...OPP_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<OpportunityRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Duplicate a trip (or any opportunity) — copies the opp + all trip_stops.
 * Optionally shift all stop dates + opp due_date by N days.
 * Returns the new opp id so caller can navigate.
 */
export function useDuplicateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sourceId, shiftDays = 0 }: { sourceId: string; shiftDays?: number }) => {
      // 1. Fetch source opp
      const { data: src, error: srcErr } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', sourceId)
        .single();
      if (srcErr) throw srcErr;
      const source = src as OpportunityRow;

      const shiftDate = (iso: string | null): string | null => {
        if (!iso || shiftDays === 0) return iso;
        const d = new Date(iso);
        d.setDate(d.getDate() + shiftDays);
        return d.toISOString().slice(0, 10);
      };

      // Shift dates in details (event_date_*, registration_deadline, trip_date_*, etc.)
      const shiftedDetails: Record<string, unknown> = { ...(source.details as Record<string, unknown>) };
      const dateKeys = [
        'event_date_start',
        'event_date_end',
        'registration_deadline',
        'trip_date_start',
        'trip_date_end',
        'application_deadline',
        'decision_date',
        'effective_date',
        'renewal_date',
      ];
      if (shiftDays !== 0) {
        for (const k of dateKeys) {
          const v = shiftedDetails[k];
          if (typeof v === 'string' && v) shiftedDetails[k] = shiftDate(v);
        }
      }

      // 2. Insert new opp
      const insert = {
        track: source.track,
        title: `${source.title} (copy${shiftDays > 0 ? ` +${shiftDays}d` : ''})`,
        stage: source.stage,
        status: 'New',
        priority: source.priority,
        source_url: source.source_url,
        due_date: shiftDate(source.due_date),
        owner_id: source.owner_id,
        reviewer_id: source.reviewer_id,
        ai_summary: source.ai_summary,
        details: shiftedDetails,
      };
      const { data: created, error: cErr } = await supabase
        .from('opportunities')
        .insert(insert as never)
        .select('*')
        .single();
      if (cErr) throw cErr;
      const newOpp = created as OpportunityRow;

      // 3. Copy trip_stops (if track=trip)
      if (source.track === 'trip') {
        const { data: stops, error: sErr } = await supabase
          .from('trip_stops')
          .select('*')
          .eq('opportunity_id', sourceId);
        if (sErr) throw sErr;
        if (stops && stops.length > 0) {
          const stopsInsert = stops.map((s) => ({
            opportunity_id: newOpp.id,
            day_date: shiftDate(s.day_date) ?? s.day_date,
            sort_order: s.sort_order,
            stop_type: s.stop_type,
            start_time: s.start_time,
            end_time: s.end_time,
            name: s.name,
            province: s.province,
            location_name: s.location_name,
            owner_name: s.owner_name,
            owner_phone: s.owner_phone,
            purpose: s.purpose,
            agenda: s.agenda,
            emphasis: s.emphasis,
            notes: s.notes,
          }));
          const { error: stopsErr } = await supabase
            .from('trip_stops')
            .insert(stopsInsert as never);
          if (stopsErr) throw stopsErr;
        }
      }

      return newOpp;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OPP_KEY }),
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OpportunityInsert) => {
      const { data, error } = await supabase
        .from('opportunities')
        .insert(input as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as OpportunityRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OPP_KEY }),
  });
}

export function useUpdateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: OpportunityUpdate }) => {
      const fullPatch = { ...patch, last_update_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('opportunities')
        .update(fullPatch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as OpportunityRow;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: OPP_KEY });
      qc.invalidateQueries({ queryKey: [...OPP_KEY, id] });
    },
  });
}

export function useDeleteOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('opportunities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OPP_KEY }),
  });
}
