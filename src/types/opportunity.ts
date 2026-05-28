import type { Database } from './database';

export type OpportunityRow = Database['public']['Tables']['opportunities']['Row'];
export type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert'];
export type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update'];

export type TrackKey = 'apply' | 'act' | 'watch' | 'contract' | 'event';

export interface TrackMeta {
  key: TrackKey;
  /** Short display label (used in chips, headers) — Thai-first */
  name: string;
  /** English internal name (legacy / for filters) */
  nameEn: string;
  /** One-line description shown under header */
  sub: string;
  /** Cadence hint */
  cadence: string;
  /** Workflow stages (left → right) */
  stages: string[];
  defaultStage: string;
  color: { ink: string; soft: string; chip: string };
  /** Examples to show when user is confused */
  examples?: string[];
  noReviewerRequired?: boolean;
}

export const TRACKS: TrackMeta[] = [
  {
    key: 'apply',
    name: 'ขอทุน/งานแข่ง',
    nameEn: 'Grants & Competitions',
    sub: 'สมัครทุน · งานประกวด · เข้าร่วมโครงการ',
    cadence: 'ตาม deadline',
    stages: ['Spotted', 'Fit check', 'Drafting', 'Submitted', 'Won', 'Lost'],
    defaultStage: 'Spotted',
    color: { ink: '#E8B923', soft: '#3a2a0a', chip: '#BD8E23' },
    examples: ['Climate Curve $200k', 'NIA Open Innovation', 'Banpu Champions for Change'],
  },
  {
    key: 'act',
    name: 'งานต้องทำ',
    nameEn: 'Tasks',
    sub: 'เรื่องที่ต้องตอบ · ต้องส่งเอกสาร · ลงมือทำ',
    cadence: '1–3 สัปดาห์',
    stages: ['Captured', 'Scoped', 'Drafting', 'Sent', 'Closed'],
    defaultStage: 'Captured',
    color: { ink: '#99CE24', soft: '#1f2a08', chip: '#6e9618' },
    examples: ['ส่ง proposal ให้พาร์ตเนอร์', 'ตอบ inquiry จากนักข่าว', 'เตรียม pitch deck'],
  },
  {
    key: 'watch',
    name: 'ติดตามข่าว',
    nameEn: 'Monitor',
    sub: 'เฝ้าดู · ข่าวสาร · เก็บไว้อ้างอิง (ไม่มี deadline)',
    cadence: 'อ่านสัปดาห์ละครั้ง',
    stages: ['New', 'Read', 'Filed', 'Promote'],
    defaultStage: 'New',
    color: { ink: '#D9D9D9', soft: '#1f1f1f', chip: '#747474' },
    examples: ['ข่าวคู่แข่งเปิดตัวสินค้า', 'งานวิจัย methane reduction ใหม่', 'industry report'],
    noReviewerRequired: true,
  },
  {
    key: 'contract',
    name: 'สัญญา',
    nameEn: 'Contracts',
    sub: 'ข้อตกลง · MoU · พาร์ตเนอร์ชิป',
    cadence: 'แจ้งเตือน 90/30/7 วัน ก่อนหมดอายุ',
    stages: ['Lead', 'Negotiating', 'Drafting', 'Signed', 'Active', 'Renewal', 'End'],
    defaultStage: 'Lead',
    color: { ink: '#9aa56a', soft: '#1d1f12', chip: '#695935' },
    examples: ['MoU กับ Doi Tung', 'สัญญา distribution กับห้าง', 'partnership agreement'],
  },
  {
    key: 'event',
    name: 'อีเวนต์',
    nameEn: 'Events',
    sub: 'งานสัมมนา · ประชุม · networking · trade show',
    cadence: 'ตามวันที่งาน',
    stages: ['Spotted', 'Decide attend', 'Registered', 'Attended', 'Follow-ups'],
    defaultStage: 'Spotted',
    color: { ink: '#d96a66', soft: '#2a1212', chip: '#A12F2D' },
    examples: ['SIAL Asia 2026', 'ASEAN Climate Summit', 'Thaifex 2026'],
  },
];

export function findTrack(key: string | TrackKey): TrackMeta {
  return TRACKS.find((t) => t.key === key) ?? TRACKS[0];
}

export const TRACK_OPTIONS = TRACKS.map((t) => ({
  value: t.key,
  label: `${t.name} · ${t.nameEn}`,
}));

export const STATUS_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'Triage', label: 'Triage' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'Pursuing', label: 'Pursuing' },
  { value: 'Decision', label: 'Decision' },
  { value: 'Won', label: 'Won' },
  { value: 'Lost', label: 'Lost' },
  { value: 'Archived', label: 'Archived' },
];

export function isStale(opp: OpportunityRow, thresholdDays: number | null): boolean {
  if (thresholdDays === null) return false; // null threshold = never stale (e.g. Watch track)
  const lastUpdate = new Date(opp.last_update_at).getTime();
  const ageMs = Date.now() - lastUpdate;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays > thresholdDays && !opp.archived_at;
}

export function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate).getTime();
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

export function formatDueRelative(dueDate: string | null): string {
  const days = daysUntilDue(dueDate);
  if (days === null) return '—';
  if (days === 0) return 'today';
  if (days === 1) return 'พรุ่งนี้';
  if (days === -1) return 'เมื่อวาน';
  if (days > 0) return `in ${days}d`;
  return `${Math.abs(days)}d ago`;
}
