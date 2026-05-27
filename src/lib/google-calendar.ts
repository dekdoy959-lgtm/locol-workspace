// Google Calendar API v3 — minimal client using user's provider_token from Google OAuth.
// https://developers.google.com/calendar/api/v3/reference/events/list

const BASE = 'https://www.googleapis.com/calendar/v3';

export interface CalendarEventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  self?: boolean;
  organizer?: boolean;
}

export interface CalendarEvent {
  id: string;
  status: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: CalendarEventAttendee[];
  organizer?: { email: string; displayName?: string; self?: boolean };
  creator?: { email: string; displayName?: string; self?: boolean };
  conferenceData?: {
    conferenceId?: string;
    entryPoints?: { entryPointType: string; uri: string; label?: string }[];
  };
}

export class CalendarAuthError extends Error {
  constructor(message = 'Google Calendar access expired — กรุณา logout + login ใหม่') {
    super(message);
    this.name = 'CalendarAuthError';
  }
}

interface ListEventsOptions {
  timeMin?: string;
  timeMax?: string;
  q?: string;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
}

export async function listCalendarEvents(
  providerToken: string,
  options: ListEventsOptions = {},
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: options.timeMin ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    timeMax: options.timeMax ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults: String(options.maxResults ?? 50),
    singleEvents: String(options.singleEvents ?? true),
    orderBy: options.orderBy ?? 'startTime',
  });

  if (options.q) params.set('q', options.q);

  const res = await fetch(`${BASE}/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${providerToken}` },
  });

  if (res.status === 401 || res.status === 403) {
    throw new CalendarAuthError();
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { items?: CalendarEvent[] };
  return data.items ?? [];
}

/**
 * Fetch events where any of the provided emails appear as attendee.
 * Uses one query per email (Google `q=` only does free-text search, so we filter client-side).
 */
export async function listEventsForContact(
  providerToken: string,
  emails: string[],
): Promise<CalendarEvent[]> {
  if (emails.length === 0) return [];

  const lowerEmails = new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean));
  if (lowerEmails.size === 0) return [];

  // Use the first email as a free-text search query to narrow results
  const firstEmail = Array.from(lowerEmails)[0];
  const events = await listCalendarEvents(providerToken, { q: firstEmail, maxResults: 100 });

  // Filter client-side: event must include at least one of the contact's emails as attendee
  return events.filter((event) => {
    const matchAttendee = event.attendees?.some((a) => lowerEmails.has(a.email.toLowerCase()));
    const matchOrganizer = event.organizer && lowerEmails.has(event.organizer.email.toLowerCase());
    const matchCreator = event.creator && lowerEmails.has(event.creator.email.toLowerCase());
    return matchAttendee || matchOrganizer || matchCreator;
  });
}

export function eventDate(event: CalendarEvent): string {
  // Return YYYY-MM-DD for comparison/sorting
  const raw = event.start.dateTime ?? event.start.date ?? '';
  return raw.slice(0, 10);
}

export function eventTime(event: CalendarEvent): string | null {
  if (!event.start.dateTime) return null;
  const d = new Date(event.start.dateTime);
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export function eventMeetLink(event: CalendarEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink;
  const meetEntry = event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video');
  return meetEntry?.uri ?? null;
}
