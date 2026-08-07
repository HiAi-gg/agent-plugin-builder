---
name: "build-agent-plugin"
description: "Create, migrate, package, and inspect Agent Plugins for modern AI agents"
---

# Build Agent Plugin

Use this skill to create, migrate, package, and inspect Agent Plugins.

## When to Use

Use this skill when you need to:
- Create a new Agent Plugin from scratch
- Migrate from Claude Code, Cursor, Codex, OpenCode, or VS Code
- Validate and package an existing plugin
- Inspect a plugin's structure

## Commands

### Create a new plugin

```bash
# Interactive
bun packages/cli/bin/agent-plugin init

# From flags
bun packages/cli/bin/agent-plugin create --name my-plugin --skills-only
```

### Migrate from existing setup

```bash
# Auto-detect source format
bun packages/cli/bin/agent-plugin migrate ./my-project

# Specify source format
bun packages/cli/bin/agent-plugin migrate ./my-project --from claude
```

### Validate and package

```bash
bun packages/cli/bin/agent-plugin package ./my-plugin
```

### Inspect a plugin

```bash
bun packages/cli/bin/agent-plugin inspect ./my-plugin
```

## Examples

### Create a skills-only plugin

```bash
bun packages/cli/bin/agent-plugin create \
  --name my-skills \
  --skills-only \
  --output ./my-skills-plugin
```

### Migrate from Claude Code

```bash
bun packages/cli/bin/agent-plugin migrate \
  ./my-claude-project \
  --from claude \
  --output ./my-agent-plugin
```

### Validate a plugin

```bash
bun packages/cli/bin/agent-plugin package ./my-plugin --dry-run
```

## Output Structure

Generated plugins follow this structure:

```
my-plugin/
├── plugin.json
├── skills/
│   └── skill-name/
│       └── SKILL.md
└── mcp.json (optional)
```

## Migration Report

When migrating, the tool reports:
- ✓ Portable components (migrated)
- ⚠ Client-specific components (not migrated)
- ✗ Unsupported components (not migrated)
