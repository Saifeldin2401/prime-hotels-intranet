# 🚀 DUAL AI TERMINAL SETUP

## 📋 Instructions

### Terminal 1 (Magenta - Kimi)
```powershell
# Run this in Terminal 1
.\setup-kimi.ps1
```

### Terminal 2 (Cyan - Codex)
```powershell
# Run this in Terminal 2
.\setup-codex.ps1
```

## 🎯 What This Does

| Terminal | Sets | Purpose |
|----------|--------|---------|
| **Kimi** | Environment variables + MCP config | AI monitoring & coordination |
| **Codex** | Environment variables + MCP config | AI validation & database queries |

## 🔄 Communication Flow

```
Kimi (Terminal 1) ←→ .codex/messages/ ←→ Codex (Terminal 2)
```

## 📝 Files Created

- `setup-kimi.ps1` - Kimi terminal configuration
- `setup-codex.ps1` - Codex terminal configuration
- `.codex/messages/` - Communication bridge between AIs

## 🚀 Launch Sequence

1. **Open Terminal 1** (Magenta) → Run `.\setup-kimi.ps1`
2. **Open Terminal 2** (Cyan) → Run `.\setup-codex.ps1`
3. **Both AIs now have full MCP access** and can communicate via files

## ✅ Expected Result

- Kimi can monitor and coordinate
- Codex can validate and query database via @supabase
- Both can read/write to `.codex/messages/` for collaboration
