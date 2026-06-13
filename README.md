# LOCOL Workspace

Internal CRM + opportunity tracker for **LOCOL** — Thailand's low-carbon premium beef startup using cocoa-fed cattle for methane reduction.

> 🌐 **Live**: <https://locol-workspace.vercel.app>
> 📖 **Dev setup**: [`SETUP-DEV.md`](./SETUP-DEV.md)
> 📦 **Claude MCP for team**: <https://locol-workspace.vercel.app/SETUP-FOR-TEAM.md>
> 🎨 **Design system**: [`docs/`](./docs/) — tokens, elevation ladder & ADRs · 🤖 **Session rules**: [`CLAUDE.md`](./CLAUDE.md)

---

## ⚡ TL;DR

| Layer | Purpose |
|---|---|
| **People** | Contacts (`contacts`) · Organizations (`organizations`) · Groups (manual + smart) |
| **Opportunities** | 5-track inbox (ขอทุน · งานต้องทำ · ติดตามข่าว · สัญญา · อีเวนต์) |
| **Relations** | Cross-layer (contact ↔ org ↔ opp), 2-hop network graph |
| **Activity** | Notes · Interactions · Commitments · Milestones · Timeline |
| **Briefing** | Daily "what needs me today" with my/team toggle |
| **Notifications** | Bell popover · email alerts (Resend) · per-user prefs |
| **Search** | Global ⌘K search across all entities |
| **Realtime** | Supabase channels — live updates across tabs/team |
| **PWA + offline** | Install as mobile app · works offline with queue |
| **Claude MCP** | 20 tools so Claude Desktop can edit LOCOL directly |

---

## 🛠 Stack

- **Frontend**: Vite + React 19 + TypeScript
- **State**: TanStack Query (with localStorage persister for offline)
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime)
- **Auth**: Google OAuth (Calendar + Gmail scopes)
- **Email**: Resend (notifications script)
- **Hosting**: Vercel (auto-deploy from `main`)
- **Brand**: IBM Plex Sans Thai · Cod Gray + LOCOL green (`#99CE24`) · asymmetric `24px 0 24px 0` corners

---

## 📂 Repo layout

```
src/                    React app (pages, components, hooks, types)
supabase/migrations/    0001–0009 SQL migrations (run in order)
mcp-server/             MCP server for Claude Desktop integration
scripts/notifications/  Node script + Resend templates for daily emails
scripts/seed/           Data seeding (run once after fresh DB)
public/                 Static assets (manifest, icons, MCP installer)
```

---

## 🚀 Quick start

```bash
# 1. Clone
git clone https://github.com/<your-username>/locol-workspace.git
cd locol-workspace

# 2. Install
npm install

# 3. Env
cp .env.example .env.local
# Edit .env.local with your Supabase URL + Anon Key

# 4. Dev
npm run dev
# → http://localhost:5173
```

For full dev setup (Supabase, migrations, Google OAuth, Vercel deploy), see [`SETUP-DEV.md`](./SETUP-DEV.md).

---

## 🤖 Claude MCP

Want Claude Desktop to manage LOCOL data directly?
1-command install: <https://locol-workspace.vercel.app/SETUP-FOR-TEAM.md>

---

## 🔒 Security notes

- ✅ `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are **publishable** — safe in client + git
- ⚠️ `SUPABASE_SERVICE_KEY` (sb_secret_…) **bypasses RLS** — never commit · only in Vercel env vars + local Claude MCP config
- ⚠️ `RESEND_API_KEY` — never commit · only in cron environment
- RLS policies on all tables · auth required for everything except login
