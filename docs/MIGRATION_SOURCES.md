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

### MCP Server Type Mapping

Claude's `.mcp.json` uses various type conventions. Builder normalizes these to Agent Plugins types:

| Claude Type | Portable Type | Notes |
|---|---|---|
| (no type) + command | stdio | Default when command present |
| `stdio` | stdio | Explicit stdio |
| `local` | stdio | Claude Code legacy |
| `http` | streamable-http | Remote HTTP |
| `streamable-http` | streamable-http | Standard remote |
| `remote` | streamable-http | Claude Code legacy |
| `sse` | sse | Server-Sent Events |
| (unknown) | (skipped) | Warning emitted |

If an MCP server entry cannot be migrated (unknown type or missing required fields), Builder emits a warning and skips the entry. No configuration is silently lost.

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

### MCP Server Type Mapping

Cursor's `.cursor/mcp.json` uses the same type conventions as Claude. Builder applies identical mapping logic:

| Cursor Type | Portable Type | Notes |
|---|---|---|
| (no type) + command | stdio | Default when command present |
| `stdio` | stdio | Explicit stdio |
| `local` | stdio | Legacy |
| `http` | streamable-http | Remote HTTP |
| `streamable-http` | streamable-http | Standard remote |
| `remote` | streamable-http | Legacy |
| `sse` | sse | Server-Sent Events |
| (unknown) | (skipped) | Warning emitted |

If an MCP server entry cannot be migrated (unknown type or missing required fields), Builder emits a warning and skips the entry. No configuration is silently lost.

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

## Working Directory (cwd) Normalization

When migrating from VS Code or OpenCode configurations with absolute `cwd` paths:

- If the absolute path is **under the project root**: normalized to `./relative/path`
- If the absolute path is **outside the project root**: preserved as-is with a warning
- Valid portable values (`./`, `${PLUGIN_ROOT}`, `${PLUGIN_DATA}`) are preserved unchanged

This ensures generated mcp.json always passes Builder's own validation while warning about non-portable configurations.
