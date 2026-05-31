/**
 * HTML email templates — LOCOL Workspace alerts.
 * Inline-styled so they work in all email clients.
 */

const BG = '#101010';
const TEXT = '#FFFFFF';
const DIM = '#9a9a9a';
const GREEN = '#99CE24';
const CARD = '#1c1c1c';
const LINE = '#2a2a2a';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

function wrap(title, bodyHtml, ctaLabel, ctaUrl) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'IBM Plex Sans Thai', -apple-system, sans-serif;color:${TEXT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:${CARD};border:1px solid ${LINE};border-radius:24px 0 24px 0;">
          <tr>
            <td style="padding:24px 28px 16px;border-bottom:1px solid ${LINE};">
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:14px;height:14px;background:${GREEN};margin-right:6px;"></span>
                <span style="font-weight:700;letter-spacing:2.5px;font-size:12px;color:${TEXT};">LOCOL · OPS</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${bodyHtml}
              ${
                ctaUrl
                  ? `<div style="margin-top:24px;">
                      <a href="${ctaUrl}" style="display:inline-block;background:${GREEN};color:${BG};padding:10px 20px;border-radius:10px 0 10px 0;text-decoration:none;font-weight:600;letter-spacing:0.3px;text-transform:uppercase;font-size:13px;">${ctaLabel || 'เปิด LOCOL'}</a>
                    </div>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid ${LINE};color:${DIM};font-size:11px;letter-spacing:0.5px;text-align:center;">
              คุณได้รับ email นี้เพราะ Alert Settings เปิดไว้ใน LOCOL Workspace<br/>
              <a href="${APP_URL}/settings" style="color:${DIM};">ปรับการแจ้งเตือน</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Stale opportunity ──────────────────────────────────────────────
export function staleOpportunityEmail({ recipientName, opp, daysSinceUpdate, threshold, trackLabel }) {
  const subject = `⚠ Stale · ${opp.title}`;
  const url = `${APP_URL}/inbox/${opp.id}`;
  const body = `
    <div style="font-size:11px;letter-spacing:1.2px;color:#d96a66;font-weight:700;text-transform:uppercase;margin-bottom:8px;">
      🚩 STALE OPPORTUNITY
    </div>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;letter-spacing:-0.5px;color:${TEXT};text-transform:uppercase;">
      ${escapeHtml(opp.title)}
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:${DIM};line-height:1.55;">
      สวัสดี ${escapeHtml(recipientName)},<br/><br/>
      Opportunity นี้ไม่ได้ update มา <b style="color:#d96a66;">${daysSinceUpdate} วัน</b> แล้ว
      ในขณะที่ stale threshold ของ <b style="color:${TEXT};">${trackLabel}</b> track ตั้งไว้ที่ ${threshold} วัน
    </p>
    <table cellpadding="6" cellspacing="0" style="background:#181818;border:1px solid ${LINE};border-radius:10px 0 10px 0;width:100%;font-size:13px;color:${TEXT};">
      <tr><td style="color:${DIM};width:120px;">Track</td><td><b>${trackLabel}</b></td></tr>
      <tr><td style="color:${DIM};">Stage</td><td>${escapeHtml(opp.stage)}</td></tr>
      <tr><td style="color:${DIM};">Status</td><td>${escapeHtml(opp.status)}</td></tr>
      ${opp.due_date ? `<tr><td style="color:${DIM};">Due</td><td>${opp.due_date}</td></tr>` : ''}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:${DIM};line-height:1.5;">
      เปิดเข้าไป update — แค่เปลี่ยน stage หรือเพิ่ม note ก็ reset timer ได้
    </p>
  `;
  return { subject, html: wrap(subject, body, 'OPEN OPPORTUNITY', url) };
}

// ─── Cold contact ───────────────────────────────────────────────────
export function coldContactEmail({ recipientName, contact, daysSinceContact, freqDays }) {
  const subject = `❄ Cold · ${displayName(contact)}`;
  const url = `${APP_URL}/contacts/${contact.id}`;
  const body = `
    <div style="font-size:11px;letter-spacing:1.2px;color:#d99a66;font-weight:700;text-transform:uppercase;margin-bottom:8px;">
      🥶 GOING COLD
    </div>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;letter-spacing:-0.5px;color:${TEXT};text-transform:uppercase;">
      ${escapeHtml(displayName(contact))}
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:${DIM};line-height:1.55;">
      สวัสดี ${escapeHtml(recipientName)},<br/><br/>
      Contact นี้ไม่ได้ติดต่อมา <b style="color:#d96a66;">${daysSinceContact} วัน</b> แล้ว
      เกิน frequency ที่ตั้งไว้ (${freqDays} วัน)
    </p>
    ${
      contact.last_contact_date
        ? `<p style="margin:0 0 16px;font-size:13px;color:${DIM};">Last contact: <b style="color:${TEXT};">${contact.last_contact_date}</b></p>`
        : ''
    }
    <p style="margin:0;font-size:13px;color:${DIM};line-height:1.5;">
      ส่ง Line / Email ทักทาย แล้ว LOG INTERACTION เพื่อ reset cadence
    </p>
  `;
  return { subject, html: wrap(subject, body, 'OPEN CONTACT', url) };
}

// ─── Reminder note (future-dated note hits today) ──────────────────
export function reminderNoteEmail({ recipientName, note, targetEntity, targetType }) {
  const targetLabel =
    targetType === 'contact'
      ? `Contact: ${displayName(targetEntity)}`
      : targetType === 'org'
        ? `Org: ${targetEntity.name}`
        : `Opportunity: ${targetEntity.title}`;
  const url =
    targetType === 'contact'
      ? `${APP_URL}/contacts/${note.target_id}`
      : targetType === 'org'
        ? `${APP_URL}/organizations/${note.target_id}`
        : `${APP_URL}/inbox/${note.target_id}`;

  const subject = `🔔 Reminder · ${truncate(note.text, 60)}`;
  const body = `
    <div style="font-size:11px;letter-spacing:1.2px;color:${GREEN};font-weight:700;text-transform:uppercase;margin-bottom:8px;">
      🔔 REMINDER · ${targetLabel}
    </div>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;letter-spacing:-0.3px;color:${TEXT};">
      ${escapeHtml(truncate(note.text, 100))}
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:${DIM};line-height:1.55;">
      สวัสดี ${escapeHtml(recipientName)},<br/><br/>
      Note ที่ตั้งไว้ว่าจะเตือนวันนี้ — เปิดไปจัดการ
    </p>
    <div style="background:#181818;border:1px solid ${LINE};border-left:3px solid ${GREEN};padding:12px 14px;border-radius:10px 0 10px 0;font-size:13.5px;color:${TEXT};line-height:1.55;white-space:pre-wrap;">
      ${escapeHtml(note.text)}
    </div>
  `;
  return { subject, html: wrap(subject, body, 'เปิด ' + targetLabel.split(': ')[0], url) };
}

// ─── Birthday ───────────────────────────────────────────────────────
export function birthdayEmail({ recipientName, contact, daysUntil }) {
  const isToday = daysUntil === 0;
  const dayLabel = isToday ? 'วันนี้' : `ในอีก ${daysUntil} วัน`;
  const subject = `🎂 ${displayName(contact)} ${isToday ? 'วันเกิดวันนี้' : 'วันเกิดเร็วๆ นี้'}`;
  const url = `${APP_URL}/contacts/${contact.id}`;
  const body = `
    <div style="font-size:11px;letter-spacing:1.2px;color:${GREEN};font-weight:700;text-transform:uppercase;margin-bottom:8px;">
      🎂 BIRTHDAY ALERT
    </div>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;letter-spacing:-0.5px;color:${TEXT};text-transform:uppercase;">
      ${escapeHtml(displayName(contact))}
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:${DIM};line-height:1.55;">
      สวัสดี ${escapeHtml(recipientName)},<br/><br/>
      วันเกิด <b style="color:${GREEN};">${dayLabel}</b> (${contact.birthday})
    </p>
    <p style="margin:0;font-size:13px;color:${DIM};line-height:1.5;">
      ส่ง Line อวยพรเขา · เพิ่ม note เก็บไว้ในระบบ
    </p>
  `;
  return { subject, html: wrap(subject, body, 'OPEN CONTACT', url) };
}

// ─── Event/Trip reminder (T-7 / T-1 days before) ──────────────────
export function eventReminderEmail({ recipientName, opp, daysUntil, place }) {
  const isTomorrow = daysUntil <= 1;
  const dayLabel = daysUntil === 0 ? 'วันนี้' : isTomorrow ? 'พรุ่งนี้' : `ในอีก ${daysUntil} วัน`;
  const headline = isTomorrow ? 'พรุ่งนี้แล้ว · เตรียมตัว' : 'เริ่มเตรียมตัวได้แล้ว';
  const trackEmoji = opp.track === 'trip' ? '✈' : '📅';
  const trackLabel = opp.track === 'trip' ? 'TRIP' : 'EVENT';
  const subject = `${trackEmoji} ${headline} · ${opp.title}`;
  const url = `${APP_URL}/inbox/${opp.id}`;
  const briefUrl = `${APP_URL}/inbox/${opp.id}/brief`;
  const body = `
    <div style="font-size:11px;letter-spacing:1.2px;color:${GREEN};font-weight:700;text-transform:uppercase;margin-bottom:8px;">
      ${trackEmoji} ${trackLabel} REMINDER · T-${daysUntil}
    </div>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;letter-spacing:-0.5px;color:${TEXT};text-transform:uppercase;">
      ${escapeHtml(opp.title)}
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:${DIM};line-height:1.55;">
      สวัสดี ${escapeHtml(recipientName)},<br/><br/>
      ${dayLabel} · ${escapeHtml(headline)}
    </p>
    <table cellpadding="6" cellspacing="0" style="background:#181818;border:1px solid ${LINE};border-radius:10px 0 10px 0;width:100%;font-size:13px;color:${TEXT};">
      <tr><td style="color:${DIM};width:120px;">Date</td><td><b>${dayLabel}</b></td></tr>
      ${place ? `<tr><td style="color:${DIM};">Place</td><td>${escapeHtml(place)}</td></tr>` : ''}
      <tr><td style="color:${DIM};">Stage</td><td>${escapeHtml(opp.stage)}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:${DIM};line-height:1.5;">
      💡 ดู brief เพื่อ checklist marketing/logistics
    </p>
    <div style="margin-top:14px;">
      <a href="${briefUrl}" style="display:inline-block;background:${LINE};color:${TEXT};padding:8px 16px;border-radius:8px 0 8px 0;text-decoration:none;font-weight:600;font-size:12px;letter-spacing:0.4px;">📄 OPEN BRIEF</a>
    </div>
  `;
  return { subject, html: wrap(subject, body, 'OPEN OPPORTUNITY', url) };
}

// ─── Helpers ────────────────────────────────────────────────────────
function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s = '', n = 60) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

function displayName(contact) {
  const full = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
  return contact.nick_name ? `${full} (${contact.nick_name})` : full || 'Unknown';
}
