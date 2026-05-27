#!/usr/bin/env node
/**
 * Seed organizations + opportunity_people links based on items.json.
 *
 * Strategy:
 *   1. Extract all org names from sponsor/counterparty/related_companies/organizer
 *   2. Create missing orgs with relationship_status='cold' + inferred type
 *   3. Link orgs to opportunities via opportunity_people:
 *      - Events: organizer field → split by '+' or ',' → role='organizer'
 *      - Apply : sponsor → role='organizer'
 *      - Contract: counterparty → role='organizer'
 *      - Watch : related_companies → role='attendee' (subject of news)
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function splitNames(text) {
  if (!text) return [];
  return text
    .split(/[,+]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Skip these — they're publications / news sources, not relationship targets
const SKIP_NAMES = new Set(
  [
    'The Bullvine',
    'Farmers Forum',
    'Farmers Guardian',
    'Agriland UK',
    'Agriland',
    'PubMed',
    'Carbon Pulse',
    'AgFunder News',
    'AgFunder',
    'Beef Magazine',
    'Food Ingredients First',
    'Entrackr',
    'Foley Hoag',
    'EFI USA',
    'PR Newswire',
    'StoneX',
    'CarbonCredits.com',
    'CA Rural Telecom Authority (summary)',
    'Journal of Dairy Science (PubMed)',
    'JBS Foods Group',
    'dsm-firmenich (vendor)',
    'CH4 Global',
    'Spark Climate Solutions + UC Davis CLEAR Center + CDFA',
    'UC Davis CAES',
  ].map((s) => s.toLowerCase()),
);

function inferType(name) {
  const l = name.toLowerCase();
  if (/usda|epa|carb|cdfa|dcceew|unfccc|cdfa|dld|department/.test(l)) return 'Government';
  if (/efsa|seges|verra|sbti|regenagri|sustaincert|ffar/.test(l)) return 'NGO';
  if (/davis|university|college|institute/.test(l)) return 'University';
  if (/foundation|refed|spark climate/.test(l)) return 'Foundation';
  if (/ventures|capital|breakthrough|positron|nucleus|climate club|agrizeronz|idemitsu|elbow beach/.test(l)) return 'Foundation';
  return 'Company';
}

function inferRelationshipStatus(name) {
  // Sponsors/counterparties we might engage = prospect; otherwise cold
  const l = name.toLowerCase();
  if (/cargill|ffar|marble|climate curve|cdrf|mitsubishi|ch4 global|symbrosia|arkeabio|triple bio|refed/.test(l)) {
    return 'prospect';
  }
  return 'cold';
}

function inferIndustry(name) {
  const l = name.toLowerCase();
  if (/seaweed|asparagopsis|symbrosia|ch4 global/.test(l)) return 'Methane mitigation · Seaweed';
  if (/bovaer|dsm-firmenich|3-nop|triple bio/.test(l)) return 'Animal nutrition · Feed additives';
  if (/biotech|arkeabio|fermtech/.test(l)) return 'Biotech';
  if (/cocoa|chocolate|barry callebaut|puratos/.test(l)) return 'Cocoa · Chocolate';
  if (/beef|cattle|jbs|cargill/.test(l)) return 'Beef · Livestock';
  if (/dairy|organic valley|stonyfield/.test(l)) return 'Dairy';
  if (/mrv|renewcred|sustaincert/.test(l)) return 'Carbon MRV · Standards';
  if (/verra|regenagri|sbti/.test(l)) return 'Carbon standards · Methodology';
  if (/davis|university/.test(l)) return 'Research · Academia';
  if (/ventures|capital|breakthrough|positron|nucleus|climate club|agrizeronz/.test(l)) return 'Venture capital';
  if (/whole foods|unfi/.test(l)) return 'Retail · Distribution';
  if (/mitsubishi|idemitsu/.test(l)) return 'Conglomerate · Trading';
  return null;
}

// ─── Step 1: extract org names ───────────────────────────────────────────────
const orgsToCreate = new Map(); // name → {name, type, industry, relationship_status, tags}

function addOrg(name) {
  if (!name || SKIP_NAMES.has(name.toLowerCase())) return;
  if (orgsToCreate.has(name.toLowerCase())) return;
  orgsToCreate.set(name.toLowerCase(), {
    name,
    type: inferType(name),
    industry: inferIndustry(name),
    relationship_status: inferRelationshipStatus(name),
    tags: [],
  });
}

const eventOrganizerLinks = []; // { item, orgNames[] }
const watchSubjectLinks = []; // { item, orgNames[] }

for (const item of items) {
  // Sponsor (apply) — already gets created via existing items.json structure
  if (item.details?.sponsor?.org_name) addOrg(item.details.sponsor.org_name);
  // Counterparty (contract)
  if (item.details?.counterparty?.org_name) addOrg(item.details.counterparty.org_name);
  // related_companies (watch)
  for (const n of splitNames(item.details?.related_companies)) addOrg(n);

  // Event organizer — split text
  if (item.track === 'event' && item.details?.organizer) {
    const names = splitNames(item.details.organizer);
    for (const n of names) addOrg(n);
    eventOrganizerLinks.push({ item, orgNames: names });
  }

  // Watch articles: link related_companies as "attendee" (= subject of news)
  if (item.track === 'watch' && item.details?.related_companies) {
    const names = splitNames(item.details.related_companies);
    if (names.length > 0) watchSubjectLinks.push({ item, orgNames: names });
  }
}

console.log(`🏢 ${orgsToCreate.size} unique org names extracted`);

// ─── Step 2: lookup existing orgs ────────────────────────────────────────────
const { data: existing, error: lookupErr } = await supabase
  .from('organizations')
  .select('id, name');
if (lookupErr) throw lookupErr;

const orgByName = new Map();
for (const o of existing ?? []) orgByName.set(o.name.toLowerCase(), o);

const newOnes = [...orgsToCreate.values()].filter((o) => !orgByName.has(o.name.toLowerCase()));

console.log(`📚 ${existing?.length ?? 0} existing orgs · ${newOnes.length} new to create\n`);

// ─── Step 3: create missing orgs ─────────────────────────────────────────────
if (newOnes.length > 0) {
  const { data: created, error: createErr } = await supabase
    .from('organizations')
    .insert(newOnes)
    .select('id, name, relationship_status, type');
  if (createErr) {
    console.error('❌ Failed to create orgs:', createErr);
    process.exit(1);
  }
  console.log(`✓ Created ${created?.length ?? 0} new orgs:`);
  for (const o of created ?? []) {
    orgByName.set(o.name.toLowerCase(), o);
    const flag = o.relationship_status === 'prospect' ? '🟡' : '⚪';
    console.log(`   ${flag} ${o.type.padEnd(11)} ${o.name}`);
  }
  console.log();
}

// ─── Step 4: lookup opportunities by source_url ──────────────────────────────
const { data: opps } = await supabase
  .from('opportunities')
  .select('id, source_url, track')
  .not('source_url', 'is', null);
const oppByUrl = new Map();
for (const o of opps ?? []) oppByUrl.set(o.source_url, o);

// ─── Step 5: get existing opp_people to avoid duplicates ─────────────────────
const { data: existingLinks } = await supabase
  .from('opportunity_people')
  .select('opportunity_id, org_id, role');
const linkKeySet = new Set();
for (const l of existingLinks ?? []) {
  if (l.org_id) linkKeySet.add(`${l.opportunity_id}|${l.org_id}|${l.role}`);
}

// ─── Step 6: build link payload ──────────────────────────────────────────────
const linkPayload = [];

function addLink(oppId, orgId, role, status = null) {
  if (!oppId || !orgId) return;
  const key = `${oppId}|${orgId}|${role}`;
  if (linkKeySet.has(key)) return;
  linkKeySet.add(key);
  linkPayload.push({ opportunity_id: oppId, org_id: orgId, role, status });
}

// Apply: sponsor → organizer
// Contract: counterparty → organizer
for (const item of items) {
  const opp = oppByUrl.get(item.url);
  if (!opp) continue;
  const sponsor = item.details?.sponsor?.org_name;
  if (item.track === 'apply' && sponsor) {
    const o = orgByName.get(sponsor.toLowerCase());
    if (o) addLink(opp.id, o.id, 'organizer');
  }
  const counterparty = item.details?.counterparty?.org_name;
  if (item.track === 'contract' && counterparty) {
    const o = orgByName.get(counterparty.toLowerCase());
    if (o) addLink(opp.id, o.id, 'organizer');
  }
}

// Events: organizer field → organizer role
for (const { item, orgNames } of eventOrganizerLinks) {
  const opp = oppByUrl.get(item.url);
  if (!opp) continue;
  for (const n of orgNames) {
    if (SKIP_NAMES.has(n.toLowerCase())) continue;
    const o = orgByName.get(n.toLowerCase());
    if (o) addLink(opp.id, o.id, 'organizer');
  }
}

// Watch: related_companies → attendee role (subject of news)
for (const { item, orgNames } of watchSubjectLinks) {
  const opp = oppByUrl.get(item.url);
  if (!opp) continue;
  for (const n of orgNames) {
    if (SKIP_NAMES.has(n.toLowerCase())) continue;
    const o = orgByName.get(n.toLowerCase());
    if (o) addLink(opp.id, o.id, 'attendee', 'Other');
  }
}

console.log(`🔗 ${linkPayload.length} new opportunity_people links to insert`);
if (linkPayload.length > 0) {
  const { error: linkErr } = await supabase.from('opportunity_people').insert(linkPayload);
  if (linkErr) {
    console.error('❌ Failed to insert links:', linkErr);
    process.exit(1);
  }
  console.log(`✓ Inserted ${linkPayload.length} links\n`);
}

// ─── Final summary ───────────────────────────────────────────────────────────
const { data: finalOrgs } = await supabase.from('organizations').select('relationship_status');
const counts = { known: 0, prospect: 0, cold: 0, archived: 0 };
for (const o of finalOrgs ?? []) counts[o.relationship_status]++;

console.log('📊 Final org status breakdown:');
console.log(`   🟢 known     ${counts.known}`);
console.log(`   🟡 prospect  ${counts.prospect}`);
console.log(`   ⚪ cold      ${counts.cold}`);
console.log(`   ⚫ archived  ${counts.archived}`);
console.log(`   ──────────`);
console.log(`   TOTAL        ${(finalOrgs ?? []).length}`);
console.log('\n🎉 Done!');
