// Smart group rule engine.
// Rules are stored as JSONB in `groups.rule` and evaluated client-side
// against contacts to produce a dynamic member list.

import type { ContactRow } from '../types/contact';

// ─── Rule schema ─────────────────────────────────────────────────────────────

export type RuleOp =
  | 'eq' | 'neq' | 'is_set' | 'is_unset'
  | 'contains' | 'not_contains' | 'starts_with'
  | 'gt' | 'lt' | 'gte' | 'lte' | 'between'
  | 'in' | 'not_in';

export interface LeafRule {
  field: string;
  op: RuleOp;
  value?: unknown;
  values?: unknown[]; // for `in` / `not_in` / `between`
}

export interface CombinatorRule {
  combinator: 'all' | 'any';
  rules: Rule[];
}

export type Rule = LeafRule | CombinatorRule;

export function isCombinator(r: Rule): r is CombinatorRule {
  return 'combinator' in r;
}

export const EMPTY_RULE: CombinatorRule = { combinator: 'all', rules: [] };

// ─── Field registry ──────────────────────────────────────────────────────────

export type FieldType = 'enum' | 'text' | 'number' | 'array' | 'boolean' | 'date';

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  /** For enum fields */
  options?: { value: string | number; label: string }[];
  /** Function to extract the raw value from a contact row */
  extract: (c: ContactRow) => unknown;
}

export const CONTACT_FIELDS: FieldSpec[] = [
  {
    key: 'tier',
    label: 'Tier',
    type: 'enum',
    options: [
      { value: 1, label: 'T1 · Inner' },
      { value: 2, label: 'T2 · Active' },
      { value: 3, label: 'T3 · Wide' },
    ],
    extract: (c) => c.tier,
  },
  {
    key: 'relationship_status',
    label: 'Relationship',
    type: 'enum',
    options: [
      { value: 'known', label: 'Known' },
      { value: 'prospect', label: 'Prospect' },
      { value: 'cold', label: 'Cold' },
      { value: 'archived', label: 'Archived' },
    ],
    extract: (c) => c.relationship_status,
  },
  {
    key: 'tie_type',
    label: 'Tie Type',
    type: 'enum',
    options: [
      { value: 'Strong', label: 'Strong' },
      { value: 'Bridge', label: 'Bridge' },
      { value: 'Weak', label: 'Weak' },
    ],
    extract: (c) => c.tie_type,
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'enum',
    options: [
      { value: 'High', label: 'High' },
      { value: 'Medium', label: 'Medium' },
      { value: 'Low', label: 'Low' },
    ],
    extract: (c) => c.priority,
  },
  {
    key: 'channel',
    label: 'Preferred Channel',
    type: 'enum',
    options: [
      { value: 'Line', label: 'Line' },
      { value: 'Email', label: 'Email' },
      { value: 'Phone', label: 'Phone' },
      { value: 'SMS', label: 'SMS' },
      { value: 'In Person', label: 'In Person' },
    ],
    extract: (c) => c.channel,
  },
  {
    key: 'health',
    label: 'Health',
    type: 'enum',
    options: [
      { value: 'On Track', label: 'On Track' },
      { value: 'Watch', label: 'Watch' },
      { value: 'Going Cold', label: 'Going Cold' },
      { value: 'Overdue', label: 'Overdue' },
    ],
    extract: (c) => c.health,
  },
  {
    key: 'tags',
    label: 'Tags',
    type: 'array',
    extract: (c) => c.tags ?? [],
  },
  {
    key: 'freq_days',
    label: 'Contact Frequency (days)',
    type: 'number',
    extract: (c) => c.freq_days,
  },
  {
    key: 'has_email',
    label: 'Has Email',
    type: 'boolean',
    extract: (c) => Array.isArray(c.emails) && c.emails.length > 0,
  },
  {
    key: 'has_phone',
    label: 'Has Phone',
    type: 'boolean',
    extract: (c) => Array.isArray(c.phones) && c.phones.length > 0,
  },
  {
    key: 'has_avatar',
    label: 'Has Avatar',
    type: 'boolean',
    extract: (c) => !!c.avatar_url,
  },
  {
    key: 'birthday_notification_enabled',
    label: 'Birthday Alert On',
    type: 'boolean',
    extract: (c) => c.birthday_notification_enabled,
  },
];

export function findField(key: string): FieldSpec | undefined {
  return CONTACT_FIELDS.find((f) => f.key === key);
}

