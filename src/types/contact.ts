import { colors } from '../styles/tokens';
import type { Database } from './database';

export type ContactRow = Database['public']['Tables']['contacts']['Row'];
export type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
export type ContactUpdate = Database['public']['Tables']['contacts']['Update'];

export interface PhoneEntry {
  label: string;
  value: string;
}

export interface EmailEntry {
  label: string;
  value: string;
}

// Old format (kept for backwards compatibility on read)
export interface AddressEntryOld {
  label: string;
  value: string;
}

// New structured format (Thai-friendly)
export interface AddressEntry {
  label: string;
  country: string;
  province: string;
  district: string;       // อำเภอ / เขต
  sub_district: string;   // ตำบล / แขวง
  postal_code: string;
  street: string;
  // Legacy support
  value?: string;
}

export interface SocialEntry {
  platform: string;
  handle: string;
  url: string | null;
}

export interface OrgEntry {
  org_id: string | null;
  org_name: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  is_primary: boolean;
}

export interface EducationEntry {
  school: string;
  degree: string | null;
  year: number | null;
}

export const TIER_OPTIONS = [
  { value: '1', label: 'T1 · Inner' },
  { value: '2', label: 'T2 · Active' },
  { value: '3', label: 'T3 · Wide' },
];

export const TIE_TYPE_OPTIONS = [
  { value: 'Strong', label: 'Strong' },
  { value: 'Bridge', label: 'Bridge' },
  { value: 'Weak', label: 'Weak' },
];

export const PRIORITY_OPTIONS = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export type RelationshipStatus = 'known' | 'prospect' | 'cold' | 'archived';

export const RELATIONSHIP_STATUS_OPTIONS = [
  { value: 'known',    label: '🟢 รู้จัก · Known' },
  { value: 'prospect', label: '🟡 อยากรู้จัก · Prospect' },
  { value: 'cold',     label: '⚪ ไม่รู้จัก · Cold' },
  { value: 'archived', label: '⚫ Archived' },
];

export const RELATIONSHIP_STATUS_META: Record<RelationshipStatus, { color: string; bg: string; border: string; label: string }> = {
  known:    { color: '#99CE24', bg: colors.greenBg, border: '#6e9618', label: 'รู้จัก' },
  prospect: { color: colors.warn, bg: colors.warnBg, border: colors.warnDk, label: 'Prospect' },
  cold:     { color: '#9a9a9a', bg: '#1c1c1c', border: '#3a3a3a', label: 'Cold' },
  archived: { color: '#747474', bg: '#181818', border: '#2a2a2a', label: 'Archived' },
};

export const PHONE_LABEL_OPTIONS = [
  { value: 'Mobile', label: 'Mobile' },
  { value: 'Work', label: 'Work' },
  { value: 'Home', label: 'Home' },
  { value: 'Other', label: 'Other' },
];

export const EMAIL_LABEL_OPTIONS = [
  { value: 'Personal', label: 'Personal' },
  { value: 'Work', label: 'Work' },
  { value: 'Other', label: 'Other' },
];

export const ADDRESS_LABEL_OPTIONS = [
  { value: 'Home', label: 'Home' },
  { value: 'Work', label: 'Work' },
  { value: 'Other', label: 'Other' },
];

export const CHANNEL_OPTIONS = [
  { value: 'Line', label: 'Line' },
  { value: 'Email', label: 'Email' },
  { value: 'Phone', label: 'Phone' },
  { value: 'SMS', label: 'SMS' },
  { value: 'Facebook Messenger', label: 'Facebook Messenger' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'WeChat', label: 'WeChat' },
  { value: 'In Person', label: 'In Person' },
  { value: 'Other', label: 'Other' },
];

export const FREQ_UNIT_OPTIONS = [
  { value: 'days', label: 'วัน' },
  { value: 'weeks', label: 'สัปดาห์' },
  { value: 'months', label: 'เดือน' },
  { value: 'years', label: 'ปี' },
];

export const FREQ_UNIT_DAYS = {
  days: 1,
  weeks: 7,
  months: 30,
  years: 365,
} as const;

export type FreqUnit = keyof typeof FREQ_UNIT_DAYS;

export function freqToDays(value: number, unit: FreqUnit): number {
  return Math.round(value * FREQ_UNIT_DAYS[unit]);
}

export function daysToFreq(days: number, unit: FreqUnit): number {
  return Math.round((days / FREQ_UNIT_DAYS[unit]) * 10) / 10;
}

export function formatAddress(a: AddressEntry): string {
  if (a.value && !a.province && !a.district) return a.value;
  const parts = [a.street, a.sub_district, a.district, a.province, a.postal_code, a.country].filter(Boolean);
  return parts.join(', ');
}

export const SOCIAL_PLATFORM_OPTIONS = [
  { value: 'Line', label: 'Line' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'X (Twitter)', label: 'X (Twitter)' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'WeChat', label: 'WeChat' },
  { value: 'Other', label: 'Other' },
];

export function contactDisplayName(c: Pick<ContactRow, 'first_name' | 'last_name' | 'nick_name'>): string {
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ');
  return c.nick_name ? `${full} (${c.nick_name})` : full;
}

export function contactInitials(c: Pick<ContactRow, 'first_name' | 'last_name'>): string {
  const f = c.first_name?.[0] ?? '';
  const l = c.last_name?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}
