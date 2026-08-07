# Migration Sources

## Claude Code

**Detection**: `CLAUDE.md` or `.claude/` directory

**Portable**:
- `CLAUDE.md` → instructions
- `.claude/skills/*/SKILL.md` → skills
- `.mcp.json` → MCP servers

**Client-Specific** (not migrated):
- `.claude/settings.json` (hooks, permissions)
- `.claude/rules/*.md` (glob-gated rules)

**Unsupported**:
- `.claude/agents/*.md` (subagents)

## Cursor

**Detection**: `.cursor/` directory

**Portable**:
- `.cursor/skills/*/SKILL.md` → skills
- `.cursor/mcp.json` → MCP servers

**Client-Specific**:
- `.cursor/rules/*.mdc` (glob-gated rules)
- `.cursor/hooks.json` (hooks)

**Unsupported**:
- `.cursor/agents/*.md` (custom agents)

## Codex

**Detection**: `AGENTS.md` or `config.toml`

**Portable**:
- `AGENTS.md` → instructions
- `config.toml` [mcp_servers] → MCP servers

**Client-Specific**:
- `hooks.json` (hooks)

## OpenCode

**Detection**: `AGENTS.md`, `opencode.json`, or `.opencode/`

**Portable**:
- `AGENTS.md` → instructions
- `.opencode/skills/*/SKILL.md` → skills
- `opencode.json` mcp section → MCP servers

**Client-Specific**:
- `.opencode/plugins/*.ts` (plugin-based hooks)

**Unsupported**:
- `.opencode/agents/*.md` (custom agents)

## VS Code/Copilot

**Detection**: `.github/` or `.vscode/` directory

**Portable**:
- `.github/copilot-instructions.md` → instructions
- `AGENTS.md` → instructions
- `.github/skills/*/SKILL.md` → skills
- `.vscode/mcp.json` → MCP servers (remaps `servers` → `mcpServers`)

**Unsupported**:
- `.github/agents/*.md` (custom agents)
