#!/usr/bin/env node
/**
 * LOCOL · One-way Supabase sync
 *
 * Copies ALL DB rows from a SOURCE Supabase project to a TARGET project.
 *
 * Required env vars:
 *   SOURCE_URL          e.g. https://supabase-opms.locolbeef.com
 *   SOURCE_SERVICE_KEY  sb_secret_... or service_role JWT
 *   TARGET_URL          e.g. https://nfxjqddqaidvykdghlxg.supabase.co
 *   TARGET_SERVICE_KEY  sb_secret_... or service_role JWT
 *
 * Optional:
 *   DRY_RUN=true        Don't write to target, just print what would happen
 *   SKIP_WIPE=true      Don't TRUNCATE — useful for upsert-style runs
 *
 * Strategy:
 *   1. Build user_id mapping by email (team_members) — source IDs → target IDs
 *      Reason: Supabase auth.users are project-specific, so user UUIDs differ.
 *      Any column that references team_members (owner_id, logged_by, etc.)
 *      gets translated. Unmapped → null.
 *   2. TRUNCATE target tables in REVERSE FK order (skip team_members + auth).
 *   3. INSERT into target tables in FK order, in batches of 500.
 *   4. Pagination from source: 1000 rows per fetch.
 *
 * Tables NOT touched in target:
 *   - team_members (auth-tied; users log in themselves)
 *   - alert_log    (log table; will rebuild as alerts fire)
 *
 * Storage files (avatars, discord-attachments) are NOT copied. URLs in DB
 * rows still point to source bucket — they'll work as long as source bucket
 * is public.
 */

import { createClient } from '@supabase/supabase-js';

const SOURCE_URL = process.env.SOURCE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_KEY;
const TARGET_URL = process.env.TARGET_URL;
const TARGET_KEY = process.env.TARGET_SERVICE_KEY;
const DRY_RUN = process.env.DRY_RUN === 'true';
const SKIP_WIPE = process.env.SKIP_WIPE === 'true';

if (!SOURCE_URL || !SOURCE_KEY || !TARGET_URL || !TARGET_KEY) {
  console.error('❌ Missing required env vars. Set SOURCE_URL, SOURCE_SERVICE_KEY, TARGET_URL, TARGET_SERVICE_KEY');
  process.exit(1);
}

if (SOURCE_URL === TARGET_URL) {
  console.error('❌ SOURCE_URL === TARGET_URL — refusing to copy to self');
  process.exit(1);
}

