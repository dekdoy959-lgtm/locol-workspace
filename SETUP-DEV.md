# LOCOL Workspace · Dev Setup

คู่มือสำหรับ **dev teammate** ที่จะมาช่วยพัฒนา + deploy LOCOL Workspace

> 🌐 Production: <https://locol-workspace.vercel.app>
> 📨 ขอ credentials (Supabase service key, Google OAuth client, Resend key) จาก admin

---

## 📋 Pre-requisite

- **Node.js 20+** → <https://nodejs.org/> หรือ `brew install node`
- **Git** → ติดมากับ Mac แล้ว · เช็คด้วย `git --version`
- **GitHub account** → ขอ admin add คุณเข้า repo (ถ้ายังไม่ใช่ collaborator)
- **Supabase account** → <https://supabase.com> (ฟรี) · ต้องการแค่ถ้าคุณจะมี dev DB ของตัวเอง
- **Vercel account** → <https://vercel.com> (ฟรี) · ต้องการถ้าจะ deploy preview ของตัวเอง

---

## ⚡ Quick start (~10 นาที)

### 1. Clone

```bash
git clone https://github.com/<admin-username>/locol-workspace.git
cd locol-workspace
```

### 2. Install dependencies

```bash
npm install
```

(จะใช้เวลา ~30s ติดตั้ง deps ของ Vite + React + Supabase + TanStack Query)

### 3. ตั้งค่า env

```bash
cp .env.example .env.local
```

แก้ `.env.local` ใส่:

```env
VITE_SUPABASE_URL=https://nfxjqddqaidvykdghlxg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxx
```

ขอ values จาก **admin** (ส่งทาง DM/1Password)

> 💡 `VITE_` prefix = ออกไป client ได้ · safe ที่จะ commit แต่ขั้นนี้ใส่ผ่าน env ก่อน

### 4. Run dev server

```bash
npm run dev
```

เปิด <http://localhost:5173>

ถ้า login ด้วย Google ไม่ได้ ให้ admin add `http://localhost:5173` ใน Supabase Auth redirect URLs

---

## 🗄 Supabase Database

Production DB อยู่ที่ Supabase project `nfxjqddqaidvykdghlxg`. มี 2 ทาง:

### A. ใช้ DB เดียวกับ production (ระวัง — ข้อมูลจริง)

ใส่ URL + Anon Key ของ production ใน `.env.local`

⚠️ **อย่าทดสอบ destructive operations** เช่น `DELETE FROM contacts`

### B. สร้าง DB dev ของตัวเอง (Recommended สำหรับ test)

1. ไปที่ <https://supabase.com> → สร้างโปรเจกต์ใหม่
2. **SQL Editor** → run migrations ตามลำดับ:
   ```
   supabase/migrations/0001_init.sql
   supabase/migrations/0002_contact_enhancements.sql
   supabase/migrations/0003_storage_policies.sql
   supabase/migrations/0004_milestones.sql
   supabase/migrations/0005_merge_function.sql
   supabase/migrations/0006_opportunity_people.sql
   supabase/migrations/0007_opportunity_details.sql
   supabase/migrations/0008_relationship_status.sql
   supabase/migrations/0009_email_notifications.sql
   ```
3. **Settings → API Keys** → copy `URL` + `anon` key → ใส่ใน `.env.local`
4. **Settings → Auth → URL Configuration** → เพิ่ม `http://localhost:5173/**` ใน Redirect URLs
5. **Settings → Auth → Providers → Google** → enable + ใส่ Client ID/Secret (ขอจาก admin)
6. ใส่ seed data:
   ```bash
   cd scripts/seed
   SUPABASE_SERVICE_KEY=sb_secret_xxx npm run seed
   ```

---

## 🌳 Branching workflow

```
main           ← production · auto-deploys to https://locol-workspace.vercel.app
  └─ feature/*  ← feature branches · Vercel auto-creates preview URL per push
```

### สร้าง feature

```bash
git checkout -b feature/your-feature-name
# ... make changes ...
git add .
git commit -m "add: contact tag autocomplete"
git push -u origin feature/your-feature-name
```

Vercel จะ:
- สร้าง **preview deployment** ที่ `https://locol-workspace-git-feature-your-feature-name-...vercel.app`
- Post URL ใน commit status

แชร์ preview URL ให้ทีม review ก่อน merge

### Merge to main

```bash
# Open PR ที่ GitHub
gh pr create --title "Add tag autocomplete" --body "..."

# หลัง review เสร็จ
gh pr merge --squash
```

Vercel auto-deploys to production ภายใน ~30s

---

## 🚀 Deploy (manual — สำหรับกรณีเร่งด่วน)

ปกติแล้ว push to `main` พอ Vercel จัดการเอง

แต่ถ้าอยาก deploy เครื่องของคุณตรง ๆ:

```bash
# 1. Link โปรเจกต์เข้ากับ Vercel ของคุณ (ครั้งเดียว)
npx vercel link
# เลือก existing project → locol-workspace

# 2. Deploy preview
npx vercel

# 3. Deploy production (ระวัง!)
npx vercel --prod
```

⚠️ Manual `--prod` deploy จะข้าม GitHub PR review — ใช้เฉพาะกรณี hotfix

---

## 🧪 Build + lint

```bash
# Type check + bundle
npm run build

# ESLint
npm run lint

# Preview production bundle locally
npm run preview
```

ก่อน push ควรรัน `npm run build` ให้ผ่านก่อน (Vercel จะ build ใหม่ ถ้า fail → deploy ก็ fail)

