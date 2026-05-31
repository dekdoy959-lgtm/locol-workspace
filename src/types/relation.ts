import { colors } from '../styles/tokens';
import type { Database } from './database';

export type RelationRow = Database['public']['Tables']['relations']['Row'];
export type RelationInsert = Database['public']['Tables']['relations']['Insert'];
export type RelationUpdate = Database['public']['Tables']['relations']['Update'];

export interface RelationType {
  value: string;
  label: string;
  /** Edge color for the relationship graph */
  color: string;
  /** Edge style: solid / dashed / dotted */
  style: 'solid' | 'dashed' | 'dotted';
  /** Whether the relation is symmetric (introduced by ↔ introduced to) */
  inverse?: string;
}

export const RELATION_TYPES: RelationType[] = [
  { value: 'introduced-by', label: 'แนะนำโดย · Introduced by', color: colors.green, style: 'solid', inverse: 'introduced-to' },
  { value: 'introduced-to', label: 'แนะนำให้ · Introduced to', color: colors.green, style: 'solid', inverse: 'introduced-by' },
  { value: 'coworker', label: 'เพื่อนร่วมงาน · Coworker', color: colors.olive, style: 'solid' },
  { value: 'co-founder', label: 'Co-founder', color: colors.olive, style: 'solid' },
  { value: 'co-panel', label: 'Co-panel', color: colors.warn, style: 'dashed' },
  { value: 'knows-well', label: 'รู้จักดี · Knows well', color: colors.surface, style: 'dotted' },
  { value: 'family', label: 'ครอบครัว · Family', color: colors.danger, style: 'solid' },
  { value: 'married-to', label: 'คู่สมรส · Married to', color: colors.danger, style: 'solid' },
  { value: 'mentor', label: 'Mentor · ที่ปรึกษา', color: colors.warn, style: 'solid' },
  { value: 'investor', label: 'นักลงทุน · Investor', color: colors.warn, style: 'solid' },
  { value: 'client', label: 'ลูกค้า · Client', color: colors.olive, style: 'solid', inverse: 'vendor' },
  { value: 'vendor', label: 'Vendor · Supplier', color: colors.olive, style: 'solid', inverse: 'client' },
  { value: 'other', label: 'อื่นๆ · Other', color: colors.dim, style: 'solid' },
];

export function findRelationType(value: string): RelationType {
  return RELATION_TYPES.find((t) => t.value === value) ?? RELATION_TYPES[RELATION_TYPES.length - 1];
}

export const RELATION_TYPE_OPTIONS = RELATION_TYPES.map((t) => ({ value: t.value, label: t.label }));