const source = createClient(SOURCE_URL, SOURCE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const target = createClient(TARGET_URL, TARGET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Table copy plan ─────────────────────────────────────────────────────────
// FK dependency order. Wipe in reverse. Insert in this order.
// Each entry: table name + columns that contain user_ids (for mapping)
const COPY_PLAN = [
  { table: 'organizations',         userCols: [] },
  { table: 'contacts',              userCols: ['owner_id', 'backup_id', 'reviewer_id'] },
  { table: 'opportunities',         userCols: ['owner_id', 'reviewer_id'] },
  { table: 'opportunity_people',    userCols: [] },
  { table: 'notes',                 userCols: ['created_by'] },
  { table: 'interactions',          userCols: ['logged_by'] },
  { table: 'commitments',           userCols: [] },
  { table: 'milestones',            userCols: ['created_by'] },
  { table: 'groups',                userCols: ['created_by'] },
  { table: 'group_members',         userCols: [] },
  { table: 'relations',             userCols: [] },
  { table: 'track_settings',        userCols: [] },
  { table: 'user_alert_prefs',      userCols: ['user_id'], pkConflict: 'user_id' },
  { table: 'discord_inbox',         userCols: [] },
];

// Tables we never touch in target
const PROTECTED = new Set(['team_members', 'alert_log']);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const stats = { wiped: {}, copied: {}, skipped: {}, errors: 0 };

async function buildUserMap() {
  console.log('\n👥 Building user mapping by email…');
  const [srcRes, tgtRes] = await Promise.all([
    source.from('team_members').select('id, email').not('email', 'is', null),
    target.from('team_members').select('id, email').not('email', 'is', null),
  ]);
  if (srcRes.error) throw new Error(`Source team_members: ${srcRes.error.message}`);
  if (tgtRes.error) throw new Error(`Target team_members: ${tgtRes.error.message}`);

  const tgtByEmail = new Map();
  for (const t of tgtRes.data ?? []) {
    if (t.email) tgtByEmail.set(t.email.toLowerCase().trim(), t.id);
  }

  const mapping = new Map(); // source_id → target_id
  let mapped = 0;
  let unmapped = 0;
  const unmappedEmails = [];
  for (const s of srcRes.data ?? []) {
    if (!s.email) continue;
    const tgt = tgtByEmail.get(s.email.toLowerCase().trim());
    if (tgt) {
      mapping.set(s.id, tgt);
      mapped++;
    } else {
      unmapped++;
      unmappedEmails.push(s.email);
    }
  }
  console.log(`   ✓ Mapped ${mapped} users · ${unmapped} unmapped`);
  if (unmappedEmails.length) {
    console.log(`   ⚠ Unmapped (rows referencing these will get null user_id):`);
    for (const e of unmappedEmails) console.log(`     · ${e}`);
  }
  console.log(`   Source: ${srcRes.data?.length ?? 0} users · Target: ${tgtRes.data?.length ?? 0} users`);
  return mapping;
}

function translateRow(row, userCols, userMap) {
  if (!userCols.length) return row;
  const out = { ...row };
  for (const col of userCols) {
    if (out[col] == null) continue;
    const mapped = userMap.get(out[col]);
    out[col] = mapped ?? null;
  }
  return out;
}

async function fetchAll(client, table) {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await client.from(table).select('*').range(from, from + PAGE - 1);
    if (error) {
      // Table doesn't exist on source — return empty
      if (error.code === '42P01' || /relation .* does not exist/i.test(error.message)) {
        console.log(`     · table '${table}' missing on source — skipping`);
        return null;
      }
      throw error;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function wipeTable(table) {
  if (SKIP_WIPE) return;
  if (DRY_RUN) {
    console.log(`     [DRY] would TRUNCATE ${table}`);
    return;
  }
  // Use service key + DELETE WHERE id is not null (matches every row with non-null PK).
  // Discord_inbox has uuid PK named "id"; same for all our tables except track_settings + user_alert_prefs.
  let column = 'id';
  if (table === 'track_settings') column = 'track';
  if (table === 'user_alert_prefs') column = 'user_id';

  const { error, count } = await target.from(table).delete({ count: 'exact' }).not(column, 'is', null);
  if (error) {
    // 42P01 = relation does not exist
    if (error.code === '42P01' || /relation .* does not exist/i.test(error.message)) {
      console.log(`     · table '${table}' missing on target — skipping wipe`);
      return;
    }
    throw error;
  }
  stats.wiped[table] = count ?? 0;
}

async function insertBatch(table, rows, pkConflict) {
  if (rows.length === 0) return 0;
  if (DRY_RUN) {
    console.log(`     [DRY] would insert ${rows.length} rows into ${table}`);
    return rows.length;
  }
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    let q = target.from(table);
    if (pkConflict) {
      q = q.upsert(chunk, { onConflict: pkConflict });
    } else {
      q = q.insert(chunk);
    }
    const { error } = await q;
    if (error) {
      console.error(`     ❌ Insert into ${table} failed (chunk ${i}-${i + chunk.length}): ${error.message}`);
      stats.errors++;
      // try one-at-a-time as fallback
      for (const row of chunk) {
        const r = pkConflict
          ? await target.from(table).upsert([row], { onConflict: pkConflict })
          : await target.from(table).insert([row]);
        if (r.error) {
          console.error(`        skip row ${row.id ?? '(no id)'}: ${r.error.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += chunk.length;
    }
  }
  return inserted;
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  LOCOL · Supabase data sync');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Source: ${SOURCE_URL}`);
console.log(`  Target: ${TARGET_URL}`);
console.log(`  Mode:   ${DRY_RUN ? '🧪 DRY RUN (no writes)' : '✏️  LIVE'}${SKIP_WIPE ? ' · skip wipe' : ''}`);
console.log(`  Protected (not touched): ${[...PROTECTED].join(', ')}`);
console.log('───────────────────────────────────────────────────────────────');

if (!DRY_RUN && !SKIP_WIPE) {
  console.log('\n⚠️  About to TRUNCATE these tables in TARGET:');
  for (const { table } of COPY_PLAN) console.log(`     · ${table}`);
  console.log('     (team_members + alert_log will be PRESERVED)');
  console.log('\n   Sleeping 5s — Ctrl+C now to abort…\n');
  await new Promise((r) => setTimeout(r, 5000));
}

const userMap = await buildUserMap();

if (!SKIP_WIPE) {
  console.log('\n🗑  Wiping target tables (reverse FK order)…');
  for (const { table } of [...COPY_PLAN].reverse()) {
    try {
      await wipeTable(table);
      const c = stats.wiped[table];
      if (c !== undefined) console.log(`   ✓ ${table.padEnd(22)} wiped ${c}`);
    } catch (e) {
      console.error(`   ❌ ${table}: ${e.message ?? e}`);
      stats.errors++;
    }
  }
}

console.log('\n📋 Copying tables (FK order)…');
for (const { table, userCols, pkConflict } of COPY_PLAN) {
  try {
    process.stdout.write(`   · ${table.padEnd(22)} `);
    const rows = await fetchAll(source, table);
    if (rows === null) {
      stats.skipped[table] = 'missing on source';
      continue;
    }
    const translated = rows.map((r) => translateRow(r, userCols, userMap));
    const inserted = await insertBatch(table, translated, pkConflict);
    stats.copied[table] = inserted;
    console.log(`copied ${inserted}/${rows.length}`);
  } catch (e) {
    console.error(`\n   ❌ ${table}: ${e.message ?? e}`);
    stats.errors++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  📊 Summary');
console.log('═══════════════════════════════════════════════════════════════');
let totalCopied = 0;
for (const [t, c] of Object.entries(stats.copied)) {
  console.log(`   ${t.padEnd(22)} ${String(c).padStart(6)}`);
  totalCopied += c;
}
if (Object.keys(stats.skipped).length) {
  console.log('\n   Skipped tables:');
  for (const [t, reason] of Object.entries(stats.skipped)) console.log(`     · ${t}: ${reason}`);
}
console.log(`\n   Total rows copied: ${totalCopied}`);
console.log(`   Errors: ${stats.errors}`);
console.log(`   Mode: ${DRY_RUN ? 'DRY RUN — nothing was written' : 'LIVE — target was modified'}\n`);

if (stats.errors > 0) process.exit(1);
console.log('🎉 Done\n');