---

## 📐 โครงสร้างโค้ด

```
src/
├── pages/              # Page-level components (matches routes)
│   ├── briefing/       # Dashboard "what needs me today"
│   ├── inbox/          # 5-track kanban for opportunities
│   ├── contacts/       # CRUD + list + detail + merge
│   ├── organizations/  # CRUD + list + detail
│   ├── groups/         # Manual + smart groups
│   ├── relationships/  # SVG network graph (2-hop)
│   ├── milestones/     # Aggregate goals page
│   └── settings/       # Per-track + alert prefs
├── components/
│   ├── primitives/     # LCard, LBtn, LInput, LH, ... (design system)
│   ├── layout/         # AppLayout, BottomNav, UserMenu, NotificationBell
│   ├── forms/          # MultiValueField, OrgPicker, TagsField, ...
│   ├── notes/          # Timeline, NoteComposer
│   ├── milestones/     # MilestoneBoard
│   ├── relations/      # RelationsSection
│   ├── opportunities/  # OpportunityPeopleSection
│   ├── groups/         # RuleEditor (for smart groups)
│   ├── interactions/   # InteractionsSection
│   ├── commitments/    # CommitmentsSection
│   ├── contacts/       # ShareContactModal
│   └── search/         # GlobalSearch (⌘K modal)
├── hooks/              # useContacts, useOpportunities, useRealtimeSync, ...
├── lib/                # supabase, smart group rules, vcard, google APIs
├── contexts/           # AuthContext
├── types/              # database, contact, opportunity, ...
└── styles/             # tokens (colors, spacing, mq), global.css

supabase/migrations/    # SQL migrations 0001-0009 (run in order)
mcp-server/             # MCP server for Claude Desktop (separate npm package)
scripts/notifications/  # Daily Node + Resend email script
scripts/seed/           # Initial data seeding (run once)
public/                 # Static — manifest.webmanifest, icons, MCP tarball
```

---

## 🎨 Design system

ใช้ **inline styles** + **design tokens** จาก `src/styles/tokens.ts`:

```tsx
import { LCard, LH, LBtn } from '../../components/primitives';
import { colors } from '../../styles/tokens';

<LCard padding={20}>
  <LH level={3} sub="คำอธิบาย">TITLE</LH>
  <LBtn primary onClick={...}>SAVE</LBtn>
</LCard>
```

**กฎ:**
- ❌ ห้ามใช้ CSS classes (ยกเว้น utility ใน `global.css` เช่น `.l-hide-mobile`)
- ❌ ห้าม install Tailwind / styled-components
- ❌ ห้าม hardcode color เช่น `#101010` — ใช้ `colors.bg`
- ✅ ทุก component ใหม่ใช้ asymmetric radius `'14px 0 14px 0'`
- ✅ ใช้ `LIcon` แทน SVG ตรง ๆ ถ้ามี icon ที่ต้องการอยู่แล้ว
- ✅ Thai UI text · English code/comments

---

## 🤖 Claude integration

โปรเจกต์มี **MCP server** ที่ทำให้ Claude Desktop สั่งงาน LOCOL ได้:

```bash
# ติดตั้ง (1 command)
curl -fsSL https://locol-workspace.vercel.app/install-mcp.sh | bash
```

ดู `mcp-server/README.md` สำหรับวิธี dev MCP server เอง

---

## 🔐 Secrets management

| Secret | Where it lives | Who has access |
|---|---|---|
| `SUPABASE_SERVICE_KEY` | Vercel env vars + local Claude MCP config | Admin + each dev's MCP config |
| `RESEND_API_KEY` | Notification cron env only | Admin |
| Google OAuth Client Secret | Supabase Auth provider config | Admin |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` + Vercel env vars + can be in git (publishable) | Everyone (it's RLS-protected) |

**ห้าม:**
- ❌ Commit `.env.local`
- ❌ Hardcode service key ในโค้ด
- ❌ ส่ง service key ใน group chat — ใช้ DM / 1Password share
- ❌ Push branch ที่มี secret โดยไม่เช็คก่อน (`git diff --staged`)

ถ้า leak โดยไม่ตั้งใจ:
1. Admin ไป Supabase → rotate key
2. อัปเดต Vercel env vars
3. อัปเดต Claude MCP config ของทุกคน

---

## 🐛 Common issues

### `White screen` หลัง deploy
→ Env vars ไม่อยู่ใน Vercel · เช็คด้วย `vercel env ls`

### `Login redirect ไป localhost`
→ Supabase Auth → Site URL ผิด · ต้องเป็น URL prod ของคุณ

### `404 NOT FOUND` หลัง deploy
→ ไม่มี `vercel.json` หรือ SPA rewrite ผิด · เช็คไฟล์ `vercel.json` ที่ root

### `npm install` ค้าง
→ ลอง `rm -rf node_modules package-lock.json && npm install`

### `tsc -b` error เกี่ยวกับ `database.ts`
→ Types สร้างจาก Supabase schema — ถ้า schema เปลี่ยน ต้อง regenerate · ขอ admin run

---

## 🆘 ติดต่อ admin

ติดปัญหา หรือต้องการ credentials ติดต่อ **<locol.beef@gmail.com>**

---

## 📚 อ่านเพิ่ม

- [Vite docs](https://vite.dev/)
- [TanStack Query docs](https://tanstack.com/query/latest)
- [Supabase docs](https://supabase.com/docs)
- [Vercel docs](https://vercel.com/docs)
- LOCOL brand guideline: ดูใน `src/styles/tokens.ts`
