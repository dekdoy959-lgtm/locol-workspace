// Trip Intelligence Briefing — config-driven schema
// Mirrors LOCOL_Trip_Intelligence_Briefing_v1 (Parts A/B/C). The whole document
// is described as data here; <BriefingEditor> renders it generically and stores
// answers in opportunities.briefing (JSONB). Add/edit a field here → it appears
// in the form, no migration needed.

export type TripScope = 'domestic' | 'international';

export type FieldKind = 'text' | 'textarea' | 'select' | 'date';

export interface BriefingField {
  key: string;
  th: string;
  en: string;
  kind: FieldKind;
  options?: string[];
  placeholder?: string;
  /** Shown only for international trips. */
  intlOnly?: boolean;
}

export type SectionKind =
  | 'fields' // flat key → value
  | 'repeatable' // array of blocks
  | 'checklist' // fixed list of {checked, detail}
  | 'objectives' // primary[] / secondary[] / success-criteria
  | 'budget' // category rows with budget/actual
  | 'risk'; // fixed risk-type rows

export interface BriefingSection {
  id: string;
  code: string; // "A1", "B3", …
  th: string;
  en: string;
  note?: string;
  kind: SectionKind;
  fields?: BriefingField[]; // 'fields' + optional preamble for 'objectives'
  blockFields?: BriefingField[]; // 'repeatable'
  blockLabel?: string; // e.g. "Partner", "Site"
  items?: { key: string; th: string; en: string }[]; // 'checklist'
  categories?: { key: string; th: string; en: string; intlOnly?: boolean }[]; // 'budget'
  riskTypes?: { key: string; th: string; en: string }[]; // 'risk'
  intlOnly?: boolean;
}

export interface BriefingPart {
  id: 'A' | 'B' | 'C';
  th: string;
  en: string;
  desc: string;
  sections: BriefingSection[];
}

// ── tiny builders to keep the config readable ────────────────────────
const t = (key: string, th: string, en: string, placeholder?: string): BriefingField => ({ key, th, en, kind: 'text', placeholder });
const ta = (key: string, th: string, en: string, placeholder?: string): BriefingField => ({ key, th, en, kind: 'textarea', placeholder });
const sel = (key: string, th: string, en: string, options: string[]): BriefingField => ({ key, th, en, kind: 'select', options });
const intl = (f: BriefingField): BriefingField => ({ ...f, intlOnly: true });

