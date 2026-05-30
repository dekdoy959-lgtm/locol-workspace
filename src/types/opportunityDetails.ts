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

  event: [
    // ─── Dates + venue ──────────────────────────────
    { key: 'event_date_start',      label: 'Start Date',           type: 'date',     helpText: 'วันจัดงาน' },
    { key: 'event_date_end',        label: 'End Date',             type: 'date',     helpText: 'ถ้าเป็นวันเดียวเว้นไว้' },
    { key: 'event_time',            label: 'Time',                 type: 'text',     placeholder: '14:00 - 17:00' },
    { key: 'registration_deadline', label: 'Registration Deadline', type: 'date',   helpText: 'วันสุดท้ายของการลงทะเบียน (อาจต่างจาก event date)' },
    { key: 'location',              label: 'Location / Venue',     type: 'text',     placeholder: 'BITEC Hall 5 · Online · ฯลฯ' },
    { key: 'format',                label: 'Format',               type: 'select',   options: ['Online', 'Offline', 'Hybrid'] },
    { key: 'jurisdiction',          label: 'Region',               type: 'select',   options: ['Thailand', 'APAC', 'Global', 'US', 'EU', 'UK', 'Other'] },
    { key: 'cost',                  label: 'Cost per Person',      type: 'number',   placeholder: '0 = ฟรี' },
    { key: 'currency',              label: 'Currency',             type: 'select',   options: ['THB', 'USD', 'EUR', 'JPY', 'GBP'] },
    { key: 'capacity',              label: 'Capacity',             type: 'number',   placeholder: 'จำนวนผู้เข้าร่วม' },
    { key: 'dress_code',            label: 'Dress Code',           type: 'text',     placeholder: 'Smart casual / Business / ...' },
    { key: 'rsvp_url',              label: 'RSVP / Register URL',  type: 'url' },
    { key: 'organizer',             label: 'Organizer',            type: 'text',     placeholder: 'ผู้จัด (ถ้าไม่ใช่ org ในระบบ)' },
    // ─── Marketing brief (visible to marketing team) ──
    { key: 'agenda',                label: '📋 Agenda',             type: 'textarea', placeholder: '08:00 ลงทะเบียน\n09:00 keynote\n10:30 ...', helpText: 'รันดาวน์ของงาน · marketing ใช้ plan timing post' },
    { key: 'locol_responsibilities', label: '🎯 สิ่งที่ LOCOL ต้องทำ', type: 'textarea', placeholder: 'เปิดบูธ · พูด keynote · นั่งโต๊ะ judge · ...', helpText: 'หน้าที่ของเราในงาน' },
    { key: 'goals',                  label: '🚀 เป้าหมายของ LOCOL', type: 'textarea', placeholder: 'เก็บ 50 leads · สร้าง awareness ใน segment X · ปิดดีลกับพาร์ตเนอร์', helpText: 'KPI ที่อยากได้กลับมาจากงาน' },
    { key: 'ideas',                  label: '💡 Idea ที่คิดไว้',     type: 'textarea', placeholder: 'รูปคู่กับวัวบนเวที · ทำ giveaway · QR code → จับสลาก' },
    { key: 'credit_required',        label: 'ต้องให้เครดิตไหม',     type: 'select',   options: ['ไม่ต้อง', 'ต้อง'] },
    { key: 'credit_to',              label: '🙏 เครดิตให้ใคร',       type: 'text',     placeholder: 'ชื่อคน / สถาบัน · ใช้ใน content', helpText: 'ถ้าตอบ "ต้อง" ด้านบน' },
    { key: 'content_assets_needed',  label: '🎨 สื่อที่ต้องเตรียม', type: 'textarea', placeholder: 'ใบปลิว · brochure · video loop · banner', helpText: 'marketing เตรียมล่วงหน้า' },
    { key: 'shot_list',              label: '📸 Shot List',          type: 'textarea', placeholder: 'รูปบูธ · รูปกับ keynote · interview สั้น · BTS' },
    { key: 'social_media_plan',      label: '📱 Social Media Plan',  type: 'textarea', placeholder: 'pre: T-7 post คอนเทนต์ build-up\nduring: live story\npost: recap reel + lead nurture' },
    { key: 'hashtags',               label: '#️⃣ Hashtags + mentions', type: 'text',  placeholder: '#LOCOL #SIALAsia · @sialasia @partnerco' },
  ],

  trip: [
    // ─── Dates + place ──────────────────────────────
    { key: 'trip_date_start',  label: 'วันที่ไป',           type: 'date' },
    { key: 'trip_date_end',    label: 'วันที่กลับ',          type: 'date',     helpText: 'ถ้าเป็นวันเดียวเว้นไว้' },
    { key: 'farm_name',        label: '🐄 ชื่อฟาร์ม',        type: 'text',     placeholder: 'ฟาร์มก. · บ้านหนองหิน' },
    { key: 'location_name',    label: '📍 ชื่อสถานที่',     type: 'text',     placeholder: 'อ.เชียงดาว · บ้านวัวดอย · ฯลฯ' },
    { key: 'province',         label: '🗺 จังหวัด',          type: 'text',     placeholder: 'เชียงราย · พิจิตร · เลย' },
    { key: 'farm_owner_name',  label: '👤 ชื่อเจ้าของฟาร์ม', type: 'text',     placeholder: 'คุณ ก' },
    { key: 'farm_owner_phone', label: 'เบอร์โทร',           type: 'tel',      placeholder: '08x-xxx-xxxx' },
    // ─── Purpose ─────────────────────────────────────
    { key: 'purpose',          label: '🎯 วัตถุประสงค์',     type: 'textarea', placeholder: 'ทำไมต้องไป · LOCOL ไปทำอะไรกับเขา', helpText: 'รายละเอียดที่ LOCOL ไปทำกับเค้า / วัตถุประสงค์ในการไป' },
    { key: 'agenda',           label: '📋 Agenda',           type: 'textarea', placeholder: '07:00 ออกเดินทาง\n10:00 ถึงฟาร์ม\n10:30 ตรวจ ...', helpText: 'แผนวัน · marketing ใช้ plan shot' },
    { key: 'emphasis',         label: '⭐ สิ่งที่อยากเน้น',  type: 'textarea', placeholder: 'methane reduction · cocoa-fed cattle · sustainability story', helpText: 'มุมที่อยากเน้นในการสื่อสาร' },
    // ─── Marketing brief ────────────────────────────
    { key: 'storytelling_angle', label: '🎬 Storytelling angle', type: 'textarea', placeholder: 'narrative ที่จะใช้ทำ content · เน้น human story · เกษตรกร x technology' },
    { key: 'shot_list',          label: '📸 Shot List',          type: 'textarea', placeholder: 'รูปฟาร์ม · รูปวัว · รูป owner · BTS การทำงาน · drone shot' },
    { key: 'credit_required',    label: 'ต้องให้เครดิตไหม',     type: 'select',   options: ['ไม่ต้อง', 'ต้อง'] },
    { key: 'credit_to',          label: '🙏 เครดิตให้ใคร',       type: 'text',     placeholder: 'ชื่อคน / สถาบัน · ใช้ใน content', helpText: 'ถ้าตอบ "ต้อง" ด้านบน' },
    { key: 'consent_status',     label: '✅ ขออนุญาตถ่ายแล้วยัง', type: 'select', options: ['ยังไม่ได้ขอ', 'ขอแล้ว · ได้', 'ขอแล้ว · ไม่ได้', 'ไม่ต้องขอ'] },
    // ─── Logistics ──────────────────────────────────
    { key: 'transport',          label: '🚗 Transport',           type: 'text',     placeholder: 'รถบริษัท · เครื่องบิน + เช่ารถ · ฯลฯ' },
    { key: 'accommodation',      label: '🏨 ที่พัก',              type: 'text',     placeholder: 'โรงแรม XYZ · บ้านพักฟาร์ม' },
    { key: 'estimated_cost',     label: '💰 ค่าใช้จ่ายประมาณ',   type: 'number',   placeholder: '0' },
    { key: 'currency',           label: 'Currency',              type: 'select',   options: ['THB', 'USD', 'EUR', 'JPY', 'GBP'] },
    { key: 'equipment_list',     label: '🎒 อุปกรณ์ที่เอาไป',     type: 'textarea', placeholder: 'กล้อง · drone · ขาตั้ง · mic · battery · sample bag' },
    { key: 'notes',              label: '📝 หมายเหตุ',            type: 'textarea', placeholder: 'หมายเหตุอื่น ๆ' },
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
