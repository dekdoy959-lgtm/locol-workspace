/**
 * Calendar utils — aggregate every date-stamped item across the workspace
 * into a unified CalendarItem feed for the /calendar page.
 */

import type { OpportunityRow } from '../../types/opportunity';
import type { ContactRow } from '../../types/contact';
import type { Database } from '../../types/database';
import type { CalendarEvent } from '../../lib/google-calendar';
import { eventDate, eventTime } from '../../lib/google-calendar';

type MilestoneRow = Database['public']['Tables']['milestones']['Row'];
type CommitmentRow = Database['public']['Tables']['commitments']['Row'];
type NoteRow = Database['public']['Tables']['notes']['Row'];

export type CalendarItemKind =
  | 'event'                  // event_date_start — actual event day
  | 'registration_deadline'  // registration cutoff for an event
  | 'apply_deadline'         // grant application due
  | 'decision_date'          // grant decision expected
  | 'contract_renewal'       // contract renewal date
  | 'contract_effective'     // contract effective date
  | 'due'                    // generic opp.due_date (any track)
  | 'milestone'              // contact milestone date
  | 'commitment'             // commitment due date
  | 'reminder'               // future-dated note
  | 'birthday'               // contact birthday (recurring)
  | 'meeting';               // Google Calendar event

export interface CalendarItem {
  /** Unique render key */
  id: string;
  kind: CalendarItemKind;
  /** YYYY-MM-DD primary date */
  date: string;
  /** Optional end date — for multi-day events */
  endDate?: string;
  /** Optional time string (free-form: "14:00–17:00" or "14:00") */
  time?: string;
  /** Display title */
  title: string;
  /** Optional location/venue */
  location?: string | null;
  /** Optional currency-aware cost */
  cost?: { amount: number; currency: string } | null;
  /** Track for color/icon — only for opp-based items */
  track?: 'apply' | 'act' | 'watch' | 'contract' | 'event';
  /** Owner / responsible user ID */
  ownerId?: string | null;
  /** Status badge text e.g. 'Drafting', 'Registered' */
  status?: string;
  /** Navigation link */
  href: string;
  /** Source raw object — for side-panel deep dive */
  source:
    | { kind: 'opportunity'; opp: OpportunityRow }
    | { kind: 'milestone'; milestone: MilestoneRow; contact: ContactRow | undefined }
    | { kind: 'commitment'; commitment: CommitmentRow; contact: ContactRow | undefined }
    | { kind: 'note'; note: NoteRow }
    | { kind: 'birthday'; contact: ContactRow; turning: number | null }
    | { kind: 'gcal'; event: CalendarEvent };
  /** True for items the user owns (or is reviewer of) */
  isMine: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function asString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

function asNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface AggregateInput {
  opportunities: OpportunityRow[];
  milestones: MilestoneRow[];
  commitments: CommitmentRow[];
  notes: NoteRow[];
  contacts: ContactRow[];
  calendarEvents: CalendarEvent[];
  myUserId: string | null;
}

export function aggregateCalendarItems({
  opportunities,
  milestones,
  commitments,
  notes,
  contacts,
  calendarEvents,
  myUserId,
}: AggregateInput): CalendarItem[] {
  const items: CalendarItem[] = [];
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const today = todayISO();

  // ─── Opportunities — multiple date fields per row ───────────────
  for (const opp of opportunities) {
    if (opp.archived_at) continue;
    const details = (opp.details ?? {}) as Record<string, unknown>;
    const isMine = !!myUserId && (opp.owner_id === myUserId || opp.reviewer_id === myUserId);
    const href = `/inbox/${opp.id}`;
    const baseTrack = opp.track as CalendarItem['track'];
    const ownerId = opp.owner_id ?? null;

    // Generic due_date
    if (opp.due_date) {
      items.push({
        id: `due-${opp.id}`,
        kind: 'due',
        date: opp.due_date,
        title: opp.title,
        track: baseTrack,
        ownerId,
        status: opp.stage,
        href,
        source: { kind: 'opportunity', opp },
        isMine,
      });
    }

    // Event-specific
    if (opp.track === 'event') {
      const start = asString(details.event_date_start);
      const end = asString(details.event_date_end);
      const time = asString(details.event_time);
      const location = asString(details.location);
      const cost = asNumber(details.cost);
      const currency = asString(details.currency) || 'THB';
      const regDeadline = asString(details.registration_deadline);

      if (start) {
        items.push({
          id: `event-${opp.id}`,
          kind: 'event',
          date: start,
          endDate: end || undefined,
          time: time || undefined,
          title: opp.title,
          location: location || null,
          cost: cost != null ? { amount: cost, currency } : null,
          track: baseTrack,
          ownerId,
          status: opp.stage,
          href,
          source: { kind: 'opportunity', opp },
          isMine,
        });
      }
      if (regDeadline && regDeadline !== start) {
        items.push({
          id: `reg-${opp.id}`,
          kind: 'registration_deadline',
          date: regDeadline,
          title: `Register: ${opp.title}`,
          track: baseTrack,
          ownerId,
          status: opp.stage,
          href,
          source: { kind: 'opportunity', opp },
          isMine,
        });
      }
    }

    // Apply-specific
    if (opp.track === 'apply') {
      const appDeadline = asString(details.application_deadline);
      const decision = asString(details.decision_date);
      if (appDeadline && appDeadline !== opp.due_date) {
        items.push({
          id: `apply-${opp.id}`,
          kind: 'apply_deadline',
          date: appDeadline,
          title: `📝 ${opp.title}`,
          track: baseTrack,
          ownerId,
          status: opp.stage,
          href,
          source: { kind: 'opportunity', opp },
          isMine,
        });
      }
      if (decision) {
        items.push({
          id: `dec-${opp.id}`,
          kind: 'decision_date',
          date: decision,
          title: `🎯 Decision: ${opp.title}`,
          track: baseTrack,
          ownerId,
          status: opp.stage,
          href,
          source: { kind: 'opportunity', opp },
          isMine,
        });
      }
    }

    // Trip-specific (on-field/farm visits)
    if (opp.track === 'trip') {
      const tripStart = asString(details.trip_date_start);
      const tripEnd = asString(details.trip_date_end);
      const farmName = asString(details.farm_name);
      const province = asString(details.province);
      const locationName = asString(details.location_name);
      const placeBits = [farmName, locationName, province].filter(Boolean).join(' · ');
      if (tripStart) {
        items.push({
          id: `trip-${opp.id}`,
          kind: 'event', // surface trips in TRIPS & EVENTS split
          date: tripStart,
          endDate: tripEnd || undefined,
          title: `✈ ${opp.title}`,
          location: placeBits || null,
          track: baseTrack,
          ownerId,
          status: opp.stage,
          href,
          source: { kind: 'opportunity', opp },
          isMine,
        });
      }
    }
  }

  // ─── Milestones — contact goal dates ──────────────────────────
  for (const m of milestones) {
    if (!m.date || m.achieved) continue;
    const contact = contactById.get(m.contact_id);
    items.push({
      id: `milestone-${m.id}`,
      kind: 'milestone',
      date: m.date,
      title: m.title,
      ownerId: m.created_by,
      href: `/contacts/${m.contact_id}`,
      source: { kind: 'milestone', milestone: m, contact },
      isMine: !!myUserId && m.created_by === myUserId,
    });
  }

  // ─── Commitments — i owe / they owe ───────────────────────────
  for (const c of commitments) {
    if (!c.due_date || c.status !== 'open') continue;
    const contact = contactById.get(c.contact_id);
    const prefix = c.direction === 'i_owe' ? '🤝 I owe: ' : '⏳ They owe: ';
    items.push({
      id: `commitment-${c.id}`,
      kind: 'commitment',
      date: c.due_date,
      title: `${prefix}${c.description}`,
      href: `/contacts/${c.contact_id}`,
      source: { kind: 'commitment', commitment: c, contact },
      isMine: c.direction === 'i_owe', // "I owe" is always mine
    });
  }

  // ─── Future-dated notes (reminders) ───────────────────────────
  for (const n of notes) {
    if (!n.is_future || !n.date) continue;
    if (n.date < today) continue; // skip past-due reminders
    items.push({
      id: `note-${n.id}`,
      kind: 'reminder',
      date: n.date,
      title: `🔔 ${n.text.slice(0, 80)}${n.text.length > 80 ? '…' : ''}`,
      ownerId: n.created_by,
      href:
        n.scope === 'contact'
          ? `/contacts/${n.target_id}`
          : n.scope === 'org'
            ? `/organizations/${n.target_id}`
            : `/inbox/${n.target_id}`,
      source: { kind: 'note', note: n },
      isMine: !!myUserId && n.created_by === myUserId,
    });
  }

  // ─── Birthdays — recurring annual ─────────────────────────────
  const todayDate = new Date(today);
  for (const c of contacts) {
    if (!c.birthday || !c.birthday_notification_enabled) continue;
    const [yyyy, mm, dd] = c.birthday.split('-');
    if (!mm || !dd) continue;
    const monthN = Number(mm) - 1;
    const dayN = Number(dd);
    const birthYearNum = yyyy ? Number(yyyy) : null;

    // Next occurrence in [today, today + 365d]
    const yearNow = todayDate.getFullYear();
    let next = new Date(yearNow, monthN, dayN);
    if (next < todayDate) next = new Date(yearNow + 1, monthN, dayN);
    const dateISO = next.toISOString().slice(0, 10);
    const turning = birthYearNum != null ? next.getFullYear() - birthYearNum : null;

    items.push({
      id: `birthday-${c.id}`,
      kind: 'birthday',
      date: dateISO,
      title: `🎂 ${displayName(c)}${turning != null ? ` turns ${turning}` : ''}`,
      href: `/contacts/${c.id}`,
      source: { kind: 'birthday', contact: c, turning },
      isMine: !!myUserId && c.owner_id === myUserId,
    });
  }

  // ─── Google Calendar (only future) ─────────────────────────────
  for (const evt of calendarEvents) {
    const d = eventDate(evt);
    if (!d) continue;
    items.push({
      id: `gcal-${evt.id}`,
      kind: 'meeting',
      date: d,
      time: eventTime(evt) || undefined,
      title: evt.summary ?? '(no title)',
      location: evt.location ?? null,
      href: evt.htmlLink ?? '#',
      source: { kind: 'gcal', event: evt },
      isMine: true, // From the user's own calendar
    });
  }

  // Sort: date asc, then by kind priority
  const kindPriority: Record<CalendarItemKind, number> = {
    apply_deadline: 1,
    registration_deadline: 1,
    contract_renewal: 2,
    decision_date: 3,
    event: 4,
    meeting: 5,
    due: 6,
    milestone: 7,
    commitment: 7,
    reminder: 8,
    contract_effective: 9,
    birthday: 10,
  };
  items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (kindPriority[a.kind] ?? 99) - (kindPriority[b.kind] ?? 99);
  });

  return items;
}

