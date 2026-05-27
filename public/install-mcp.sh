#!/usr/bin/env bash
# LOCOL MCP installer — sets up Claude Desktop to talk to the LOCOL Workspace
# Run: curl -fsSL https://locol-workspace.vercel.app/install-mcp.sh | bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DIM='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${GREEN}${BOLD}┌─ LOCOL MCP Server Installer ────────────────────────┐${NC}"
echo -e "${GREEN}${BOLD}│  Sets up Claude Desktop to talk to LOCOL Workspace  │${NC}"
echo -e "${GREEN}${BOLD}└─────────────────────────────────────────────────────┘${NC}"
echo ""

# ─── 1. Check Node.js ──────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ Node.js not found.${NC}"
  echo "   Install Node 20+ first: https://nodejs.org/  or  brew install node"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo -e "${RED}❌ Node $NODE_VER found, but need >= 20.${NC}"
  echo "   Update: brew upgrade node  or  https://nodejs.org/"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node $(node -v)"

# ─── 2. Check OS ───────────────────────────────────────────────
OS=$(uname)
if [ "$OS" = "Darwin" ]; then
  CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [ "$OS" = "Linux" ]; then
  CONFIG_DIR="$HOME/.config/Claude"
else
  echo -e "${RED}❌ Windows users: please follow manual setup at${NC}"
  echo "   https://locol-workspace.vercel.app/SETUP-FOR-TEAM.md"
  exit 1
fi
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
echo -e "${GREEN}✓${NC} OS: $OS"

# ─── 3. Install MCP server globally ────────────────────────────
echo ""
echo -e "${BOLD}📦 Installing @locol/mcp-server...${NC}"
npm install -g https://locol-workspace.vercel.app/locol-mcp.tgz 2>&1 | grep -E "(added|changed|removed|err|warn)" || true

LOCOL_BIN=$(which locol-mcp 2>/dev/null || true)
if [ -z "$LOCOL_BIN" ]; then
  echo -e "${RED}❌ Install failed — 'locol-mcp' command not found in PATH.${NC}"
  echo "   Try: npm install -g https://locol-workspace.vercel.app/locol-mcp.tgz"
  exit 1
fi
echo -e "${GREEN}✓${NC} Installed: $LOCOL_BIN"

# ─── 4. Prompt for service key ─────────────────────────────────
echo ""
echo -e "${BOLD}🔐 LOCOL Supabase Service Key${NC}"
echo -e "${DIM}   Get this from the LOCOL admin (it's the sb_secret_... key)${NC}"
echo -e "${DIM}   ⚠ Sensitive — like a password. Don't share or commit.${NC}"
echo ""
# Read from /dev/tty so it works when script is piped from curl
read -rsp "   Paste SUPABASE_SERVICE_KEY: " SUPABASE_SERVICE_KEY < /dev/tty
echo ""

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo -e "${RED}❌ No key provided. Aborting.${NC}"
  exit 1
fi
if [[ ! "$SUPABASE_SERVICE_KEY" =~ ^sb_secret_ ]]; then
  echo -e "${YELLOW}⚠  Key doesn't start with 'sb_secret_' — proceeding anyway.${NC}"
fi
echo -e "${GREEN}✓${NC} Key received (${#SUPABASE_SERVICE_KEY} chars)"

# ─── 5. Merge into Claude Desktop config ───────────────────────
mkdir -p "$CONFIG_DIR"

# Use node to safely merge JSON (jq might not be installed)
node -e "
const fs = require('fs');
const path = '$CONFIG_FILE';
let cfg = {};
if (fs.existsSync(path)) {
  try { cfg = JSON.parse(fs.readFileSync(path, 'utf8')); } catch (e) {
    console.error('⚠  Existing config is invalid JSON. Backing up to ${CONFIG_FILE}.bak');
    fs.copyFileSync(path, path + '.bak');
    cfg = {};
  }
}
cfg.mcpServers = cfg.mcpServers || {};
cfg.mcpServers.locol = {
  command: 'locol-mcp',
  env: {
    SUPABASE_URL: 'https://nfxjqddqaidvykdghlxg.supabase.co',
    SUPABASE_SERVICE_KEY: '$SUPABASE_SERVICE_KEY'
  }
};
fs.writeFileSync(path, JSON.stringify(cfg, null, 2));
console.log('✓ Config written to:', path);
" || { echo -e "${RED}❌ Failed to write config${NC}"; exit 1; }

echo ""
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  ✓ Installed!                                      ║${NC}"
echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}🚀 Next steps:${NC}"
echo ""
echo "  1. ${BOLD}Quit Claude Desktop completely${NC} (Cmd+Q · not just close window)"
echo "  2. Reopen Claude Desktop"
echo "  3. Look for the ${BOLD}🔌 plug icon${NC} in the chat input — that means MCP is loaded"
echo "  4. Try asking Claude:"
echo "       ${DIM}\"ใน LOCOL มี contact ใครบ้างที่เป็น tier 1?\"${NC}"
echo "       ${DIM}\"สร้าง opportunity ใหม่ track Apply ชื่อ Test\"${NC}"
echo ""
echo -e "${DIM}Config location: $CONFIG_FILE${NC}"
echo -e "${DIM}To uninstall: npm uninstall -g @locol/mcp-server${NC}"
echo ""
