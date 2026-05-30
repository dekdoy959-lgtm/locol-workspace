/**
 * Date utilities — always use LOCAL time for calendar-date concepts.
 *
 * Background: `new Date().toISOString().slice(0, 10)` converts UTC to YYYY-MM-DD,
 * which is wrong for Bangkok users — at 6am Bangkok = 11pm UTC yesterday, so
 * "today" was reported as yesterday. Affected calendar grid, briefing, stale
 * thresholds, birthday lookups, milestone "overdue" flags, etc.
 *
 * Use these helpers everywhere a "calendar date" is being computed.
 * For true timestamps (last_update_at, sent_at), continue using toISOString().
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-time YYYY-MM-DD for a given Date (defaults to now). */
export function toLocalISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local-time YYYY-MM-DD for "today". */
export function todayLocalISO(): string {
  return toLocalISO(new Date());
}

/** Add N days (can be negative) to a YYYY-MM-DD and return YYYY-MM-DD (local). */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toLocalISO(dt);
}

/** YYYY-MM-DD parsed to a Date at LOCAL midnight (not UTC midnight). */
export function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Days between two YYYY-MM-DD dates (local time, not UTC). */
export function daysBetweenISO(a: string, b: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const da = isoToLocalDate(a);
  const db = isoToLocalDate(b);
  return Math.round((db.getTime() - da.getTime()) / MS_PER_DAY);
}

/** Days from today (positive = future, negative = past). */
export function daysFromTodayISO(iso: string): number {
  return daysBetweenISO(todayLocalISO(), iso);
}