function displayName(c: ContactRow): string {
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return c.nick_name ? `${full} (${c.nick_name})` : full || 'Unknown';
}

// ─── Display helpers ─────────────────────────────────────────────────

export const KIND_META: Record<
  CalendarItemKind,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  event:                 { label: 'EVENT',          color: '#d96a66', bg: '#2a1212', border: '#5a1a18', icon: '📅' },
  registration_deadline: { label: 'REGISTER BY',    color: '#E8B923', bg: '#241a06', border: '#5a3f10', icon: '⏰' },
  apply_deadline:        { label: 'APPLY BY',       color: '#E8B923', bg: '#241a06', border: '#5a3f10', icon: '📝' },
  decision_date:         { label: 'DECISION',       color: '#99CE24', bg: '#19250a', border: '#6e9618', icon: '🎯' },
  contract_renewal:      { label: 'RENEW',          color: '#9aa56a', bg: '#1d1f12', border: '#3a3f1f', icon: '🔄' },
  contract_effective:    { label: 'START',          color: '#9aa56a', bg: '#1d1f12', border: '#3a3f1f', icon: '📜' },
  due:                   { label: 'DUE',            color: '#d99a66', bg: '#2a1d10', border: '#6a3f1c', icon: '⏳' },
  milestone:             { label: 'MILESTONE',      color: '#99CE24', bg: '#19250a', border: '#6e9618', icon: '🎯' },
  commitment:            { label: 'COMMITMENT',     color: '#d99a66', bg: '#2a1d10', border: '#6a3f1c', icon: '🤝' },
  reminder:              { label: 'REMINDER',       color: '#99CE24', bg: '#19250a', border: '#6e9618', icon: '🔔' },
  birthday:              { label: 'BIRTHDAY',       color: '#99CE24', bg: '#19250a', border: '#6e9618', icon: '🎂' },
  meeting:               { label: 'MEETING',        color: '#d96a66', bg: '#241010', border: '#5a1a18', icon: '📅' },
};

