# LOCOL Notifications · Email Alerts

Node script that scans the database for items needing alerts and sends emails via [Resend](https://resend.com).

Alerts include:
- 🚩 **Stale Opportunities** — `last_update_at` exceeded `track_settings.stale_threshold_days`
- 🥶 **Cold Contacts** — `last_contact_date` exceeded `freq_days`
- 🔔 **Reminder Notes** — future-dated notes with `is_future=true` hitting today
- 🎂 **Birthdays** — `birthday_notification_enabled=true` within 7 days

Sends one email per recipient per alert per day (dedup via `alert_log` table).

---

## 🛠 Setup (~10 minutes)

### 1. Sign up Resend
- Go to <https://resend.com> → Sign up (free: 100 emails/day, 3,000/month)
- Dashboard → **API Keys** → Create new → copy `re_...`

### 2. (Optional) Verify your domain
- For testing without verifying: skip this step. Default `FROM_EMAIL` = `onboarding@resend.dev` — but Resend will only send to YOUR signup email
- For production: Dashboard → **Domains** → Add domain → add DNS records (SPF, DKIM, DMARC) → wait for verification

### 3. Install
```bash
cd scripts/notifications
npm install
```

### 4. Test (dry run — no emails sent)
```bash
SUPABASE_SERVICE_KEY=sb_secret_xxx npm run dry-run
```

You'll see what WOULD be sent without actually sending.

### 5. Live run
```bash
RESEND_API_KEY=re_xxx \
SUPABASE_SERVICE_KEY=sb_secret_xxx \
FROM_EMAIL='onboarding@resend.dev' \
APP_URL=http://localhost:5173 \
npm run send
```

For verified domain:
```bash
FROM_EMAIL='LOCOL <noreply@locol.app>'
```

---

## ⏰ Schedule daily

### Option A · macOS launchd (recommended for personal use)

Create `~/Library/LaunchAgents/com.locol.notifications.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.locol.notifications</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/ddoyle/Desktop/LOCOL/Clude code/locol-workspace/scripts/notifications/run.mjs</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>SUPABASE_SERVICE_KEY</key><string>sb_secret_xxx</string>
    <key>RESEND_API_KEY</key><string>re_xxx</string>
    <key>FROM_EMAIL</key><string>onboarding@resend.dev</string>
    <key>APP_URL</key><string>http://localhost:5173</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>9</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key><string>/tmp/locol-notif.log</string>
  <key>StandardErrorPath</key><string>/tmp/locol-notif-err.log</string>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.locol.notifications.plist
```

Test manually:
```bash
launchctl start com.locol.notifications
tail -f /tmp/locol-notif.log
```

### Option B · External cron service
- <https://cron-job.org> · <https://www.easycron.com>
- Schedule daily POST to a webhook (you'd need to wrap the script in an HTTP server)

### Option C · Vercel Cron (if deployed)
- Add to `vercel.json` after deploying

### Option D · Supabase Edge Function + pg_cron
- Convert to Deno Edge Function · enable pg_cron extension
- See `supabase/functions/notify/` (future)

---

## 🧪 Manual run for testing

```bash
cd scripts/notifications
SUPABASE_SERVICE_KEY=sb_secret_xxx \
RESEND_API_KEY=re_xxx \
FROM_EMAIL='onboarding@resend.dev' \
APP_URL=http://localhost:5173 \
node run.mjs
```

---

## 🔐 Security

- `RESEND_API_KEY` — keep secret · never commit
- `SUPABASE_SERVICE_KEY` — keep secret · bypasses RLS
- Both should live in env vars or launchd plist · never in git

## 📊 Audit

Every sent email is logged in `alert_log` table. Query in Supabase:

```sql
SELECT alert_type, COUNT(*), MAX(sent_at)
FROM alert_log
WHERE sent_date >= current_date - 7
GROUP BY alert_type;
```
