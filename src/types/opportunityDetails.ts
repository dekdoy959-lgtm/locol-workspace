// Per-track opportunity detail field specs.
// Each track has its own set of structured fields, stored in opportunities.details (jsonb).

import type { TrackKey } from './opportunity';

export type DetailFieldType = 'text' | 'number' | 'textarea' | 'url' | 'date' | 'select' | 'tel' | 'org_picker';

/** Shape stored in details JSONB when type is 'org_picker' */
export interface OrgPickerValue {
  org_id: string | null;
  org_name: string;
}

export function normalizeOrgPickerValue(raw: unknown): OrgPickerValue {
  if (raw === null || raw === undefined || raw === '') return { org_id: null, org_name: '' };
  if (typeof raw === 'string') return { org_id: null, org_name: raw };
  if (typeof raw === 'object' && raw !== null && 'org_name' in raw) {
    const r = raw as { org_id?: string | null; org_name?: string };
    return { org_id: r.org_id ?? null, org_name: r.org_name ?? '' };
  }
  return { org_id: null, org_name: '' };
}

export interface DetailFieldSpec {
  key: string;
  label: string;
  type: DetailFieldType;
  placeholder?: string;
  options?: string[];
  prefix?: string; // e.g. currency symbol
  helpText?: string;
}

export const TRACK_DETAILS: Record<TrackKey, DetailFieldSpec[]> = {
  apply: [
    { key: 'sponsor',              label: 'Sponsor / Funder',     type: 'org_picker', helpText: 'เชื่อมกับ Organization · เลือกเดิม หรือสร้างใหม่' },
    { key: 'program_name',         label: 'Program / Call Name',  type: 'text',     placeholder: 'เช่น Spring 2026 Cohort' },
    { key: 'jurisdiction',         label: 'Jurisdiction / Region', type: 'select',  options: ['Thailand', 'APAC', 'Global', 'US', 'EU', 'UK', 'Other'] },
    { key: 'ask_amount',           label: 'Ask Amount',           type: 'number',   placeholder: '0' },
    { key: 'currency',             label: 'Currency',             type: 'select',   options: ['THB', 'USD', 'EUR', 'JPY', 'GBP'] },
    { key: 'eligibility',          label: 'Eligibility',          type: 'textarea', placeholder: 'ใครสมัครได้ · ข้อจำกัด' },
    { key: 'required_docs',        label: 'Required Documents',   type: 'textarea', placeholder: 'รายการเอกสารที่ต้องเตรียม' },
    { key: 'submission_url',       label: 'Submission URL',       type: 'url',      placeholder: 'https://...' },
    { key: 'application_deadline', label: 'Application Deadline', type: 'date',     helpText: 'วันสุดท้ายของการสมัคร (= due_date)' },
    { key: 'decision_date',        label: 'Decision Date',        type: 'date',     helpText: 'วันที่คาดว่าจะรู้ผล' },
    { key: 'eligibility_status',   label: 'Our Eligibility',      type: 'select',   options: ['Eligible', 'Ineligible — Template Only', 'Need Partner', 'Unclear'] },
  ],

  act: [
    { key: 'action_type',     label: 'Action Type',          type: 'select',   options: ['Memo', 'Comment', 'Review', 'Reply', 'Sign-off', 'Other'] },
    { key: 'to_whom',         label: 'To Whom',              type: 'text',     placeholder: 'ใครเป็นผู้รับ' },
    { key: 'jurisdiction',    label: 'Jurisdiction',         type: 'select',   options: ['Thailand', 'APAC', 'Global', 'US', 'EU', 'UK', 'Other'] },
    { key: 'artefact_link',   label: 'Artefact / Output Link', type: 'url',    placeholder: 'https://docs.google.com/...' },
    { key: 'context_note',    label: 'Context',              type: 'textarea', placeholder: 'อยู่ในบริบทไหน · ทำไมต้องทำ' },
  ],

  watch: [
    { key: 'category',        label: 'News Category',        type: 'select',
      options: ['Regulation', 'Industry News', 'Research', 'Market', 'Competitor', 'Technology', 'Risk Signal', 'Supply Chain', 'Policy Change', 'Other'] },
    { key: 'jurisdiction',    label: 'Jurisdiction / Region', type: 'select',  options: ['Thailand', 'APAC', 'Global', 'US', 'EU', 'UK', 'Other'] },
    { key: 'published_date',  label: 'Published Date',       type: 'date',     helpText: 'วันที่บทความถูกเผยแพร่ (ช่วยดู age/freshness)' },
    { key: 'news_source',     label: 'News Source',          type: 'text',     placeholder: 'Carbon Pulse · AgFunder · Reuters · ฯลฯ' },
    { key: 'takeaway',        label: 'Key Takeaway (1 line)', type: 'textarea', placeholder: 'ใจความสำคัญสั้นๆ' },
    { key: 'topic_tags',      label: 'Topic Tags',           type: 'text',     placeholder: 'methane, cattle, asia · (คั่นด้วย comma)' },
    { key: 'relevance',       label: 'Why Relevant',         type: 'textarea', placeholder: 'เกี่ยวข้องกับเรายังไง' },
    { key: 'related_companies', label: 'Related Companies',  type: 'text',     placeholder: 'CH4 Global, dsm-firmenich · (คั่นด้วย comma)' },
  ],

  contract: [
    { key: 'counterparty',    label: 'Counterparty',         type: 'org_picker', helpText: 'เชื่อมกับ Organization · เลือกเดิม หรือสร้างใหม่' },
    { key: 'jurisdiction',    label: 'Jurisdiction',         type: 'select',   options: ['Thailand', 'APAC', 'Global', 'US', 'EU', 'UK', 'Other'] },
    { key: 'contract_value',  label: 'Contract Value',       type: 'number',   placeholder: '0' },
    { key: 'currency',        label: 'Currency',             type: 'select',   options: ['THB', 'USD', 'EUR', 'JPY', 'GBP'] },
    { key: 'term_months',     label: 'Term (months)',        type: 'number',   placeholder: 'เช่น 12' },
    { key: 'effective_date',  label: 'Effective Date',       type: 'date' },
    { key: 'renewal_date',    label: 'Renewal Date',         type: 'date',     helpText: 'ระบบจะเตือน 90/30/7 d ก่อน renewal' },
    { key: 'auto_renew',      label: 'Auto-Renew',           type: 'select',   options: ['Yes', 'No', 'Unknown'] },
    { key: 'key_terms',       label: 'Key Terms / Notes',    type: 'textarea', placeholder: 'IP · payment terms · exit clause' },
  ],

  event: [
    { key: 'event_date_start',     label: 'Start Date',           type: 'date' },
    { key: 'event_date_end',       label: 'End Date',             type: 'date',     helpText: 'ถ้าเป็นวันเดียวเว้นไว้' },
    { key: 'event_time',           label: 'Time',                 type: 'text',     placeholder: '14:00 - 17:00' },
    { key: 'registration_deadline', label: 'Registration Deadline', type: 'date',   helpText: 'วันสุดท้ายของการลงทะเบียน (อาจต่างจาก event date)' },
    { key: 'jurisdiction',         label: 'Region',               type: 'select',   options: ['Thailand', 'APAC', 'Global', 'US', 'EU', 'UK', 'Other'] },
    { key: 'location',             label: 'Location / Venue',     type: 'text',     placeholder: 'BITEC Hall 5 · Online · ฯลฯ' },
    { key: 'format',               label: 'Format',               type: 'select',   options: ['Online', 'Offline', 'Hybrid'] },
    { key: 'cost',                 label: 'Cost per Person',      type: 'number',   placeholder: '0 = ฟรี' },
    { key: 'currency',             label: 'Currency',             type: 'select',   options: ['THB', 'USD', 'EUR', 'JPY', 'GBP'] },
    { key: 'capacity',             label: 'Capacity',             type: 'number',   placeholder: 'จำนวนผู้เข้าร่วม' },
    { key: 'dress_code',           label: 'Dress Code',           type: 'text',     placeholder: 'Smart casual / Business / ...' },
    { key: 'rsvp_url',             label: 'RSVP / Register URL',  type: 'url' },
    { key: 'organizer',            label: 'Organizer',            type: 'text',     placeholder: 'ผู้จัด (ถ้าไม่ใช่ org ในระบบ)' },
  ],
};

export function getDetailValue(details: Record<string, unknown> | null | undefined, key: string): string {
  if (!details) return '';
  const v = details[key];
  if (v === null || v === undefined) return '';
  return String(v);
}

export function formatCurrency(amount: number | string, currency: string = 'THB'): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) return String(amount);
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency, maximumFractionDigits: 0 }).format(num);
}