export function daysFromToday(dateISO: string): number {
  const today = new Date(todayISO());
  const target = new Date(dateISO);
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

export function formatRelativeDate(dateISO: string): string {
  const days = daysFromToday(dateISO);
  if (days === 0) return 'วันนี้';
  if (days === 1) return 'พรุ่งนี้';
  if (days === -1) return 'เมื่อวาน';
  if (days > 0 && days < 7) return `in ${days}d`;
  if (days < 0 && days > -7) return `${Math.abs(days)}d ago`;
  if (days > 0) return `in ${days}d`;
  return `${Math.abs(days)}d ago`;
}

export function formatDateLong(dateISO: string): string {
  const d = new Date(dateISO);
  return d.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(dateISO: string): string {
  const d = new Date(dateISO);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

// ─── Smart sections ─────────────────────────────────────────────────

export function needsDecision(items: CalendarItem[]): CalendarItem[] {
  const todayD = new Date(todayISO()).getTime();
  return items.filter((i) => {
    if (i.kind !== 'event') return false;
    const eventTime = new Date(i.date).getTime();
    const daysAway = (eventTime - todayD) / MS_PER_DAY;
    return (
      daysAway >= 0 &&
      daysAway <= 14 &&
      i.source.kind === 'opportunity' &&
      ['Spotted', 'Decide attend'].includes(i.source.opp.stage)
    );
  });
}

export function registrationClosing(items: CalendarItem[]): CalendarItem[] {
  const todayD = new Date(todayISO()).getTime();
  return items.filter((i) => {
    if (i.kind !== 'registration_deadline') return false;
    const time = new Date(i.date).getTime();
    const daysAway = (time - todayD) / MS_PER_DAY;
    return (
      daysAway >= 0 &&
      daysAway <= 7 &&
      i.source.kind === 'opportunity' &&
      !['Registered', 'Attended', 'Follow-ups'].includes(i.source.opp.stage)
    );
  });
}

export function applyDeadlinesSoon(items: CalendarItem[]): CalendarItem[] {
  const todayD = new Date(todayISO()).getTime();
  return items.filter((i) => {
    if (i.kind !== 'apply_deadline') return false;
    const time = new Date(i.date).getTime();
    const daysAway = (time - todayD) / MS_PER_DAY;
    return (
      daysAway >= 0 &&
      daysAway <= 14 &&
      i.source.kind === 'opportunity' &&
      !['Submitted', 'Won', 'Lost'].includes(i.source.opp.stage)
    );
  });
}

export function contractsRenewing(items: CalendarItem[]): CalendarItem[] {
  const todayD = new Date(todayISO()).getTime();
  return items.filter((i) => {
    if (i.kind !== 'contract_renewal') return false;
    const time = new Date(i.date).getTime();
    const daysAway = (time - todayD) / MS_PER_DAY;
    return daysAway >= 0 && daysAway <= 90;
  });
}

export function thisWeekItems(items: CalendarItem[]): CalendarItem[] {
  const today = todayISO();
  const sevenDays = new Date(Date.now() + 7 * MS_PER_DAY).toISOString().slice(0, 10);
  return items.filter((i) => i.date >= today && i.date <= sevenDays);
}

export function thisMonthItems(items: CalendarItem[]): CalendarItem[] {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return items.filter((i) => i.date.startsWith(monthPrefix));
}

export function detectConflicts(items: CalendarItem[]): Set<string> {
  // Items occurring same day are "conflicts" if both are events
  const byDate = new Map<string, CalendarItem[]>();
  for (const i of items) {
    if (i.kind !== 'event' && i.kind !== 'meeting') continue;
    const arr = byDate.get(i.date) ?? [];
    arr.push(i);
    byDate.set(i.date, arr);
  }
  const conflicting = new Set<string>();
  for (const arr of byDate.values()) {
    if (arr.length >= 2) for (const i of arr) conflicting.add(i.id);
  }
  return conflicting;
}

// ─── Cost helpers ────────────────────────────────────────────────────

export function totalCost(items: CalendarItem[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const i of items) {
    if (!i.cost) continue;
    totals[i.cost.currency] = (totals[i.cost.currency] ?? 0) + i.cost.amount;
  }
  return totals;
}

export function formatCostMap(map: Record<string, number>): string {
  const entries = Object.entries(map);
  if (entries.length === 0) return '฿0';
  return entries
    .map(([currency, amount]) => {
      try {
        return new Intl.NumberFormat('th-TH', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `${currency} ${amount.toLocaleString()}`;
      }
    })
    .join(' · ');
}
