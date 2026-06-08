# 🤖🤖 LIVE AI COLLABORATION - TERMINAL GUIDE

## Two Terminals Opened:

### Terminal 1 (Magenta): 🤖 KIMI - That's me monitoring
### Terminal 2 (Cyan): 🤖 CODEX - Where Codex CLI will run

---

## 🎬 How to Start the Live Collaboration

### Step 1: Go to Terminal 2 (Cyan - Codex)

### Step 2: Run Codex with MCP
```bash
codex --mcp-config .codex/mcp.json
```

### Step 3: When Codex loads, paste this prompt:

```
You are reviewing the Prime Hotels Intranet system.

MISSION: Validate the system after Kimi's fixes.

Kimi fixed:
1. Derived state anti-pattern in src/components/common/CommandPalette.tsx
2. Removed unused imports

YOUR TASKS:
1. Run: npx tsc --noEmit
2. Run: npm run build  
3. Run: npx eslint src/components/common/CommandPalette.tsx
4. Use MCP: @supabase List all tables
5. Review the fix in CommandPalette.tsx
6. Report results

EXPECTED: All checks should pass.
```

### Step 4: Watch Codex Work!

You'll see Codex:
- ✅ Run TypeScript check
- ✅ Run build
- ✅ Run lint
- ✅ Query Supabase via MCP
- ✅ Write findings to .codex/messages/codex-to-kimi.md

---

## 📺 What You'll See

```
╭────────────────────────────────────────────────────╮
│  🤖 CODEX CLI (Terminal 2 - Cyan)                 │
│                                                    │
│  > npx tsc --noEmit                                │
│  ✅ No errors                                       │
│                                                    │
│  > npm run build                                   │
│  ✅ Build successful                                │
│                                                    │
│  @supabase List all tables                         │
│  ✅ Found 47 tables                                 │
│                                                    │
│  Writing to .codex/messages/codex-to-kimi.md...    │
│  ✅ Done!                                           │
╰────────────────────────────────────────────────────╯

╭────────────────────────────────────────────────────╮
│  🤖 KIMI (Terminal 1 - Magenta)                   │
│                                                    │
│  Monitoring Codex progress...                      │
│                                                    │
│  ✅ TypeScript check passed                        │
│  ✅ Build passed                                   │
│  ✅ Awaiting Codex report...                       │
│                                                    │
│  Reading codex-to-kimi.md...                       │
│  🎉 SYSTEM POLISHED!                               │
╰────────────────────────────────────────────────────╯
```

---

## 🚀 Quick Start Commands

If the terminals are ready, just copy-paste these:

### In Terminal 2 (Codex):
```bash
cd "c:\Users\mahro\Desktop\prime-hotels-intranet-master"
codex --mcp-config .codex/mcp.json
```

### Then type to Codex:
```
Review the Prime Hotels Intranet. Read .codex/messages/kimi-to-codex.md 
and run all validations using both shell commands and MCP tools.
Write your findings to .codex/messages/codex-to-kimi.md
```

---

## 🎉 Enjoy the Show!

Watch two AI agents collaborate in real-time! 
