# LOCOL · Supabase Data Sync

One-way mirror of all DB tables from one Supabase project to another.

## Use case

You have **production** Supabase (e.g. `opms.locolbeef.com`) and **staging/test** Supabase (e.g. cloud `nfxjqddqaidvykdghlxg`). You want the test environment to have the latest production data so you can test features against real data.

This script:
- **TRUNCATEs** all data tables in target (except `team_members` + `alert_log`)
- **COPIES** every row from source → target
- **Maps user_ids by email** since auth users differ between projects
- **Preserves** schema (tables/columns) on target — must already exist
- Skips Storage files (avatars, discord-attachments)

---

## Setup (one-time)

```bash
cd scripts/sync-supabase
npm install
```

---

## Run

### 1. Dry run first (safe — no writes)

```bash
SOURCE_URL='https://supabase-opms.locolbeef.com' \
SOURCE_SERVICE_KEY='sb_secret_AAA...' \
TARGET_URL='https://nfxjqddqaidvykdghlxg.supabase.co' \
TARGET_SERVICE_KEY='sb_secret_BBB...' \
npm run dry-run
```

Output shows:
- User mapping (how many users matched by email)
- Row counts that would be copied
- Tables missing on source/target

### 2. Live run

```bash
SOURCE_URL='https://supabase-opms.locolbeef.com' \
SOURCE_SERVICE_KEY='sb_secret_AAA...' \
TARGET_URL='https://nfxjqddqaidvykdghlxg.supabase.co' \
TARGET_SERVICE_KEY='sb_secret_BBB...' \
npm run sync
```

Has a 5-second delay before TRUNCATE so you can Ctrl+C.

---

## Getting service keys

Supabase Dashboard → **Settings → API Keys** → tab **"Publishable and secret"** → row labeled `default` → click 👁 → copy `sb_secret_…`

⚠️ **Service keys bypass RLS** — never commit or paste in chat. Use `1Password` or temporary env.

---

## What gets copied

Tables in FK dependency order:

```
organizations
contacts            (owner_id, backup_id, reviewer_id → mapped by email)
opportunities       (owner_id, reviewer_id → mapped)
opportunity_people
notes               (created_by → mapped)
interactions        (logged_by → mapped)
commitments
milestones          (created_by → mapped)
groups              (created_by → mapped)
group_members
relations
track_settings
user_alert_prefs    (user_id → mapped · upsert on conflict)
discord_inbox
```

## What is NOT touched

- **`team_members`** — auth-tied. Each project has independent auth.users. Existing teammates on target stay as-is.
- **`alert_log`** — log table; will accumulate fresh as alerts fire.
- **Storage objects** — avatars + discord-attachments live in storage buckets. URLs in DB rows still point to source bucket. If source is public, the images load. If source goes offline, images break. Run a separate storage-copy step if you need true mirroring.

---

## Limitations / known issues

1. **Pagination**: 1000 rows fetched at a time. If you have > 100k rows in one table, this is slow but works.

2. **User ID mapping** depends on `team_members.email` matching between projects. Users that exist on source but not target → their owned rows get `owner_id = null`.

   To prevent this: ensure all teammates have signed into BOTH projects (creates auth.users + team_members on each).

3. **No data validation**: If source schema has columns target doesn't, insert errors will be logged (we fall back to row-by-row). Run with `--dry-run` first to spot mismatches.

4. **No conflict resolution** other than upsert on `user_alert_prefs`. For wiped tables, this is fine — they start empty.

5. **Foreign key violations**: If translateRow nulls out a NOT-NULL FK (e.g. milestones.contact_id), the row fails. Currently we log + skip.

6. **Realtime triggers fire** during insert. If you have a lot of teammates with the app open, they'll see a flurry of updates. Coordinate before running in prod.

---

## Reverse direction

Want to sync staging → prod? Just swap SOURCE/TARGET env vars. ⚠️ **Don't do this casually** — prod has more data + risk.

---

## Re-running

Each run **wipes target** then copies fresh. Re-run anytime you want a fresh snapshot. No downtime on target during run (a few seconds of empty state between TRUNCATE and INSERT, then everything reappears).

To skip wipe (upsert mode):

```bash
SKIP_WIPE=true ... npm run sync
```

Useful when source has new rows but you've made local changes on target you want to preserve.
