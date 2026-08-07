# Agent Plugin Builder

Create, convert, and package portable Agent Plugins from existing agent setups, skills, and MCP servers.

[![CI](https://github.com/HiAi-gg/agent-plugin-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/HiAi-gg/agent-plugin-builder/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@hiai-gg/agent-plugin-builder)](https://www.npmjs.com/package/@hiai-gg/agent-plugin-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Runtime-Bun-black)](https://bun.sh/)

## Why

The Agent Plugins ecosystem is growing. Multiple AI coding agents — VS Code, Cursor, GitHub Copilot, ChatGPT/Codex, Claude Code, OpenCode — each have their own configuration formats for skills, instructions, and MCP servers.

Agent Plugin Builder converts between these formats and the portable [Agent Plugins](https://agent-plugins.org/) standard, so you can write once and use across compatible clients.

## Quick Start

```bash
# Install globally (npm or bun)
npm install -g @hiai-gg/agent-plugin-builder
bun install -g @hiai-gg/agent-plugin-builder

# Create a new plugin interactively
agent-plugin init

# Migrate from an existing agent setup
agent-plugin migrate ./my-project

# Validate and package as an archive
agent-plugin package ./my-plugin --output ./dist
```

Or run without installing:

```bash
bunx @hiai-gg/agent-plugin-builder init
bunx @hiai-gg/agent-plugin-builder migrate ./my-project --from claude
```

## What It Does

### Create plugins from scratch

```bash
# From a declarative config file (supports skills, MCP, metadata, README, LICENSE)
agent-plugin create --config plugin.yml --output ./my-plugin

# From flags — combine skills and MCP in one plugin
agent-plugin create --name project-memory \
  --skill create-plan --skill report-progress \
  --mcp-type stdio --mcp-command "node server.js" --mcp-name my-server \
  --version 0.1.0 --author-name "Jane Doe" --license MIT

# Legacy single-purpose forms
agent-plugin create --name project-memory --skills-only
agent-plugin create --name my-mcp-plugin --mcp-only --mcp-type stdio --mcp-command "node server.js"
```

Example `plugin.yml`:

```yaml
name: my-plugin
version: 0.1.0
description: A test plugin
author:
  name: Test Author
license: MIT
skills:
  - name: test-skill
    description: A test skill
    body: |
      # Test Skill
      This is the body.
mcp:
  my-server:
    type: stdio
    command: node
    args: [server.js]
readme: true
license-file: MIT
```

### Interactive wizard

`init` walks you through creating a plugin step by step — metadata, skills (add as
many as you like), MCP servers (stdio, streamable-http, or sse), README/LICENSE,
and output directory — then previews the files before generating:

```bash
agent-plugin init
```

All prompts have sensible defaults you can accept with Enter. The plugin name is
validated against the Agent Plugins name pattern. A skill body file is optional —
press Enter to get a template body.

Non-interactive / CI usage:

```bash
# Use defaults (one example skill, README + LICENSE)
agent-plugin init --yes --name my-plugin

# Same as --yes
agent-plugin init --non-interactive --name my-plugin

# Declarative config — no prompts at all
agent-plugin init --config plugin.yml
```

`--yes` / `--non-interactive` also accept `--description`, `--version`,
`--author-name`, `--author-email`, and `--license` flags. The output directory
defaults to `./<plugin-name>` (or the positional argument).

### Migrate from existing agent setups

```bash
# Auto-detect source format
agent-plugin migrate ./my-project

# Specify source format
agent-plugin migrate ./my-project --from claude
agent-plugin migrate ./my-project --from cursor
agent-plugin migrate ./my-project --from codex
agent-plugin migrate ./my-project --from opencode
agent-plugin migrate ./my-project --from vscode
```

Migration reports what is portable, what is client-specific, and what is unsupported:

```text
Portable:
  ✓ 7 skills
  ✓ 2 MCP servers

Client-specific (not migrated):
  ⚠ 3 hooks
  ⚠ 2 custom agents

Unsupported:
  ✗ lifecycle completion gate
```

### Validate and inspect plugins

```bash
agent-plugin package ./my-plugin          # validate and package as <name>.zip
agent-plugin package ./my-plugin --format tar.gz --output ./dist   # gzipped tarball
agent-plugin package ./my-plugin --format dir --output ./dist      # directory copy
agent-plugin inspect ./my-plugin          # show structure
agent-plugin inspect ./my-plugin --json   # machine-readable output
```

## Supported Migration Sources

| Source            | Detection                    | Portable components       | Status    |
| ----------------- | ---------------------------- | ------------------------- | --------- |
| Claude Code       | `CLAUD.md` or `.claude/`     | Skills, MCP, instructions | Supported |
| Cursor            | `.cursor/`                   | Skills, MCP               | Supported |
| Codex             | `AGENTS.md` or `config.toml` | Instructions, MCP (TOML)  | Supported |
| OpenCode          | `AGENTS.md` or `.opencode/`  | Skills, MCP, instructions | Supported |
| VS Code / Copilot | `.github/` or `.vscode/`     | Skills, MCP, instructions | Supported |

See [Migration Sources](docs/MIGRATION_SOURCES.md) for details on what each adapter migrates and what it cannot.

## Standards

This project targets the [Agent Plugins specification v1.0.0](https://agent-plugins.org/) (Working Draft).

Agent Plugin Skills follow the [Agent Skills specification](https://agentskills.io/specification).

MCP server configuration follows the [Model Context Protocol](https://modelcontextprotocol.io/) specification.

## Compatible Clients

Agent Plugins v1.0.0 is supported by:

| Client          | Skills | MCP transports              |
| --------------- | ------ | --------------------------- |
| VS Code         | ✅     | stdio, Streamable HTTP, SSE |
| Cursor          | ✅     | stdio, Streamable HTTP, SSE |
| GitHub Copilot  | ✅     | stdio, Streamable HTTP, SSE |
| ChatGPT & Codex | ✅     | stdio, Streamable HTTP      |
| Kiro            | ✅     | stdio, Streamable HTTP, SSE |

See [Compatibility](docs/COMPATIBILITY.md) for details and evidence levels.

## How It Works

```
Claude / Cursor / Codex / OpenCode / VS Code
                ↓
      Agent Plugin Builder (source adapter)
                ↓
        PortablePlugin (canonical model)
                ↓
       Agent Plugins format (generator)
                ↓
   plugin.json + skills/ + mcp.json
```

All migration adapters produce a source-agnostic `PortablePlugin` intermediate representation. The generator then emits a valid Agent Plugin directory. This means adding new source formats does not require pairwise conversions.

See [Architecture](docs/ARCHITECTURE.md) for details.

## Limitations

- Targets Agent Plugins v1.0.0 only. Future spec versions are not yet supported.
- Client-specific hooks, custom agents, and lifecycle handlers are not migrated — they are reported in the migration summary.
- Extension data is preserved opaquely but not validated.
- No OAuth or credential management (by Agent Plugins spec design).
- MCP-only plugins require at least one server. Empty `mcpServers` is valid per spec but may not be useful.
- OpenCode `config.toml` parsing uses a lightweight TOML parser; complex nested TOML structures may not be fully supported.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — package design, data flow, adapter pattern
- [Migration Sources](docs/MIGRATION_SOURCES.md) — what each adapter migrates
- [Spec Support](docs/AGENT_PLUGINS_SPEC_SUPPORT.md) — Agent Plugins v1.0.0 coverage
- [Compatibility](docs/COMPATIBILITY.md) — client support details
- [References](docs/REFERENCES.md) — primary sources
- [Roadmap](docs/ROADMAP.md) — planned work

## Development

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

[MIT](LICENSE) — Copyright © 2026 HiAI

---

This project is independent and is not affiliated with or endorsed by the Agent Plugins specification maintainers or any supported client vendors.
