#!/usr/bin/env node
/**
 * Upsert opportunities by source_url.
 * - Update existing rows (matched by source_url) with new fields
 * - Insert new ones if not yet seeded
 * - Don't lose user-added data (e.g. owner_id, notes, status changes)
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

// ─── Step 1: lookup all orgs ─────────────────────────────────────────────────
const orgNamesSet = new Set();
for (const item of items) {
  if (item.details?.sponsor?.org_name) orgNamesSet.add(item.details.sponsor.org_name);
  if (item.details?.counterparty?.org_name) orgNamesSet.add(item.details.counterparty.org_name);
}

const { data: existingOrgs } = await supabase.from('organizations').select('id, name');
const orgByName = new Map();
for (const o of existingOrgs ?? []) orgByName.set(o.name.toLowerCase(), o);

// Create missing orgs
const toCreate = [...orgNamesSet].filter((n) => !orgByName.has(n.toLowerCase()));
if (toCreate.length > 0) {
  console.log(`➕ Creating ${toCreate.length} new orgs:`);
  const { data: newOrgs } = await supabase
    .from('organizations')
    .insert(toCreate.map((name) => ({ name })))
    .select('id, name');
  for (const o of newOrgs ?? []) {
    orgByName.set(o.name.toLowerCase(), o);
    console.log(`   ✓ ${o.name}`);
  }
  console.log();
}

function patchOrgRef(ref) {
  if (!ref?.org_name) return ref;
  const o = orgByName.get(ref.org_name.toLowerCase());
  if (o) return { org_id: o.id, org_name: o.name };
  return ref;
}

// ─── Step 2: get existing opportunities by source_url ────────────────────────
const { data: existingOpps } = await supabase
  .from('opportunities')
  .select('id, source_url')
  .not('source_url', 'is', null);

const oppByUrl = new Map();
for (const o of existingOpps ?? []) oppByUrl.set(o.source_url, o);

console.log(`📚 ${existingOpps?.length ?? 0} existing opportunities · ${oppByUrl.size} with source_url\n`);

// ─── Step 3: prepare upsert payload ──────────────────────────────────────────
let updateCount = 0;
let insertCount = 0;

for (const item of items) {
  const details = { ...(item.details ?? {}) };
  if (details.sponsor) details.sponsor = patchOrgRef(details.sponsor);
  if (details.counterparty) details.counterparty = patchOrgRef(details.counterparty);

  const payload = {
    track: item.track,
    title: item.title,
    stage: item.stage,
    status: item.status,
    priority: item.priority,
    source_url: item.url,
    due_date: item.due_date,
    ai_summary: item.ai_summary,
    details,
    last_update_at: new Date().toISOString(),
  };

  const existing = oppByUrl.get(item.url);
  if (existing) {
    // UPDATE existing
    const { error } = await supabase.from('opportunities').update(payload).eq('id', existing.id);
    if (error) {
      console.error(`   ❌ Update failed for ${item.title}:`, error.message);
    } else {
      updateCount++;
    }
  } else {
    // INSERT new
    const { error } = await supabase.from('opportunities').insert(payload);
    if (error) {
      console.error(`   ❌ Insert failed for ${item.title}:`, error.message);
    } else {
      insertCount++;
    }
  }
}

console.log(`\n✅ Done!`);
console.log(`   ${updateCount} updated`);
console.log(`   ${insertCount} newly inserted`);

// ─── Step 4: audit summary ───────────────────────────────────────────────────
const { data: all } = await supabase
  .from('opportunities')
  .select('track, stage, status, priority, due_date, details')
  .is('archived_at', null);

const counts = {};
const withPublishedDate = (all ?? []).filter((o) => o.details?.published_date).length;
const withJurisdiction = (all ?? []).filter((o) => o.details?.jurisdiction).length;
const riskSignals = (all ?? []).filter((o) => o.details?.category === 'Risk Signal').length;
const fresh = (all ?? []).filter(
  (o) => o.details?.published_date && o.details.published_date >= '2026-05-01',
).length;

for (const o of all ?? []) {
  const key = `${o.track}`;
  counts[key] = (counts[key] ?? 0) + 1;
}

console.log('\n📊 Final state:');
console.log(`   Total active: ${all?.length ?? 0}`);
console.log(`   By track: ${JSON.stringify(counts)}`);
console.log(`   With published_date: ${withPublishedDate}/${all?.length ?? 0}`);
console.log(`   With jurisdiction: ${withJurisdiction}/${all?.length ?? 0}`);
console.log(`   Risk Signals: ${riskSignals}`);
console.log(`   Fresh (May 2026+): ${fresh}`);
console.log('\n🎉 Open http://localhost:5173/inbox to see the updated data');
