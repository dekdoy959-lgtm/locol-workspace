#!/usr/bin/env node
/**
 * Seed real opportunities from items.json into LOCOL Workspace.
 *
 * Steps:
 *   1. Read items.json
 *   2. Extract unique sponsor/counterparty org_names
 *   3. Look up or create those organizations
 *   4. Patch details to use real org_id
 *   5. Apply "missed deadline" rule for expired apply items
 *   6. Insert all opportunities in one batch
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nfxjqddqaidvykdghlxg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const items = JSON.parse(readFileSync(join(__dirname, 'items.json'), 'utf-8'));

const TODAY = new Date().toISOString().slice(0, 10);
console.log(`📅 Today is ${TODAY} · processing ${items.length} items\n`);

// ─── Step 1: extract unique org names from sponsor/counterparty ──────────────
const orgNamesSet = new Set();
for (const item of items) {
  const sponsor = item.details?.sponsor;
  const counterparty = item.details?.counterparty;
  if (sponsor?.org_name) orgNamesSet.add(sponsor.org_name);
  if (counterparty?.org_name) orgNamesSet.add(counterparty.org_name);
}

console.log(`🏢 Found ${orgNamesSet.size} unique org references in details:`);
for (const n of orgNamesSet) console.log(`   · ${n}`);
console.log();

// ─── Step 2: lookup existing orgs ────────────────────────────────────────────
const { data: existingOrgs, error: orgErr } = await supabase
  .from('organizations')
  .select('id, name');
if (orgErr) throw orgErr;

const orgByName = new Map();
for (const o of existingOrgs ?? []) orgByName.set(o.name.toLowerCase(), o);

console.log(`📚 ${existingOrgs?.length ?? 0} orgs already exist in DB`);

// ─── Step 3: create missing orgs ─────────────────────────────────────────────
const toCreate = [...orgNamesSet].filter((n) => !orgByName.has(n.toLowerCase()));

if (toCreate.length > 0) {
  console.log(`➕ Creating ${toCreate.length} new orgs...`);
  const { data: newOrgs, error: newOrgErr } = await supabase
    .from('organizations')
    .insert(toCreate.map((name) => ({ name, type: inferOrgType(name) })))
    .select('id, name');
  if (newOrgErr) throw newOrgErr;
  for (const o of newOrgs ?? []) {
    orgByName.set(o.name.toLowerCase(), o);
    console.log(`   ✓ ${o.name}`);
  }
} else {
  console.log('   (no new orgs needed)');
}
console.log();

function inferOrgType(name) {
  const lower = name.toLowerCase();
  if (lower.includes('foundation')) return 'Foundation';
  if (lower.includes('university') || lower.includes('davis')) return 'University';
  if (lower.includes('research')) return 'Foundation';
  return 'Company';
}

// ─── Step 4: build opportunities ─────────────────────────────────────────────
function patchOrgRef(ref) {
  if (!ref?.org_name) return ref;
  const o = orgByName.get(ref.org_name.toLowerCase());
  if (o) return { org_id: o.id, org_name: o.name };
  return ref;
}

function applyExpiredRule(item) {
  // Rule: if apply track + due_date < today → mark Lost
  // If event date_start < today → keep as Spotted, add note in summary
  if (item.track === 'apply' && item.due_date && item.due_date < TODAY) {
    return {
      ...item,
      stage: 'Lost',
      status: 'Lost',
      ai_summary: `⚠️ DEADLINE PASSED (${item.due_date}) — missed this opportunity. ${item.ai_summary}`,
    };
  }
  const eventStart = item.details?.event_date_start;
  if (item.track === 'event' && eventStart && eventStart < TODAY) {
    return {
      ...item,
      ai_summary: `⚠️ EVENT PASSED (${eventStart}) — did not attend. ${item.ai_summary}`,
    };
  }
  return item;
}

const opps = items.map((item) => {
  const patched = applyExpiredRule(item);
  const details = { ...(patched.details ?? {}) };
  if (details.sponsor) details.sponsor = patchOrgRef(details.sponsor);
  if (details.counterparty) details.counterparty = patchOrgRef(details.counterparty);

  return {
    track: patched.track,
    title: patched.title,
    stage: patched.stage,
    status: patched.status,
    priority: patched.priority,
    source_url: patched.url,
    due_date: patched.due_date,
    ai_summary: patched.ai_summary,
    details,
  };
});

// ─── Step 5: insert ──────────────────────────────────────────────────────────
console.log(`📥 Inserting ${opps.length} opportunities...`);
const { data: created, error: insertErr } = await supabase
  .from('opportunities')
  .insert(opps)
  .select('id, title, track, stage, status, due_date');

if (insertErr) {
  console.error('❌ Insert failed:', insertErr);
  process.exit(1);
}

console.log(`\n✅ Successfully inserted ${created?.length ?? 0} opportunities\n`);

// ─── Step 6: summary ─────────────────────────────────────────────────────────
const byTrack = {};
const lostCount = (created ?? []).filter((o) => o.status === 'Lost').length;

for (const o of created ?? []) {
  byTrack[o.track] = (byTrack[o.track] ?? 0) + 1;
}

console.log('📊 Breakdown by track:');
for (const [track, count] of Object.entries(byTrack)) {
  console.log(`   ${track.padEnd(10)} ${count}`);
}

if (lostCount > 0) {
  console.log(`\n⚠️  ${lostCount} marked as LOST (missed deadline)`);
}

console.log('\n🎉 Done! Open http://localhost:5173/inbox to see results');
