import type { Database } from './database';

export type OppPersonRow = Database['public']['Tables']['opportunity_people']['Row'];
export type OppPersonInsert = Database['public']['Tables']['opportunity_people']['Insert'];

export type ParticipantStatus = 'VVIP' | 'Invitee' | 'Audience' | 'Speaker' | 'Sponsor' | 'Other';
export type ParticipantRole = 'organizer' | 'attendee';

export const STATUS_OPTIONS: { value: ParticipantStatus; label: string; color: string }[] = [
  { value: 'VVIP',     label: '⭐ VVIP',     color: '#E8B923' },
  { value: 'Speaker',  label: '🎤 Speaker',  color: '#99CE24' },
  { value: 'Invitee',  label: '✉ Invitee',  color: '#9aa56a' },
  { value: 'Sponsor',  label: '💰 Sponsor',  color: '#d96a66' },
  { value: 'Audience', label: '👥 Audience', color: '#D9D9D9' },
  { value: 'Other',    label: 'Other',       color: '#747474' },
];

export function findStatusMeta(status: string | null): { color: string; label: string } | null {
  if (!status) return null;
  const m = STATUS_OPTIONS.find((s) => s.value === status);
  return m ? { color: m.color, label: m.label } : null;
}
