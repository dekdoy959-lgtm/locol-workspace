import { colors } from '../styles/tokens';
import type { Database } from './database';

export type OppPersonRow = Database['public']['Tables']['opportunity_people']['Row'];
export type OppPersonInsert = Database['public']['Tables']['opportunity_people']['Insert'];

export type ParticipantStatus = 'VVIP' | 'Invitee' | 'Audience' | 'Speaker' | 'Sponsor' | 'Other';
export type ParticipantRole = 'organizer' | 'attendee';

export const STATUS_OPTIONS: { value: ParticipantStatus; label: string; color: string }[] = [
  { value: 'VVIP',     label: '⭐ VVIP',     color: colors.warn },
  { value: 'Speaker',  label: '🎤 Speaker',  color: colors.green },
  { value: 'Invitee',  label: '✉ Invitee',  color: colors.olive },
  { value: 'Sponsor',  label: '💰 Sponsor',  color: colors.danger },
  { value: 'Audience', label: '👥 Audience', color: colors.surface },
  { value: 'Other',    label: 'Other',       color: colors.dim },
];

export function findStatusMeta(status: string | null): { color: string; label: string } | null {
  if (!status) return null;
  const m = STATUS_OPTIONS.find((s) => s.value === status);
  return m ? { color: m.color, label: m.label } : null;
}
