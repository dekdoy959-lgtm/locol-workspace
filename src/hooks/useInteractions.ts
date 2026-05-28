import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../types/database';
import {
  type CalendarEvent,
  eventDate,
  eventTime,
  eventMeetLink,
} from '../lib/google-calendar';
import {
  type GmailMessageMeta,
  getHeader,
  gmailMessageUrl,
  isOutgoing,
  messageDate,
  parseAddress,
} from '../lib/google-gmail';

export type InteractionRow = Database['public']['Tables']['interactions']['Row'];
export type InteractionInsert = Database['public']['Tables']['interactions']['Insert'];

export type ExternalSource = 'gmail' | 'calendar';

/** Returns Set of "<source>:<external_id>" already shared for this contact */
export function useSharedExternalIds(contactId: string | undefined): {
  sharedKeys: Set<string>;
  isLoading: boolean;
  sharedByMap: Map<string, string | null>; // key → logged_by user id
} {
  const { data: interactions = [], isLoading } = useContactInteractions(contactId);
  return useMemo(() => {
    const sharedKeys = new Set<string>();
    const sharedByMap = new Map<string, string | null>();
    for (const i of interactions) {
      if (i.source !== 'manual' && i.external_id) {
        const key = `${i.source}:${i.external_id}`;
        sharedKeys.add(key);
        sharedByMap.set(key, i.logged_by);
      }
    }
    return { sharedKeys, isLoading, sharedByMap };
  }, [interactions, isLoading]);
}

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

// ─── Convert Gmail message → InteractionInsert ──────────────────────
export function gmailToInteraction(
  message: GmailMessageMeta,
  contactId: string,
  loggedBy: string | null,
  myEmail: string,
): InteractionInsert {
  const outgoing = myEmail ? isOutgoing(message, myEmail) : false;
  const from = parseAddress(getHeader(message, 'From'))[0];
  const tos = parseAddress(getHeader(message, 'To'));
  const subject = getHeader(message, 'Subject') || '(no subject)';
  const date = messageDate(message);
  const snippet = message.snippet ?? '';
  const summary =
    `${outgoing ? '✉ Sent: ' : '✉ Received: '}${subject}` +
    (snippet ? ` — ${snippet.slice(0, 160)}${snippet.length > 160 ? '…' : ''}` : '');

  return {
    contact_id: contactId,
    date,
    channel: 'Email',
    direction: outgoing ? 'outbound' : 'inbound',
    summary,
    subject,
    source: 'gmail',
    external_id: message.id,
    external_url: gmailMessageUrl(message),
    logged_by: loggedBy,
    metadata: {
      thread_id: message.threadId,
      labels: message.labelIds,
      from: from ? { name: from.name, email: from.email } : null,
      to: tos.map((p) => ({ name: p.name, email: p.email })),
      snippet,
    },
  } as InteractionInsert;
}

// ─── Convert Calendar event → InteractionInsert ─────────────────────
export function calendarToInteraction(
  event: CalendarEvent,
  contactId: string,
  loggedBy: string | null,
): InteractionInsert {
  const date = eventDate(event) ?? new Date().toISOString().slice(0, 10);
  const time = eventTime(event);
  const meetLink = eventMeetLink(event);
  const title = event.summary ?? '(no title)';
  const summary = `📅 ${title}${time ? ` · ${time}` : ''}`;

  // Direction: if I'm the organizer → outbound (I scheduled it); else inbound
  const myIsOrganizer = event.organizer?.self === true;
  const channel = meetLink ? 'Video Call' : event.location ? 'In Person' : 'Video Call';

  return {
    contact_id: contactId,
    date,
    channel,
    direction: myIsOrganizer ? 'outbound' : 'inbound',
    summary,
    source: 'calendar',
    external_id: event.id,
    external_url: event.htmlLink ?? null,
    logged_by: loggedBy,
    metadata: {
      time,
      location: event.location,
      meet_link: meetLink,
      attendees: (event.attendees ?? []).map((a) => ({
        email: a.email,
        name: a.displayName,
        status: a.responseStatus,
        organizer: a.organizer,
      })),
      description: event.description?.slice(0, 500),
    },
  } as InteractionInsert;
}

// ─── Promote a single Gmail message ─────────────────────────────────
export function usePromoteGmail() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      message,
      contactId,
    }: {
      message: GmailMessageMeta;
      contactId: string;
    }) => {
      const insert = gmailToInteraction(message, contactId, user?.id ?? null, user?.email ?? '');
      const { data, error } = await supabase
        .from('interactions')
        .upsert(insert as never, { onConflict: 'contact_id,source,external_id', ignoreDuplicates: true })
        .select('*');
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.contactId] });
    },
  });
}

// ─── Promote a single Calendar event ────────────────────────────────
export function usePromoteCalendar() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      event,
      contactId,
    }: {
      event: CalendarEvent;
      contactId: string;
    }) => {
      const insert = calendarToInteraction(event, contactId, user?.id ?? null);
      const { data, error } = await supabase
        .from('interactions')
        .upsert(insert as never, { onConflict: 'contact_id,source,external_id', ignoreDuplicates: true })
        .select('*');
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.contactId] });
    },
  });
}

// ─── Bulk promote: many gmail + calendar at once ────────────────────
export function usePromoteBulk() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      gmailMessages,
      calendarEvents,
      contactId,
    }: {
      gmailMessages: GmailMessageMeta[];
      calendarEvents: CalendarEvent[];
      contactId: string;
    }) => {
      const inserts: InteractionInsert[] = [
        ...gmailMessages.map((m) => gmailToInteraction(m, contactId, user?.id ?? null, user?.email ?? '')),
        ...calendarEvents.map((e) => calendarToInteraction(e, contactId, user?.id ?? null)),
      ];
      if (inserts.length === 0) return { count: 0 };

      const { data, error } = await supabase
        .from('interactions')
        .upsert(inserts as never, { onConflict: 'contact_id,source,external_id', ignoreDuplicates: true })
        .select('id');
      if (error) throw error;
      return { count: data?.length ?? 0 };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...KEY, vars.contactId] });
    },
  });
}
