# 🚀 AUTOMATED COLLABORATION STARTER

## 📋 Quick Launch Commands

### Option 1: Direct Terminal Launch
**In Terminal 1 (Kimi):**
```powershell
cd "c:\Users\mahro\Desktop\prime-hotels-intranet-master"
kimi --mcp-config-file .codex/mcp-kimi-only.json "Read .codex/messages/codex-to-kimi.md and start assessment"
```

**In Terminal 2 (Codex):**
```powershell
cd "c:\Users\mahro\Desktop\prime-hotels-intranet-master"
codex --config mcp.config=.codex/mcp.json --yolo
```

### Option 2: One-Command Launch
```powershell
# Terminal 1
kimi --mcp-config-file .codex/mcp-kimi-only.json "Your prompt here"

# Terminal 2  
codex --config mcp.config=.codex/mcp.json --yolo "Your prompt here"
```

## 🎯 What This Does

- **Kimi**: Reads Codex's instructions and executes tasks
- **Codex**: Auto-approves all MCP requests with --yolo flag
- **No manual approval needed**: Both AIs work autonomously

## 🔄 Communication Files

- **Codex → Kimi**: `.codex/messages/codex-to-kimi.md`
- **Kimi → Codex**: `.codex/messages/kimi-to-codex.md`

## 🚀 Ready Commands

Copy-paste these in separate terminals:

**Terminal 1:**
```bash
kimi --mcp-config-file .codex/mcp-kimi-only.json "Read .codex/messages/codex-to-kimi.md and start assessment"
```

**Terminal 2:**
```bash
codex --config mcp.config=.codex/mcp.json --yolo "Read .codex/messages/kimi-to-codex.md and provide leadership"
```

## ✅ Benefits

- **No manual approvals** needed (--yolo flag)
- **Full MCP access** for both AIs
- **Autonomous collaboration** between AIs
- **File-based messaging** maintains communication log

**START BOTH TERMINALS NOW!** 🚀