export const OPS_BY_TYPE: Record<FieldType, { value: RuleOp; label: string }[]> = {
  enum: [
    { value: 'eq', label: 'เป็น (=)' },
    { value: 'neq', label: 'ไม่เป็น (≠)' },
    { value: 'in', label: 'อยู่ใน' },
    { value: 'is_set', label: 'มีค่า' },
    { value: 'is_unset', label: 'ไม่มีค่า' },
  ],
  text: [
    { value: 'eq', label: 'เท่ากับ' },
    { value: 'contains', label: 'มีคำว่า' },
    { value: 'starts_with', label: 'ขึ้นต้นด้วย' },
    { value: 'is_set', label: 'มีค่า' },
    { value: 'is_unset', label: 'ว่าง' },
  ],
  number: [
    { value: 'eq', label: 'เท่ากับ (=)' },
    { value: 'gt', label: 'มากกว่า (>)' },
    { value: 'lt', label: 'น้อยกว่า (<)' },
    { value: 'gte', label: 'มากกว่าหรือเท่ากับ (≥)' },
    { value: 'lte', label: 'น้อยกว่าหรือเท่ากับ (≤)' },
    { value: 'between', label: 'ระหว่าง' },
    { value: 'is_set', label: 'มีค่า' },
  ],
  array: [
    { value: 'contains', label: 'มี' },
    { value: 'not_contains', label: 'ไม่มี' },
  ],
  boolean: [
    { value: 'eq', label: 'เป็น' },
  ],
  date: [
    { value: 'eq', label: 'วันที่' },
    { value: 'gt', label: 'หลัง' },
    { value: 'lt', label: 'ก่อน' },
    { value: 'is_set', label: 'มีค่า' },
    { value: 'is_unset', label: 'ว่าง' },
  ],
};

// ─── Evaluator ───────────────────────────────────────────────────────────────

function evalLeaf(leaf: LeafRule, c: ContactRow): boolean {
  const field = findField(leaf.field);
  if (!field) return false;
  const v = field.extract(c);

  switch (leaf.op) {
    case 'is_set':
      return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
    case 'is_unset':
      return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
    case 'eq':
      return v === leaf.value;
    case 'neq':
      return v !== leaf.value;
    case 'in':
      return Array.isArray(leaf.values) && leaf.values.some((x) => x === v);
    case 'not_in':
      return Array.isArray(leaf.values) && !leaf.values.some((x) => x === v);
    case 'contains':
      if (Array.isArray(v)) return v.some((x) => x === leaf.value);
      if (typeof v === 'string') return v.toLowerCase().includes(String(leaf.value).toLowerCase());
      return false;
    case 'not_contains':
      if (Array.isArray(v)) return !v.some((x) => x === leaf.value);
      return false;
    case 'starts_with':
      return typeof v === 'string' && v.toLowerCase().startsWith(String(leaf.value).toLowerCase());
    case 'gt':
      return typeof v === 'number' && v > Number(leaf.value);
    case 'lt':
      return typeof v === 'number' && v < Number(leaf.value);
    case 'gte':
      return typeof v === 'number' && v >= Number(leaf.value);
    case 'lte':
      return typeof v === 'number' && v <= Number(leaf.value);
    case 'between': {
      if (typeof v !== 'number' || !Array.isArray(leaf.values) || leaf.values.length !== 2) return false;
      const [lo, hi] = leaf.values.map(Number);
      return v >= lo && v <= hi;
    }
    default:
      return false;
  }
}

export function evaluateRule(rule: Rule | null | undefined, c: ContactRow): boolean {
  if (!rule) return false; // changed: no rule should NEVER match everyone (was returning true)
  if (isCombinator(rule)) {
    // Empty combinator should return false ('all' of nothing = vacuous true is
    // dangerous; same for 'any' of nothing). UI should hide groups with empty
    // rules anyway, but defending here too.
    if (rule.rules.length === 0) return false;
    if (rule.combinator === 'all') return rule.rules.every((r) => evaluateRule(r, c));
    return rule.rules.some((r) => evaluateRule(r, c));
  }
  return evalLeaf(rule, c);
}

export function matchContacts(rule: Rule | null | undefined, contacts: ContactRow[]): ContactRow[] {
  if (!rule) return [];
  // Same guard at the top level — empty rule means "no smart group rule set" not "match all"
  if (isCombinator(rule) && rule.rules.length === 0) return [];
  return contacts.filter((c) => evaluateRule(rule, c));
}

// ─── Rule summary (human-readable) ───────────────────────────────────────────

function summarizeLeaf(leaf: LeafRule): string {
  const field = findField(leaf.field);
  const fieldLabel = field?.label ?? leaf.field;
  const opLabel = OPS_BY_TYPE[field?.type ?? 'text'].find((o) => o.value === leaf.op)?.label ?? leaf.op;

  if (leaf.op === 'is_set' || leaf.op === 'is_unset') return `${fieldLabel} ${opLabel}`;
  if (leaf.op === 'between' && Array.isArray(leaf.values)) {
    return `${fieldLabel} ${opLabel} ${leaf.values[0]}–${leaf.values[1]}`;
  }
  if (leaf.op === 'in' && Array.isArray(leaf.values)) {
    return `${fieldLabel} ${opLabel} [${leaf.values.join(', ')}]`;
  }
  return `${fieldLabel} ${opLabel} ${String(leaf.value ?? '')}`;
}

export function summarizeRule(rule: Rule | null | undefined): string {
  if (!rule) return 'ไม่มี rule';
  if (isCombinator(rule)) {
    if (rule.rules.length === 0) return 'ไม่มี filter';
    const parts = rule.rules.map(summarizeRule);
    const sep = rule.combinator === 'all' ? ' AND ' : ' OR ';
    return parts.length > 1 ? `(${parts.join(sep)})` : parts[0];
  }
  return summarizeLeaf(rule);
}
