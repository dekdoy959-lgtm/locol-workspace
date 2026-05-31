# Setup (สำหรับ นน) — Bun

> LOCOL Workspace = Vite + React 19 + TS + Supabase + TanStack Query
> รันด้วย **Bun** ได้เลย (Bun รัน Vite + TS native ไม่ต้อง compile)

---

## 1. ดึงโค้ด + install

มี repo อยู่แล้ว:
```
git pull
bun install
```

ยังไม่มี — clone ใหม่:
```
git clone https://github.com/dekdoy959-lgtm/locol-workspace.git
cd locol-workspace
bun install
```

> ไม่มี dependency แปลก ๆ — animation ที่เพิ่งเพิ่ม (confetti, view transitions) เป็น dependency-free

---

## 2. `.env.local` (ของ นน เอง — ไม่อยู่ใน git)

สร้างไฟล์ `.env.local` ที่ root:
```
VITE_SUPABASE_URL=https://opms.locolbeef.com
VITE_SUPABASE_ANON_KEY=<anon key ของ Supabase นน>
```

> นน ใช้ Supabase self-host ของตัวเอง — ไม่ใช่ cloud ของทีม

---

## 3. รัน migrations บน Supabase ของ นน

รันที่ SQL Editor (หรือ psql) ให้ครบ `supabase/migrations/0001` → `0018`
ถ้าเคยรันบางส่วนแล้ว — เก็บที่เหลือ (ตัวใหม่ล่าสุด):
```
0016_event_reminder_alert_type.sql
0017_merge_contacts_v2.sql
0018_discord_attachments_private.sql
```
> ทุกตัว idempotent — รันซ้ำปลอดภัย
> ถ้า นน เคยรัน 0009 เวอร์ชันเก่า (มีบั๊ก `using(true)` บน INSERT policy) ให้รัน 0009 ใหม่ด้วย

---

## 4. รัน dev

```
bun run dev
```

เปิด http://localhost:5173

---

## คำสั่งที่ใช้บ่อย (Bun)

| งาน | คำสั่ง |
|---|---|
| dev server | `bun run dev` |
| type check | `bunx tsc -b` |
| lint | `bun run lint` |
| build | `bun run build` |
| preview build | `bun run preview` |

---

## โครงสร้างที่ควรรู้

| path | คือ |
|---|---|
| `src/types/opportunityDetails.ts` | field เฉพาะ track ทั้งหมด (สำคัญสำหรับ bot) |
| `src/types/contact.ts` | sub-data ของ contact (phones/emails/orgs…) |
| `supabase/migrations/` | schema (0001–0018) |
| `scripts/notifications/` | cron ส่งอีเมลเตือน (Resend) |
| `scripts/sync-supabase/sync.mjs` | mirror ข้อมูล cloud → self-host |
| `BOT-SCHEMA.md` | **spec ครบสำหรับ Bot ใส่ข้อมูล** ← อ่านอันนี้ |
| `REVIEW-FINDINGS.md` | สถานะงาน/บั๊กที่แก้ไปแล้ว |

---

## หมายเหตุ

- env ขึ้นต้น `VITE_` เท่านั้นถึงจะ expose ไป client (Vite rule)
- schema ต้องตรงกับโค้ด → รัน migration ให้ครบก่อน ไม่งั้น feature ใหม่ (reminder, discord private, merge v2) จะ error
- Bot ที่ใส่ข้อมูล → ใช้ **service_role key** (ฝั่ง server) ผ่าน RLS · ดูฟิลด์ทั้งหมดใน `BOT-SCHEMA.md`
