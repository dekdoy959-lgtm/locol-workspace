import type { Database } from './database';

export type OrgRow = Database['public']['Tables']['organizations']['Row'];
export type OrgInsert = Database['public']['Tables']['organizations']['Insert'];
export type OrgUpdate = Database['public']['Tables']['organizations']['Update'];

export const ORG_TYPE_OPTIONS = [
  { value: 'Company', label: 'Company' },
  { value: 'Startup', label: 'Startup' },
  { value: 'NGO', label: 'NGO' },
  { value: 'Government', label: 'Government' },
  { value: 'University', label: 'University' },
  { value: 'Foundation', label: 'Foundation' },
  { value: 'Media', label: 'Media' },
  { value: 'Other', label: 'Other' },
];

export const ORG_SIZE_OPTIONS = [
  { value: '1-10', label: '1–10' },
  { value: '11-50', label: '11–50' },
  { value: '51-200', label: '51–200' },
  { value: '201-500', label: '201–500' },
  { value: '501-1000', label: '501–1,000' },
  { value: '1000+', label: '1,000+' },
];

export const OUR_TIER_OPTIONS = [
  { value: '1', label: 'T1 · Strategic' },
  { value: '2', label: 'T2 · Active' },
  { value: '3', label: 'T3 · Watch' },
];

export function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}
