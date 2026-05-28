/**
 * Generate a downloadable iCal (.ics) file from calendar items.
 * Spec: RFC 5545 — https://tools.ietf.org/html/rfc5545
 */

import type { CalendarItem } from './calendarUtils';

const PROD_ID = '-//LOCOL//Workspace//EN';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Convert YYYY-MM-DD to iCal DATE format (YYYYMMDD) */
function toICalDate(iso: string): string {
  return iso.replace(/-/g, '');
}

/** Generate a stamp like 20260527T103000Z (UTC) */
function nowStamp(): string {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** RFC 5545: escape commas, semicolons, backslashes, newlines */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Fold long lines per RFC 5545 (75 octets max, continuation = leading space) */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      out.push(line.slice(i, i + 75));
      i += 75;
    } else {
      out.push(' ' + line.slice(i, i + 74));
      i += 74;
    }
  }
  return out.join('\r\n');
}

function lines(...parts: string[]): string {
  return parts.map(foldLine).join('\r\n');
}

function makeEvent(item: CalendarItem, baseUrl: string): string {
  const uid = `${item.id}@locol-workspace`;
  const dtstamp = nowStamp();
  const dtstart = toICalDate(item.date);
  const dtend = toICalDate(item.endDate ?? item.date);

  const summary = escapeText(item.title);
  const location = item.location ? `LOCATION:${escapeText(item.location)}` : null;
  const description = escapeText(
    [
      item.kind && `Type: ${item.kind}`,
      item.status && `Status: ${item.status}`,
      item.time && `Time: ${item.time}`,
      item.cost && `Cost: ${item.cost.amount} ${item.cost.currency}`,
      item.href.startsWith('http')
        ? `Link: ${item.href}`
        : `Link: ${baseUrl}${item.href}`,
    ]
      .filter(Boolean)
      .join('\\n'),
  );

  // Use DATE (all-day) format unless we have a real time on a Google meeting
  // (Google meeting events come with time as part of their source — we'd need
  // to convert; for now treat as all-day for simplicity)
  const fields = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location,
    'END:VEVENT',
  ].filter(Boolean) as string[];

  return lines(...fields);
}

export function generateICal(items: CalendarItem[], opts: { baseUrl?: string } = {}): string {
  const baseUrl = opts.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PROD_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LOCOL Workspace',
    'X-WR-TIMEZONE:Asia/Bangkok',
    ...items.map((i) => makeEvent(i, baseUrl)),
    'END:VCALENDAR',
  ];
  return body.join('\r\n');
}

export function downloadICal(items: CalendarItem[], filename = 'locol-calendar.ics') {
  const ics = generateICal(items);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
