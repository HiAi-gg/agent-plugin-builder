# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.5] — 2026-08-07

### Fixed

- OIDC trusted publishing configuration for npm registry releases

## [0.0.4] — 2026-08-07

### Fixed

- OIDC trusted publishing configuration for npm registry releases

## [0.0.3] — 2026-08-07

### Fixed

- CLI `--version` flag now reports correct version (was hardcoded to 0.0.2)
- Root `package.json` and `plugin.json` version synced with published package version

### Changed

- Bumped all package versions to 0.0.3 for consistency across monorepo

## [0.0.2] — 2026-08-07

### Added

- **Declarative config system**: `plugin.yml` / `agent-plugin.yml` — full authoring via config file
- **Named MCP servers**: Server names preserved through the entire pipeline (config → generator → mcp.json)
- **Complete MCP authoring**: `--mcp-name`, `--mcp-args`, `--mcp-env`, `--mcp-cwd` flags
- **Multiple skills**: `--skill` (repeatable), `--skill-body-file`, `--skill-description`
- **Combined plugins**: Skills + MCP in a single authoring flow (removed XOR split)
- **Full manifest metadata**: `--version`, `--author-*`, `--homepage`, `--repository`, `--license`, `--keywords`
- **README scaffold**: Generated with skills, MCP servers, license sections
- **LICENSE generation**: MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause
- **Real package artifacts**: `package --format zip` (default), `--format tar.gz`, `--format dir`
- **Improved interactive init**: Full wizard with skills loop, MCP loop, preview, confirmation
- **YAML serialization**: Proper YAML frontmatter for SKILL.md (not JSON-in-YAML)
- **npm distribution**: `bunx @hiai-gg/agent-plugin-builder` and `npx @hiai-gg/agent-plugin-builder` work
- **CI**: Release job builds and publishes `packages/npm` to the npm registry on version tags

### Fixed

- MCP server names no longer default to `server-1`, `server-2`
- Skill frontmatter is valid YAML (not JSON-in-YAML)
- Removed artificial skills-only XOR mcp-only split
- Interactive init no longer produces hardcoded placeholder content
- Global `--dry-run` and `--force` flags now work correctly on all commands

### Changed

- `init` command rewritten as a full interactive wizard
- `create` command supports `--config <file>` for declarative authoring
- `package` command produces zip/tar.gz archives by default
- All migration adapters preserve MCP server names from source configs

### Dogfood

- 10/10 blind-test plugins (PostgreSQL, SQLite, Redis, Docker, Kubernetes, SSH, Filesystem, Git, REST API, OpenAPI) now buildable with zero manual editing

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

[0.0.5]: https://github.com/HiAi-gg/agent-plugin-builder/releases/tag/v0.0.5
[0.0.4]: https://github.com/HiAi-gg/agent-plugin-builder/releases/tag/v0.0.4
[0.0.3]: https://github.com/HiAi-gg/agent-plugin-builder/releases/tag/v0.0.3
[0.0.2]: https://github.com/HiAi-gg/agent-plugin-builder/releases/tag/v0.0.2
[0.0.1]: https://github.com/HiAi-gg/agent-plugin-builder/releases/tag/v0.0.1
