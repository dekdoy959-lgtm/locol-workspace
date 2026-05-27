# LOCOL · ใช้ Claude ดูแล Workspace ผ่าน MCP

ติดตั้งครั้งเดียว แล้วใช้ Claude Desktop (หรือ Claude Code) สั่งงาน LOCOL ด้วยภาษาธรรมชาติได้เลย

ตัวอย่างที่ใช้ได้:

> "ใน LOCOL ใครเป็น tier 1 บ้าง?"
> "เพิ่ม contact ใหม่ ชื่อคุณนภา เบอร์ 089-555-1234 ที่ Vongyai Holdings"
> "สร้าง opportunity track Apply ชื่อ 'Climate Curve $200k methane prize' due 30 พ.ย. priority สูง"
> "log note วันนี้กับ Pim ว่า 'คุยเรื่อง partnership ภาคเหนือ น่าสนใจ'"
> "ใครรู้จัก Khun Aroon บ้าง?"

---

## ⚡ ติดตั้งเร็ว (macOS / Linux · 2 นาที)

### Pre-requisite

- **Node.js 20+** — เช็คด้วย `node -v` ถ้าน้อยกว่า 20 ติดตั้งใหม่ที่ <https://nodejs.org/> หรือ `brew install node`
- **Claude Desktop** — โหลดจาก <https://claude.ai/download>

### ติดตั้ง 1 คำสั่ง

เปิด Terminal แล้ว paste บรรทัดนี้:

```bash
curl -fsSL https://locol-workspace.vercel.app/install-mcp.sh | bash
```

มันจะ:

1. ✅ เช็ค Node version
2. ✅ ติดตั้ง `@locol/mcp-server` แบบ global
3. 🔐 ถาม **Supabase Service Key** จากคุณ — *ขอจาก admin ทีม LOCOL*
4. ✅ เขียน config ลง Claude Desktop ให้อัตโนมัติ (merge กับของเดิม · ไม่ทับ MCP อื่น)

---

### หลังติดตั้ง

1. **Quit Claude Desktop เต็ม** (กด `⌘Q` · ไม่ใช่แค่ปิดหน้าต่าง)
2. เปิดใหม่
3. ดูที่ช่องพิมพ์ — ถ้ามี **🔌 ปลั๊กไอคอน** = MCP load สำเร็จ
4. ลองพิมพ์ใน chat:
   > "ใน LOCOL มี contact ใครบ้าง?"

Claude จะเรียก tool `list_contacts` แล้วตอบคุณ ✨

---

## 🔧 Setup แบบ Manual (ถ้า script ไม่ทำงาน หรือใช้ Windows)

### 1. ติดตั้ง MCP server

```bash
npm install -g https://locol-workspace.vercel.app/locol-mcp.tgz
```

ตรวจสอบ:

```bash
which locol-mcp   # ต้องเจอ path เช่น /usr/local/bin/locol-mcp
```

### 2. เปิดไฟล์ config ของ Claude Desktop

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

ถ้าไม่มีไฟล์ สร้างใหม่ ใส่:

```json
{
  "mcpServers": {
    "locol": {
      "command": "locol-mcp",
      "env": {
        "SUPABASE_URL": "https://nfxjqddqaidvykdghlxg.supabase.co",
        "SUPABASE_SERVICE_KEY": "sb_secret_PASTE_HERE"
      }
    }
  }
}
```

> ถ้ามี MCP server อื่นอยู่แล้ว เพิ่ม `locol` เข้าไปใน `mcpServers` ที่มีอยู่ — อย่าทับของเดิม

### 3. Restart Claude Desktop

`⌘Q` แล้วเปิดใหม่

---

## 🔐 ขอ Supabase Service Key

⚠️ Service key = รหัสที่ bypass RLS — ทุกคนที่ได้ key นี้เข้าถึง LOCOL database ได้เต็ม

ขอจาก **admin LOCOL** (คุณ ddoyle / `locol.beef@gmail.com`)

Admin หา key ได้ที่:

1. <https://supabase.com/dashboard/project/nfxjqddqaidvykdghlxg/settings/api-keys>
2. Tab **Publishable and secret API keys** → Section **Secret keys**
3. คลิก 👁 ที่ row `default` → copy `sb_secret_...`

ถ้าทีมเดินออก admin จะ rotate key + แจกใหม่ให้คนเหลือ

---

## 🧪 ลองสั่ง Claude เลย

```
"แสดงรายการ tier 1 contacts ใน LOCOL"
"สร้าง contact ใหม่ ชื่อ Aroon Wongsangiam เบอร์ 089-123-4567 อีเมล aroon@example.com tier 2 ทำงานที่ ABC Co."
"แสดง opportunities ที่ stale > 14 วัน"
"ใครเป็น sponsor ของ Climate Curve prize?"
"add milestone กับ Khun Somchai ว่า 'ขอ pitch deck review' ภายใน 2 สัปดาห์"
"สร้าง group ใหม่ชื่อ 'Q1 leads' แบบ smart group ที่ tier=1 และ status=prospect"
```

---

## 🛠 Tools ทั้งหมด (20 ตัว)

| หมวด | Tools |
|---|---|
| **Search** | `search` (unified search ทุก entity) |
| **Contacts** | list / get / create / update / delete |
| **Organizations** | list / get / create / update |
| **Opportunities** | list / get / create / update + `add_opportunity_person` |
| **Notes** | add (รองรับ future reminder) / list |
| **Milestones** | add |
| **Relations** | create (introduced-by · mentor · coworker · etc.) |
| **Groups** | list / create / add_to_group (manual + smart) |
| **Team** | list_team_members |

---

## 🐛 Troubleshooting

### "No tools available" ใน Claude Desktop

- Config JSON ผิด format → ตรวจที่ <https://jsonlint.com>
- Claude Desktop ไม่ได้ restart เต็ม → กด `⌘Q` แล้วเปิดใหม่
- ตรวจ log: `tail -f ~/Library/Logs/Claude/mcp*.log`

### "command not found: locol-mcp"

```bash
# Re-install
npm install -g https://locol-workspace.vercel.app/locol-mcp.tgz

# Check where npm globals go
npm config get prefix

# Make sure PATH includes that prefix + /bin
```

### Tool errors

ตรวจ Supabase dashboard ดู actual SQL error · มัก:

- Foreign key violations (ส่ง id ที่ไม่มีอยู่)
- Required field ขาด
- Migration ไม่ได้รัน (admin ต้องรัน `supabase/migrations/*.sql` ก่อน)

### Connection error / network timeout

- ตรวจ internet
- ตรวจว่า Supabase URL ถูกใน config
- ตรวจ key ไม่หมดอายุ / ไม่โดน rotate

---

## 🔄 Update

```bash
npm install -g https://locol-workspace.vercel.app/locol-mcp.tgz
```

แล้ว restart Claude Desktop

---

## 🌐 ลิงก์ที่เกี่ยวข้อง

- **Web app**: <https://locol-workspace.vercel.app>
- **MCP installer**: <https://locol-workspace.vercel.app/install-mcp.sh>
- **MCP tarball**: <https://locol-workspace.vercel.app/locol-mcp.tgz>
- **คู่มือนี้**: <https://locol-workspace.vercel.app/SETUP-FOR-TEAM.md>
