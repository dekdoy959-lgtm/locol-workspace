import { colors } from '../styles/tokens';
import type { Database } from './database';
import { daysFromTodayISO } from '../lib/dateUtil';

export type OpportunityRow = Database['public']['Tables']['opportunities']['Row'];
export type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert'];
export type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update'];

export type TrackKey = 'apply' | 'watch' | 'event' | 'trip';

/**
 * Legacy track values — used to safely accept old data during migration window.
 * After Migration 0013 runs in all environments, these will return empty arrays
 * (no opportunities will have these tracks anymore).
 */
export type LegacyTrackKey = 'act' | 'contract';

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
    color: { ink: colors.warn, soft: '#3a2a0a', chip: '#BD8E23' },
    examples: ['Climate Curve $200k', 'NIA Open Innovation', 'Banpu Champions for Change'],
  },
  {
    key: 'watch',
    name: 'ติดตามข่าว',
    nameEn: 'Monitor',
    sub: 'เฝ้าดู · ข่าวสาร · เก็บไว้อ้างอิง (ไม่มี deadline)',
    cadence: 'อ่านสัปดาห์ละครั้ง',
    stages: ['New', 'Read', 'Filed', 'Promote'],
    defaultStage: 'New',
    color: { ink: colors.surface, soft: '#1f1f1f', chip: colors.dim },
    examples: ['ข่าวคู่แข่งเปิดตัวสินค้า', 'งานวิจัย methane reduction ใหม่', 'industry report'],
    noReviewerRequired: true,
  },
  {
    key: 'event',
    name: 'อีเวนต์',
    nameEn: 'Events',
    sub: 'งานสัมมนา · networking · trade show · เปิดบูธ',
    cadence: 'ตามวันที่งาน',
    stages: ['Spotted', 'Decide attend', 'Registered', 'Attended', 'Follow-ups'],
    defaultStage: 'Spotted',
    color: { ink: colors.danger, soft: '#2a1212', chip: '#A12F2D' },
    examples: ['SIAL Asia 2026', 'ASEAN Climate Summit', 'Thaifex 2026'],
  },
  {
    key: 'trip',
    name: 'ลงพื้นที่',
    nameEn: 'On-field Trip',
    sub: 'ไปฟาร์ม · ลงพื้นที่จริง · เยี่ยมพาร์ตเนอร์',
    cadence: 'ตามแผนทริป',
    stages: ['Planned', 'Confirmed', 'Departed', 'Completed', 'Follow-ups'],
    defaultStage: 'Planned',
    color: { ink: colors.olive, soft: colors.oliveBg, chip: '#695935' },
    examples: ['ไปฟาร์ม ก. เชียงราย', 'ตรวจคุณภาพโคที่ พิจิตร', 'ดู supply chain แม่ฮ่องสอน'],
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
  return daysFromTodayISO(dueDate);
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
