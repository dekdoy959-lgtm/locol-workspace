// vCard 4.0 generator — RFC 6350
// https://datatracker.ietf.org/doc/html/rfc6350

import type {
  AddressEntry,
  ContactRow,
  EducationEntry,
  EmailEntry,
  OrgEntry,
  PhoneEntry,
  SocialEntry,
} from '../types/contact';

function escape(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function fold(line: string): string {
  // vCard line folding: 75 octets max per line, continuation lines start with space
  if (line.length <= 75) return line;
  const out: string[] = [];
  let remaining = line;
  while (remaining.length > 0) {
    if (out.length === 0) {
      out.push(remaining.slice(0, 75));
      remaining = remaining.slice(75);
    } else {
      out.push(' ' + remaining.slice(0, 74));
      remaining = remaining.slice(74);
    }
  }
  return out.join('\r\n');
}

function mapPhoneLabel(label: string): string {
  const m: Record<string, string> = {
    Mobile: 'CELL',
    Work: 'WORK,VOICE',
    Home: 'HOME,VOICE',
    Other: 'VOICE',
  };
  return m[label] ?? 'VOICE';
}

function mapEmailLabel(label: string): string {
  const m: Record<string, string> = { Personal: 'HOME', Work: 'WORK', Other: 'OTHER' };
  return m[label] ?? 'INTERNET';
}

function mapAddressLabel(label: string): string {
  const m: Record<string, string> = { Home: 'HOME', Work: 'WORK', Other: 'OTHER' };
  return m[label] ?? 'WORK';
}

function formatAddrVcard(a: AddressEntry): string {
  // ADR;TYPE=...:PO BOX;EXT ADDRESS;STREET;CITY;REGION;POSTAL;COUNTRY
  const parts = [
    '',
    '',
    escape(a.street ?? ''),
    escape(a.sub_district ?? ''),
    escape(a.district ?? ''),
    escape(a.postal_code ?? ''),
    escape(a.country ?? ''),
  ];
  return parts.join(';');
}

export function generateVCard(contact: ContactRow): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:4.0'];

  const firstName = escape(contact.first_name);
  const lastName = escape(contact.last_name ?? '');
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');

  // N: surname;given;additional;prefix;suffix
  lines.push(`N:${lastName};${firstName};;;${escape(contact.suffix ?? '')}`);
  lines.push(`FN:${escape(fullName)}`);

  if (contact.nick_name) {
    lines.push(`NICKNAME:${escape(contact.nick_name)}`);
  }

  if (contact.bio) {
    lines.push(`NOTE:${escape(contact.bio)}`);
  }

  if (contact.birthday) {
    lines.push(`BDAY:${contact.birthday.replace(/-/g, '')}`);
  }

  // Phones
  for (const p of (contact.phones as PhoneEntry[]) ?? []) {
    if (!p.value.trim()) continue;
    lines.push(`TEL;TYPE=${mapPhoneLabel(p.label)}:${escape(p.value)}`);
  }

  // Emails
  for (const e of (contact.emails as EmailEntry[]) ?? []) {
    if (!e.value.trim()) continue;
    lines.push(`EMAIL;TYPE=${mapEmailLabel(e.label)}:${escape(e.value)}`);
  }

  // Addresses
  for (const a of (contact.addresses as AddressEntry[]) ?? []) {
    if (!a.street && !a.province && !a.district) continue;
    lines.push(`ADR;TYPE=${mapAddressLabel(a.label)}:${formatAddrVcard(a)}`);
  }

  // Orgs — primary first, then others
  const orgs = ((contact.orgs as OrgEntry[]) ?? []).slice().sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  for (const o of orgs) {
    if (!o.org_name.trim()) continue;
    lines.push(`ORG:${escape(o.org_name)}`);
    if (o.role) {
      lines.push(`TITLE:${escape(o.role)}`);
    }
    if (orgs.length === 1) break; // only emit one ORG/TITLE per vCard
  }

  // Education — as a single multi-line note appended to the bio
  const edu = (contact.education as EducationEntry[]) ?? [];
  if (edu.length > 0) {
    const eduText = edu.map((e) => `${e.school}${e.degree ? ' · ' + e.degree : ''}${e.year ? ' (' + e.year + ')' : ''}`).join('; ');
    lines.push(`NOTE:Education: ${escape(eduText)}`);
  }

  // Socials → URLs and IMPP
  for (const s of (contact.socials as SocialEntry[]) ?? []) {
    if (!s.handle.trim()) continue;
    if (s.url) {
      lines.push(`URL;TYPE=${escape(s.platform)}:${escape(s.url)}`);
    } else {
      lines.push(`X-SOCIAL-${s.platform.toUpperCase().replace(/[^A-Z0-9]/g, '')}:${escape(s.handle)}`);
    }
  }

  // Photo
  if (contact.avatar_url) {
    lines.push(`PHOTO;MEDIATYPE=image/jpeg:${contact.avatar_url}`);
  }

  // Tags
  if (contact.tags.length > 0) {
    lines.push(`CATEGORIES:${contact.tags.map(escape).join(',')}`);
  }

  // Revision
  lines.push(`REV:${new Date(contact.updated_at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`);
  lines.push(`UID:locol-${contact.id}`);

  lines.push('END:VCARD');

  return lines.map(fold).join('\r\n');
}

export function downloadVCard(contact: ContactRow): void {
  const vcard = generateVCard(contact);
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join('_') || 'contact';
  const filename = `${fullName.toLowerCase().replace(/\s+/g, '_')}.vcf`;

  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatContactAsPlainText(contact: ContactRow): string {
  const lines: string[] = [];
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
  const nameLine = contact.nick_name ? `${fullName} (${contact.nick_name})` : fullName;
  lines.push(nameLine);

  const orgs = (contact.orgs as OrgEntry[]) ?? [];
  const primaryOrg = orgs.find((o) => o.is_primary) ?? orgs[0];
  if (primaryOrg) {
    lines.push(`${primaryOrg.role ?? ''}${primaryOrg.role ? ' · ' : ''}${primaryOrg.org_name}`);
  }

  if (contact.bio) {
    lines.push('');
    lines.push(contact.bio);
  }

  const phones = (contact.phones as PhoneEntry[]) ?? [];
  const emails = (contact.emails as EmailEntry[]) ?? [];
  if (phones.length || emails.length) {
    lines.push('');
    for (const p of phones) {
      if (p.value.trim()) lines.push(`📞 ${p.label}: ${p.value}`);
    }
    for (const e of emails) {
      if (e.value.trim()) lines.push(`✉️ ${e.label}: ${e.value}`);
    }
  }

  const socials = (contact.socials as SocialEntry[]) ?? [];
  if (socials.length) {
    lines.push('');
    for (const s of socials) {
      if (s.handle.trim()) lines.push(`💬 ${s.platform}: ${s.handle}${s.url ? ' · ' + s.url : ''}`);
    }
  }

  return lines.join('\n');
}
