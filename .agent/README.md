# .agent Directory - AI Agent Configuration

This directory contains configuration files and workflows for AI agent assistance.

## Files

### `rules.md` ✅
**Comprehensive AI agent rules** covering:
- Project identity and context
- Core principles (enterprise-first, security, bilingual, no mock data)
- Technical standards (database, TypeScript, React, i18n)
- Feature-specific rules
- Workflow & process rules
- Quality checklist
- Prohibited practices
- KSA-specific considerations

**Status**: Integrated and active (automatically picked up by AI agent)

### `MEMORY.md`
**Project memory reference** providing quick access to:
- Links to comprehensive rules
- Critical rule highlights
- Recent audit findings
- Active workflows
- Tech stack summary
- Architecture overview

### `workflows/`
Custom workflows for common operations:
- `autopush.md` - Automated git staging, commit, and push
- `database-changes.md` - Safety checklist for schema modifications

## How AI Agent Rule Integration Works

1. **Automatic Discovery**: AI agents automatically read files in the `.agent/` directory
2. **rules.md**: Contains comprehensive project-specific guidelines (323 lines)
3. **MEMORY.md**: Quick reference and context for the AI agent
4. **workflows/**: Executable workflows triggered by `/command` syntax

## Usage

The AI agent will:
- ✅ Follow all principles and standards defined in `rules.md`
- ✅ Reference MEMORY.md for quick context
- ✅ Execute workflows when triggered by commands like `/database-changes`
- ✅ Maintain consistency with established patterns
- ✅ Enforce quality standards and prohibited practices

## Integration Status

| File | Status | Lines | Purpose |
|------|--------|-------|---------|
| `rules.md` | ✅ Active | 323 | Comprehensive project rules |
| `MEMORY.md` | ✅ Active | ~100 | Quick reference context |
| `workflows/autopush.md` | ✅ Active | - | Git automation |
| `workflows/database-changes.md` | ✅ Active | - | Schema safety checklist |

**All configurations are integrated and active.** The AI agent will automatically apply these rules in all interactions.
