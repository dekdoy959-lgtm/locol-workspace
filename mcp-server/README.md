# LOCOL Workspace · MCP Server

Stdio MCP server that gives **Claude Desktop** and **Claude Code** access to your LOCOL Workspace data.

Once configured, you can chat with Claude and have it:

- Create contacts, organizations, opportunities, notes, milestones, groups
- Search across all entities
- Log future-dated reminders
- Connect contacts via relations (introduced-by, mentor, coworker, ฯลฯ)
- Update opportunity stages, link organizers + attendees
- Pull current state of your network

## 🛠 Setup (5 minutes per user)

### 1. Install dependencies + build

From this directory:

```bash
cd mcp-server
npm install
npm run build
```

This creates `dist/index.js`.

### 2. Get the Supabase **service_role** key

⚠️ **Sensitive!** Treat like a password. Only paste it into your local Claude Desktop config.

1. Go to <https://supabase.com/dashboard> → your project (`dekdoy959-...`)
2. **Settings → API Keys** → tab **"Publishable and secret API keys"**
3. Under **"Secret keys"** → find row labeled `default` → click 👁 eye → copy the `sb_secret_...` value

### 3. Configure Claude Desktop

Open Claude Desktop config:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

If file doesn't exist, create it. Add this entry:

```json
{
  "mcpServers": {
    "locol": {
      "command": "node",
      "args": ["/Users/ddoyle/Desktop/LOCOL/Clude code/locol-workspace/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://nfxjqddqaidvykdghlxg.supabase.co",
        "SUPABASE_SERVICE_KEY": "sb_secret_PASTE_HERE"
      }
    }
  }
}
```

If you have other MCP servers, just add the `locol` entry alongside them inside `mcpServers`.

### 4. Restart Claude Desktop

Fully quit and reopen. Look for the tools icon in the chat (🔌 plug or 🔨 hammer).

### 5. (For Claude Code users) — configure `~/.claude/settings.json`

```json
{
  "mcpServers": {
    "locol": {
      "command": "node",
      "args": ["/Users/ddoyle/Desktop/LOCOL/Clude code/locol-workspace/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://nfxjqddqaidvykdghlxg.supabase.co",
        "SUPABASE_SERVICE_KEY": "sb_secret_PASTE_HERE"
      }
    }
  }
}
```

Or run from project root:

```bash
claude mcp add locol -- node "$(pwd)/mcp-server/dist/index.js"
```

## 🧪 Test prompts

Try in Claude:

> "ใน LOCOL มี contact ใครบ้างที่เป็น tier 1?"
>
> *(Claude calls list_contacts → returns rows)*

> "เพิ่ม contact ใหม่ ชื่อ คุณนภา สกุล วงศ์ใหญ่ เบอร์ 089-555-1234 อีเมล napha@vongyai.co.th
> เป็น tier 2 ทำงานที่ Vongyai Holdings ตำแหน่ง Marketing Director เป็น org primary"
>
> *(Claude calls create_contact with full payload)*

> "สร้าง opportunity ใหม่ track Apply ชื่อ 'Climate Curve $200k methane prize' due 30 พฤศจิกายน
> priority สูง sponsor คือ FIL-IDF (ถ้าไม่มี org นี้สร้างใหม่)"
>
> *(Claude: list_organizations → search 'FIL-IDF' → create_organization → create_opportunity with sponsor link)*

> "ใครรู้จัก Khun Aroon บ้าง?"
>
> *(Claude: search 'Aroon' → get_contact → returns relations)*

> "เพิ่ม milestone ฝั่งเราว่า 'อยากให้ Chai รับเป็น advisor' กับ Somchai Wattana
> เป้าหมายภายใน 3 เดือน"
>
> *(Claude: search 'Somchai Wattana' → add_milestone)*

> "log note วันนี้กับ Pim ว่า 'คุยเรื่อง partnership ภาคเหนือ น่าสนใจ' #partnership"
>
> *(Claude: search 'Pim' → add_note with tags)*

## 🧰 Available tools (20)

| Category | Tools |
|---|---|
| **Search** | `search` (unified) |
| **Contacts** | `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `delete_contact` |
| **Organizations** | `list_organizations`, `get_organization`, `create_organization`, `update_organization` |
| **Opportunities** | `list_opportunities`, `get_opportunity`, `create_opportunity`, `update_opportunity`, `add_opportunity_person` |
| **Notes** | `add_note`, `list_notes` |
| **Milestones** | `add_milestone` |
| **Relations** | `create_relation` |
| **Groups** | `list_groups`, `create_group`, `add_to_group` |
| **Team** | `list_team_members` |

## 🔒 Security notes

- **The `sb_secret_...` key bypasses RLS** — anyone with it has admin access to your LOCOL database.
- Stored only in your local Claude config file, never committed to git.
- Each team member who wants Claude access needs their own copy of this config + the secret key.
- If a team member leaves, **rotate the secret key in Supabase Settings → API Keys → "+ New secret key"**, then update remaining team members' configs.

## 🐛 Troubleshooting

**"No tools available"** — Claude Desktop didn't load the server.
- Check the config JSON is valid (use https://jsonlint.com)
- Check the `args` path points to the actual built `dist/index.js`
- Look at Claude Desktop logs: `~/Library/Logs/Claude/`

**"Missing SUPABASE_URL or SUPABASE_SERVICE_KEY"** — env vars not picked up.
- Make sure `env` block is inside the `locol` server entry
- Restart Claude Desktop fully (quit, not just close window)

**Tool calls return errors** — check Supabase dashboard for the actual SQL error. Common causes:
- Foreign key violations (e.g. passing contact_id that doesn't exist)
- Required fields missing
- Migration not run (run all `supabase/migrations/*.sql` files)

## 🔄 Updates

After pulling new code:

```bash
cd mcp-server
npm install   # if dependencies changed
npm run build
```

Then restart Claude Desktop.