// ── PART A · Overview (leadership) ───────────────────────────────────
const PART_A: BriefingPart = {
  id: 'A',
  th: 'ภาพรวม',
  en: 'Overview',
  desc: 'สำหรับผู้บริหาร / ทีม LOCOL — สรุปทริป วัตถุประสงค์ Partner & Market',
  sections: [
    {
      id: 'a1', code: 'A1', th: 'Executive Summary', en: 'Executive Summary',
      note: 'สรุปภาพรวมทั้งทริป — อ่านแล้วเข้าใจทันที', kind: 'fields',
      fields: [
        ta('main_objectives', 'วัตถุประสงค์หลัก', 'Main Objectives', '1–2 ประโยค'),
        t('key_deliverables', 'ผลลัพธ์ที่ต้องได้', 'Key Deliverables', 'เช่น LOI, Partner, Data'),
        t('trip_kpis', 'KPI ของทริป', 'Trip KPIs', 'เช่น 1 LOI, 2 partners signed'),
        t('total_budget', 'งบประมาณรวม', 'Total Budget', '฿ / $'),
        ta('strategic_importance', 'ความสำคัญเชิงกลยุทธ์', 'Strategic Importance', 'เชื่อมกับ LOCOL Roadmap'),
      ],
    },
    {
      id: 'a2', code: 'A2', th: 'Strategic Objectives', en: 'Strategic Objectives',
      note: 'ทำไมต้องไป + เป้าหมายที่ต้องสำเร็จ', kind: 'objectives',
      fields: [
        ta('reason', 'เหตุผลที่ต้องเดินทาง', 'Reason for Travel'),
        t('company_goal', 'เชื่อมกับเป้าหมายบริษัท', 'Company Goal Link'),
        t('roadmap', 'เชื่อมกับ Roadmap', 'Roadmap Alignment', 'Phase / Milestone'),
      ],
    },
    {
      id: 'a3', code: 'A3', th: 'Expected Outcomes', en: 'Expected Outcomes',
      kind: 'checklist',
      items: [
        { key: 'loi', th: 'LOI', en: 'LOI' },
        { key: 'customer', th: 'ลูกค้าที่เป็นไปได้', en: 'Potential Customer' },
        { key: 'distributor', th: 'ผู้จัดจำหน่ายที่เป็นไปได้', en: 'Potential Distributor' },
        { key: 'partner', th: 'พาร์ทเนอร์ที่เป็นไปได้', en: 'Potential Partner' },
        { key: 'research', th: 'ข้อมูลวิจัย', en: 'Research Data' },
        { key: 'regulatory', th: 'ข้อมูลกฎระเบียบ', en: 'Regulatory Information' },
        { key: 'market', th: 'Market Validation', en: 'Market Validation' },
        { key: 'trial', th: 'โอกาสทดลอง', en: 'Trial Opportunity' },
        { key: 'investor', th: 'แนะนำนักลงทุน', en: 'Investor Introduction' },
        { key: 'other', th: 'อื่นๆ', en: 'Others' },
      ],
    },
    {
      id: 'a4', code: 'A4', th: 'Partner Intelligence', en: 'Partner Intelligence',
      note: 'ทำซ้ำสำหรับทุก partner', kind: 'repeatable', blockLabel: 'Partner',
      blockFields: [
        t('company_name', 'ชื่อบริษัท', 'Company Name'),
        t('business', 'ธุรกิจหลัก', 'Business'),
        t('size_revenue', 'ขนาด / Revenue', 'Size / Revenue'),
        sel('status', 'สถานะ', 'Status', ['Private', 'Listed', 'SOE']),
        ta('why_meet', 'เหตุผลที่ LOCOL ต้องพบ', 'Why LOCOL Should Meet'),
        sel('current_status', 'สถานะปัจจุบัน', 'Current Status', ['Cold', 'Warm', 'Hot']),
        t('introduced_by', 'ติดต่อผ่านใคร', 'Introduced By'),
        t('contact_name', 'ผู้ติดต่อ', 'Contact Name'),
        t('contact_role', 'ตำแหน่ง', 'Position'),
        t('contact_email', 'Email / Phone', 'Email / Phone'),
        ta('topics', 'หัวข้อที่คุย', 'Discussion Topics'),
        ta('key_questions', 'คำถามหลัก', 'Key Questions'),
        t('desired_outcome', 'Desired Outcome', 'Desired Outcome'),
      ],
    },
    {
      id: 'a5', code: 'A5', th: 'Site Intelligence', en: 'Farm / Factory / Facility',
      note: 'ทำซ้ำสำหรับทุกสถานที่', kind: 'repeatable', blockLabel: 'Site',
      blockFields: [
        t('site_name', 'ชื่อสถานที่', 'Site Name'),
        sel('type', 'ประเภท', 'Type', ['Farm', 'Factory', 'Lab', 'Other']),
        t('size', 'ขนาด', 'Size'),
        t('capacity', 'Capacity', 'Capacity'),
        t('certifications', 'มาตรฐาน', 'Certifications', 'GMP / ISO / GlobalG.A.P.'),
        ta('relevance', 'เกี่ยวข้องกับ LOCOL', 'Relevance to LOCOL'),
        ta('questions', 'คำถามที่ต้องถาม', 'Questions to Ask'),
      ],
    },
    {
      id: 'a6', code: 'A6', th: 'Market Intelligence', en: 'Market Intelligence',
      note: 'ต่างประเทศ: ตลาดปลายทาง · ในประเทศ: ตลาดภูมิภาค', kind: 'fields',
      fields: [
        t('market_size', 'Market Size', 'Market Size'),
        ta('industry', 'ภาพรวมอุตสาหกรรม', 'Industry Overview'),
        t('key_players', 'Key Players', 'Key Players'),
        t('distribution', 'โครงสร้างการจัดจำหน่าย', 'Distribution'),
        t('competitors', 'Competitors', 'Competitors'),
        t('pricing', 'Pricing Benchmark', 'Pricing'),
        ta('trends', 'Industry Trends', 'Trends'),
      ],
    },
    {
      id: 'a7', code: 'A7', th: 'Regulatory Intelligence', en: 'Regulatory Intelligence',
      kind: 'fields',
      fields: [
        intl(ta('import', 'Import Requirements', 'Import Requirements')),
        ta('registration', 'การขึ้นทะเบียนสินค้า', 'Product Registration'),
        t('biosecurity', 'Biosecurity (เกษตร)', 'Biosecurity'),
        t('labeling', 'Labeling', 'Labeling'),
        t('certifications', 'Certifications', 'Certifications'),
        ta('risks', 'ความเสี่ยงหลัก', 'Key Risks'),
        t('timeline', 'ระยะเวลา', 'Timeline'),
        ta('steps', 'ขั้นตอน', 'Steps', 'Step 1 → Step 2 → …'),
      ],
    },
    {
      id: 'a8', code: 'A8', th: 'งบประมาณ', en: 'Budget', kind: 'budget',
      categories: [
        { key: 'flights', th: 'ตั๋วเครื่องบิน', en: 'Flights' },
        { key: 'hotel', th: 'โรงแรม', en: 'Hotel' },
        { key: 'local', th: 'เดินทางภายใน', en: 'Local Transport' },
        { key: 'visa', th: 'Visa & เอกสาร', en: 'Visa & Docs', intlOnly: true },
        { key: 'food', th: 'อาหาร', en: 'Food & Entertainment' },
        { key: 'event', th: 'ค่า Event', en: 'Event Fees' },
        { key: 'misc', th: 'เบ็ดเตล็ด', en: 'Miscellaneous' },
      ],
    },
  ],
};

