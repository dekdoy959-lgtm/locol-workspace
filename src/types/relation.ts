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
  { value: 'introduced-by', label: 'แนะนำโดย · Introduced by', color: '#99CE24', style: 'solid', inverse: 'introduced-to' },
  { value: 'introduced-to', label: 'แนะนำให้ · Introduced to', color: '#99CE24', style: 'solid', inverse: 'introduced-by' },
  { value: 'coworker', label: 'เพื่อนร่วมงาน · Coworker', color: '#9aa56a', style: 'solid' },
  { value: 'co-founder', label: 'Co-founder', color: '#9aa56a', style: 'solid' },
  { value: 'co-panel', label: 'Co-panel', color: '#E8B923', style: 'dashed' },
  { value: 'knows-well', label: 'รู้จักดี · Knows well', color: '#D9D9D9', style: 'dotted' },
  { value: 'family', label: 'ครอบครัว · Family', color: '#d96a66', style: 'solid' },
  { value: 'married-to', label: 'คู่สมรส · Married to', color: '#d96a66', style: 'solid' },
  { value: 'mentor', label: 'Mentor · ที่ปรึกษา', color: '#E8B923', style: 'solid' },
  { value: 'investor', label: 'นักลงทุน · Investor', color: '#E8B923', style: 'solid' },
  { value: 'client', label: 'ลูกค้า · Client', color: '#9aa56a', style: 'solid' },
  { value: 'vendor', label: 'Vendor · Supplier', color: '#9aa56a', style: 'solid' },
  { value: 'other', label: 'อื่นๆ · Other', color: '#747474', style: 'solid' },
];

export function findRelationType(value: string): RelationType {
  return RELATION_TYPES.find((t) => t.value === value) ?? RELATION_TYPES[RELATION_TYPES.length - 1];
}

export const RELATION_TYPE_OPTIONS = RELATION_TYPES.map((t) => ({ value: t.value, label: t.label }));
