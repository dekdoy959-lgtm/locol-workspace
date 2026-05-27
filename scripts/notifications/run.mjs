#!/usr/bin/env node
/**
 * LOCOL Notifications Runner
 *
 * Scans the database for items that need alerting, and sends emails via Resend.
 * Logs each sent alert to alert_log to prevent dupes.
 *
 * Run manually:    npm run send
 * Dry-run (no send): npm run dry-run
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 *   RESEND_API_KEY
 *   FROM_EMAIL          (e.g. "LOCOL <noreply@yourdomain.com>" or "onboarding@resend.dev" for testing)
 *   APP_URL             (e.g. https://locol.app or http://localhost:5173)
 *
 * For testing without verified domain, use: FROM_EMAIL=onboarding@resend.dev
 * — Resend allows sending only to YOUR signup email until domain verified.
 */
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  staleOpportunityEmail,
  coldContactEmail,
  reminderNoteEmail,
  birthdayEmail,
} from './templates.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nfxjqddqaidvykdghlxg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'LOCOL <onboarding@resend.dev>';
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY');
  process.exit(1);
}
if (!DRY_RUN && !RESEND_API_KEY) {
  console.error('❌ Missing RESEND_API_KEY (or set DRY_RUN=true to preview)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const resend = DRY_RUN ? null : new Resend(RESEND_API_KEY);

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const TODAY_ISO = new Date().toISOString().slice(0, 10);

const TRACK_LABELS = {
  apply: 'Apply',
  act: 'Act-on',
  watch: 'Watch',
  contract: 'Contracts',
  event: 'Events',
};

const sentCounts = {
  stale_opportunity: 0,
  cold_contact: 0,
  reminder_note: 0,
  birthday: 0,
  skipped: 0,
  errors: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getRecipient(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('team_members')
    .select('id, email, full_name')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

async function getPrefs(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('user_alert_prefs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  // If no prefs row, default all enabled
  return data ?? { enabled: true, stale_opportunities: true, cold_contacts: true, reminder_notes: true, birthdays: true };
}

async function alreadySentToday(alertType, entityId, email) {
  const { data } = await supabase
    .from('alert_log')
    .select('id')
    .eq('alert_type', alertType)
    .eq('entity_id', entityId)
    .eq('recipient_email', email)
    .eq('sent_date', TODAY_ISO)
    .maybeSingle();
  return !!data;
}

async function sendAndLog({ alertType, entityTable, entityId, recipientUser, subject, html }) {
  if (!recipientUser?.email) {
    sentCounts.skipped++;
    return;
  }

  if (await alreadySentToday(alertType, entityId, recipientUser.email)) {
    sentCounts.skipped++;
    return;
  }

  if (DRY_RUN) {
    console.log(`  [DRY] → ${recipientUser.email}: ${subject}`);
    sentCounts[alertType] = (sentCounts[alertType] ?? 0) + 1;
    return;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientUser.email,
      subject,
      html,
    });
    if (result.error) throw result.error;

    await supabase.from('alert_log').insert({
      alert_type: alertType,
      entity_table: entityTable,
      entity_id: entityId,
      recipient_email: recipientUser.email,
      recipient_user_id: recipientUser.id,
      subject,
    });

    sentCounts[alertType] = (sentCounts[alertType] ?? 0) + 1;
    console.log(`  ✓ ${recipientUser.email.padEnd(35)} ${subject}`);
  } catch (err) {
    sentCounts.errors++;
    console.error(`  ❌ ${recipientUser.email}: ${err.message ?? err}`);
  }
}

// ─── 1. Stale opportunities ──────────────────────────────────────────────────
async function processStaleOpportunities() {
  console.log('\n📌 Stale opportunities:');
  const { data: settings } = await supabase.from('track_settings').select('*');
  const thresholdByTrack = {};
  for (const s of settings ?? []) thresholdByTrack[s.track] = s.stale_threshold_days;

  const { data: opps } = await supabase
    .from('opportunities')
    .select('*')
    .is('archived_at', null)
    .not('owner_id', 'is', null);

  for (const opp of opps ?? []) {
    const threshold = thresholdByTrack[opp.track];
    if (threshold == null) continue; // Watch track typically null = never stale

    const ageDays = (Date.now() - new Date(opp.last_update_at).getTime()) / MS_PER_DAY;
    if (ageDays <= threshold) continue;

    const owner = await getRecipient(opp.owner_id);
    if (!owner) continue;

    const prefs = await getPrefs(owner.id);
    if (!prefs?.enabled || !prefs?.stale_opportunities) continue;

    const { subject, html } = staleOpportunityEmail({
      recipientName: owner.full_name ?? owner.email.split('@')[0],
      opp,
      daysSinceUpdate: Math.floor(ageDays),
      trackLabel: TRACK_LABELS[opp.track] ?? opp.track,
    });

    await sendAndLog({
      alertType: 'stale_opportunity',
      entityTable: 'opportunities',
      entityId: opp.id,
      recipientUser: owner,
      subject,
      html,
    });
  }
}

// ─── 2. Cold contacts ────────────────────────────────────────────────────────
async function processColdContacts() {
  console.log('\n📌 Cold contacts:');
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .not('owner_id', 'is', null)
    .not('freq_days', 'is', null);

  for (const c of contacts ?? []) {
    if (!c.last_contact_date) continue;
    const days = (Date.now() - new Date(c.last_contact_date).getTime()) / MS_PER_DAY;
    if (days <= c.freq_days) continue;

    const owner = await getRecipient(c.owner_id);
    if (!owner) continue;

    const prefs = await getPrefs(owner.id);
    if (!prefs?.enabled || !prefs?.cold_contacts) continue;

    const { subject, html } = coldContactEmail({
      recipientName: owner.full_name ?? owner.email.split('@')[0],
      contact: c,
      daysSinceContact: Math.floor(days),
      freqDays: c.freq_days,
    });

    await sendAndLog({
      alertType: 'cold_contact',
      entityTable: 'contacts',
      entityId: c.id,
      recipientUser: owner,
      subject,
      html,
    });
  }
}

// ─── 3. Reminder notes (future-dated notes hitting today) ────────────────────
async function processReminderNotes() {
  console.log('\n📌 Reminder notes:');
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('is_future', true)
    .eq('date', TODAY_ISO);

  for (const n of notes ?? []) {
    if (!n.created_by) continue;
    const creator = await getRecipient(n.created_by);
    if (!creator) continue;

    const prefs = await getPrefs(creator.id);
    if (!prefs?.enabled || !prefs?.reminder_notes) continue;

    // Look up target entity for context
    let target;
    if (n.scope === 'contact') {
      const { data } = await supabase.from('contacts').select('*').eq('id', n.target_id).maybeSingle();
      target = data;
    } else if (n.scope === 'org') {
      const { data } = await supabase.from('organizations').select('*').eq('id', n.target_id).maybeSingle();
      target = data;
    } else {
      const { data } = await supabase.from('opportunities').select('*').eq('id', n.target_id).maybeSingle();
      target = data;
    }
    if (!target) continue;

    const { subject, html } = reminderNoteEmail({
      recipientName: creator.full_name ?? creator.email.split('@')[0],
      note: n,
      targetEntity: target,
      targetType: n.scope,
    });

    await sendAndLog({
      alertType: 'reminder_note',
      entityTable: 'notes',
      entityId: n.id,
      recipientUser: creator,
      subject,
      html,
    });
  }
}

// ─── 4. Birthdays (in next 7 days, with notification enabled) ────────────────
async function processBirthdays() {
  console.log('\n📌 Birthdays (next 7 days):');
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('birthday_notification_enabled', true)
    .not('birthday', 'is', null)
    .not('owner_id', 'is', null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const c of contacts ?? []) {
    if (!c.birthday) continue;
    const [, mm, dd] = c.birthday.split('-');
    if (!mm || !dd) continue;

    const thisYear = new Date(today.getFullYear(), Number(mm) - 1, Number(dd));
    const nextYear = new Date(today.getFullYear() + 1, Number(mm) - 1, Number(dd));
    const next = thisYear >= today ? thisYear : nextYear;
    const daysUntil = Math.round((next.getTime() - today.getTime()) / MS_PER_DAY);

    if (daysUntil > 7) continue;

    const owner = await getRecipient(c.owner_id);
    if (!owner) continue;

    const prefs = await getPrefs(owner.id);
    if (!prefs?.enabled || !prefs?.birthdays) continue;

    const { subject, html } = birthdayEmail({
      recipientName: owner.full_name ?? owner.email.split('@')[0],
      contact: c,
      daysUntil,
    });

    await sendAndLog({
      alertType: 'birthday',
      entityTable: 'contacts',
      entityId: c.id,
      recipientUser: owner,
      subject,
      html,
    });
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`📧 LOCOL Notifications Runner`);
console.log(`   Date: ${TODAY_ISO}`);
console.log(`   Mode: ${DRY_RUN ? '🧪 DRY RUN (no emails sent)' : '✉️  LIVE'}`);
console.log(`   From: ${FROM_EMAIL}`);

await processStaleOpportunities();
await processColdContacts();
await processReminderNotes();
await processBirthdays();

console.log('\n📊 Summary:');
for (const [k, v] of Object.entries(sentCounts)) {
  if (v > 0) console.log(`   ${k.padEnd(22)} ${v}`);
}
console.log('\n🎉 Done');