// ── PART B · Traveler Guide ──────────────────────────────────────────
const PART_B: BriefingPart = {
  id: 'B',
  th: 'คู่มือเดินทาง',
  en: 'Traveler Guide',
  desc: 'สำหรับผู้เดินทาง — Travelers · Meetings · Transport · ที่พัก · ฉุกเฉิน (Timeline ดูที่ Itinerary)',
  sections: [
    {
      id: 'b1', code: 'B1', th: 'ผู้เดินทาง', en: 'Travelers',
      kind: 'repeatable', blockLabel: 'Traveler',
      blockFields: [
        t('name', 'ชื่อ', 'Name'),
        t('position', 'ตำแหน่ง', 'Position'),
        t('role', 'บทบาทในทริป', 'Role'),
        t('phone', 'เบอร์', 'Phone'),
        t('email', 'Email', 'Email'),
        intl(t('passport_no', 'เลข Passport', 'Passport No.')),
        intl(t('passport_expiry', 'Passport หมดอายุ', 'Expiry')),
        intl(sel('visa_status', 'สถานะ Visa', 'Visa Status', ['Not required', 'Required — pending', 'Approved'])),
      ],
    },
    {
      id: 'b3', code: 'B3', th: 'Meeting Preparation', en: 'Meeting Preparation',
      note: 'ทำซ้ำสำหรับทุก meeting', kind: 'repeatable', blockLabel: 'Meeting',
      blockFields: [
        t('company', 'บริษัท', 'Company'),
        t('datetime', 'วันที่ / เวลา', 'Date / Time'),
        t('location', 'สถานที่', 'Location'),
        t('goal', 'Objective', 'Meeting Goal'),
        ta('agenda', 'Agenda', 'Agenda'),
        ta('key_questions', 'คำถามหลัก', 'Key Questions'),
        t('materials', 'Materials', 'Materials Needed'),
        t('presenter', 'Presenter / Lead', 'Presenter'),
        t('outcome', 'Expected Outcome', 'Expected Outcome'),
      ],
    },
    {
      id: 'b4f', code: 'B4', th: 'เที่ยวบิน', en: 'Flights',
      kind: 'repeatable', blockLabel: 'Flight',
      blockFields: [
        t('flight', 'เที่ยวบิน', 'Flight'),
        t('airline', 'สายการบิน', 'Airline'),
        t('from', 'จาก', 'From'),
        t('to', 'ถึง', 'To'),
        t('time', 'เวลา', 'Time'),
        t('ref', 'Booking Ref', 'Booking Ref'),
      ],
    },
    {
      id: 'b4l', code: 'B4', th: 'การเดินทางภายใน', en: 'Local Transport',
      kind: 'repeatable', blockLabel: 'Transport',
      blockFields: [
        sel('type', 'ประเภท', 'Type', ['รถเช่า / Car', 'แท็กซี่ / Taxi', 'รถไฟ / Train', 'อื่นๆ / Other']),
        t('date', 'วันที่', 'Date'),
        t('route', 'จาก → ถึง', 'Route'),
        t('contact', 'Booking / ติดต่อ', 'Contact'),
        t('notes', 'หมายเหตุ', 'Notes'),
      ],
    },
    {
      id: 'b5', code: 'B5', th: 'ที่พัก', en: 'Accommodation',
      note: 'ทำซ้ำสำหรับแต่ละที่พัก', kind: 'repeatable', blockLabel: 'Hotel',
      blockFields: [
        t('hotel_name', 'ชื่อโรงแรม', 'Hotel Name'),
        ta('address', 'ที่อยู่', 'Address'),
        t('maps_link', 'Google Maps', 'Location Link', 'วางลิงก์ที่นี่'),
        t('checkin', 'Check-in', 'Check-in'),
        t('checkout', 'Check-out', 'Check-out'),
        t('confirmation', 'Confirmation No.', 'Confirmation'),
        t('contact', 'ติดต่อ / Phone', 'Contact / Phone'),
        t('transport', 'วิธีเดินทางจากโรงแรม', 'Transport'),
      ],
    },
    {
      id: 'b6', code: 'B6', th: 'ข้อมูลฉุกเฉิน', en: 'Emergency Information', kind: 'fields',
      fields: [
        t('hospital', 'โรงพยาบาลใกล้เคียง', 'Nearest Hospital'),
        t('police', 'ตำรวจ / ฉุกเฉิน', 'Police / Emergency'),
        intl(t('embassy', 'สถานทูตไทย', 'Thai Embassy')),
        t('locol_emergency', 'ผู้ติดต่อฉุกเฉิน LOCOL', 'LOCOL Emergency Contact'),
        t('insurance', 'ประกันการเดินทาง', 'Travel Insurance'),
        t('card', 'บัตรเครดิตบริษัท', 'Corporate Card'),
      ],
    },
  ],
};

