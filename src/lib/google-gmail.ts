// Gmail API v1 — minimal client. Uses user's provider_token from Google OAuth.
// https://developers.google.com/gmail/api/reference/rest/v1/users.messages

import { toLocalISO } from './dateUtil';

const BASE = 'https://gmail.googleapis.com/gmail/v1';

export class GmailAuthError extends Error {
  constructor(message = 'Gmail access expired — กรุณา logout + login ใหม่') {
    super(message);
    this.name = 'GmailAuthError';
  }
}

export interface GmailMessageMeta {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string; // unix ms as string
  payload: {
    headers: { name: string; value: string }[];
  };
}

interface MessageListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export function getHeader(message: GmailMessageMeta, name: string): string {
  const lower = name.toLowerCase();
  const h = message.payload.headers.find((h) => h.name.toLowerCase() === lower);
  return h?.value ?? '';
}

export function messageDate(message: GmailMessageMeta): string {
  // Use internalDate (ms since epoch) and return ISO yyyy-mm-dd in local time
  const d = new Date(Number(message.internalDate));
  return toLocalISO(d);
}

export function messageTime(message: GmailMessageMeta): string {
  const d = new Date(Number(message.internalDate));
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

interface EmailParticipant {
  name?: string;
  email: string;
}

/** Parse "John Doe <john@example.com>" or just "john@example.com" */
export function parseAddress(raw: string): EmailParticipant[] {
  return raw
    .split(/,(?![^<>]*>)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^"?(.*?)"?\s*<([^>]+)>$/);
      if (m) return { name: m[1].trim() || undefined, email: m[2].trim() };
      return { email: part };
    });
}

export function isOutgoing(message: GmailMessageMeta, myEmail: string): boolean {
  const fromAddrs = parseAddress(getHeader(message, 'From')).map((a) => a.email.toLowerCase());
  return fromAddrs.includes(myEmail.toLowerCase());
}

async function listMessageIds(
  providerToken: string,
  q: string,
  maxResults: number,
): Promise<{ id: string }[]> {
  const params = new URLSearchParams({
    q,
    maxResults: String(maxResults),
  });

  const res = await fetch(`${BASE}/users/me/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${providerToken}` },
  });

  if (res.status === 401 || res.status === 403) {
    throw new GmailAuthError();
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as MessageListResponse;
  return data.messages ?? [];
}

async function getMessageMeta(providerToken: string, id: string): Promise<GmailMessageMeta> {
  const params = new URLSearchParams({
    format: 'metadata',
  });
  for (const h of ['From', 'To', 'Cc', 'Subject', 'Date']) {
    params.append('metadataHeaders', h);
  }

  const res = await fetch(`${BASE}/users/me/messages/${id}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${providerToken}` },
  });

  if (res.status === 401 || res.status === 403) {
    throw new GmailAuthError();
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<GmailMessageMeta>;
}

export async function listEmailsForContact(
  providerToken: string,
  contactEmails: string[],
  maxResults = 25,
): Promise<GmailMessageMeta[]> {
  const validEmails = contactEmails.map((e) => e.toLowerCase().trim()).filter(Boolean);
  if (validEmails.length === 0) return [];

  // Build Gmail search: "(from:a OR to:a OR cc:a) OR (from:b OR to:b OR cc:b)"
  const q = validEmails
    .map((e) => `(from:${e} OR to:${e} OR cc:${e})`)
    .join(' OR ');

  const ids = await listMessageIds(providerToken, q, maxResults);
  if (ids.length === 0) return [];

  // Fetch all metadata in parallel — Gmail allows ~100 req/s/user
  const promises = ids.map((m) => getMessageMeta(providerToken, m.id));
  const results = await Promise.allSettled(promises);
  return results
    .filter((r): r is PromiseFulfilledResult<GmailMessageMeta> => r.status === 'fulfilled')
    .map((r) => r.value);
}

export function gmailMessageUrl(message: GmailMessageMeta): string {
  return `https://mail.google.com/mail/u/0/#inbox/${message.threadId}`;
}
