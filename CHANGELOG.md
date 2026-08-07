# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] — 2026-08-07

### Added

- **CLI**: `agent-plugin` command with five subcommands:
  - `init` — interactive plugin creation
  - `create` — flag-driven plugin creation (skills-only, MCP-only, or combined)
  - `migrate` — convert from Claude Code, Cursor, Codex, OpenCode, or VS Code/Copilot
  - `inspect` — display plugin structure and metadata
  - `package` — validate and package a plugin directory
- **Migration adapters** for five source formats:
  - Claude Code (CLAUDE.md, .claude/skills/, .mcp.json)
  - Cursor (.cursor/rules/, .cursor/skills/, .cursor/mcp.json)
  - Codex (AGENTS.md, config.toml with TOML MCP servers)
  - OpenCode (AGENTS.md, .opencode/skills/, opencode.json)
  - VS Code/Copilot (.github/copilot-instructions.md, .vscode/mcp.json with `servers` → `mcpServers` remap)
- **Core**: Canonical intermediate model (`PortablePlugin`), Zod schemas matching Agent Plugins v1.0.0 official JSON Schemas, spec version layer, path containment, environment variable expansion
- **Generator**: Deterministic filesystem emission of plugin.json, mcp.json, skills/, and extensions/
- **Safety**: `--dry-run` mode on all write commands, overwrite protection with `--force` bypass, credential detection in migrated configs
- **Spec compliance**: Targets Agent Plugins v1.0.0 (Working Draft)
- **Self-hosting**: Project is itself a valid Agent Plugin (`plugin.json` + `skills/build-agent-plugin/SKILL.md`)
- **Documentation**: README, ARCHITECTURE.md, MIGRATION_SOURCES.md, AGENT_PLUGINS_SPEC_SUPPORT.md
- **CI**: GitHub Actions workflow testing on Linux, macOS, and Windows

[0.0.1]: https://github.com/HiAi-gg/agent-plugin-builder/releases/tag/v0.0.1