// ── PART C · Trip Report ─────────────────────────────────────────────
const PART_C: BriefingPart = {
  id: 'C',
  th: 'รีพอร์ต',
  en: 'Trip Report',
  desc: 'กรอกระหว่าง/หลังทริป — Daily Log · Risk · Post Trip',
  sections: [
    {
      id: 'c1', code: 'C1', th: 'Daily Trip Log', en: 'Daily Trip Log',
      note: 'กรอกทุกวัน — source of truth ของทริป', kind: 'repeatable', blockLabel: 'Day',
      blockFields: [
        t('date', 'วันที่', 'Date'),
        t('location', 'สถานที่', 'Location'),
        ta('people_met', 'พบใคร', 'People Met'),
        ta('learnings', 'Key Learnings', 'Key Learnings'),
        ta('opportunities', 'Opportunities พบ', 'Opportunities Found'),
        ta('concerns', 'Concerns / ความเสี่ยง', 'Concerns / Risks'),
        ta('next_actions', 'Next Actions', 'Next Action · Owner · Deadline'),
      ],
    },
    {
      id: 'c2', code: 'C2', th: 'Risk Assessment', en: 'Risk Assessment', kind: 'risk',
      riskTypes: [
        { key: 'travel', th: 'Travel Risk', en: 'Travel Risk' },
        { key: 'operational', th: 'Operational Risk', en: 'Operational Risk' },
        { key: 'regulatory', th: 'Regulatory Risk', en: 'Regulatory Risk' },
        { key: 'partner', th: 'Partner Risk', en: 'Partner Risk' },
        { key: 'financial', th: 'Financial Risk', en: 'Financial Risk' },
      ],
    },
    {
      id: 'c3', code: 'C3', th: 'Post Trip Report', en: 'Post Trip Report',
      note: 'กรอกภายใน 72 ชม. หลังกลับ', kind: 'fields',
      fields: [
        ta('objective_review', 'ทบทวน Objectives', 'Objective Review'),
        ta('key_findings', 'ผลสำคัญ', 'Key Findings'),
        ta('new_opportunities', 'Opportunities ใหม่', 'New Opportunities'),
        ta('risks_found', 'Risks ที่พบ', 'Risks Found'),
        ta('followup', 'แผน Follow-up', 'Follow-up Action Plan'),
        sel('overall', 'โดยรวมทริปนี้', 'Overall Result', ['Successful', 'Partially Successful', 'Unsuccessful']),
        ta('do_differently', 'ทำอะไรต่างไปครั้งหน้า', 'Do Differently'),
        ta('lessons', 'Lessons Learned', 'Lessons Learned'),
        t('prepared_by', 'จัดทำโดย', 'Prepared By'),
      ],
    },
  ],
};

export const BRIEFING_PARTS: BriefingPart[] = [PART_A, PART_B, PART_C];

export const OBJECTIVE_STATUS = ['Done', 'Partial', 'Not Done'] as const;
export const RISK_LEVELS = ['H', 'M', 'L'] as const;

// ── data shapes stored in opportunities.briefing (all optional/partial) ──
export type BriefingData = Record<string, unknown>;

/** Visible sections for a scope (drops intlOnly sections for domestic trips). */
export function visibleSections(part: BriefingPart, scope: TripScope): BriefingSection[] {
  return part.sections.filter((s) => !s.intlOnly || scope === 'international');
}

/** Visible fields within a section for a scope. */
export function visibleFields(fields: BriefingField[] | undefined, scope: TripScope): BriefingField[] {
  return (fields ?? []).filter((f) => !f.intlOnly || scope === 'international');
}
