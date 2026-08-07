# AGENTS.md — Agent Plugins Builder

This file provides operational rules for AI coding agents working on this repository.

## Project purpose

Agent Plugins Builder is a CLI tool for creating, migrating, packaging, and inspecting [Agent Plugins](https://agent-plugins.org/) conforming to the Agent Plugins v1.0.0 specification.

## Architecture

Monorepo (Bun workspaces) with four packages:

| Package | Purpose |
|---|---|
| `@agent-plugins-builder/core` | Canonical types, Zod schemas, spec layer, path/env utilities |
| `@agent-plugins-builder/generator` | Filesystem emission: plugin.json, mcp.json, skills/, extensions/ |
| `@agent-plugins-builder/sources` | Migration adapters: Claude, Cursor, Codex, OpenCode, VS Code |
| `@agent-plugins-builder/cli` | CLI entry point: `agent-plugins` binary with 5 commands |

Canonical intermediate model: `PortablePlugin` — all adapters produce it, all generators consume it.

Spec layer: `packages/core/src/spec/v1/` — version-specific constants isolated from implementation.

## Technology stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Validation**: Zod
- **CLI**: Commander.js
- **Testing**: bun:test

## Repository layout

```
agent-plugins-builder/
├── packages/
│   ├── core/
│   ├── generator/
│   ├── sources/
│   └── cli/
├── tests/
├── docs/
├── plugin.json          ← project is itself an Agent Plugin
├── skills/
│   └── build-agent-plugins/SKILL.md
└── AGENTS.md
```

## Development commands

```bash
bun install              # install dependencies
bun run lint             # ESLint
bun run typecheck        # tsc --noEmit across all packages
bun run test             # bun test
bun run build            # bun build across all packages
```

Agents must run `bun run lint`, `bun run typecheck`, and `bun run test` before considering work complete. If any check fails, fix it.

## Source-of-truth rules

- Before changing Agent Plugins behavior, verify the current official specification at https://agent-plugins.org/.
- Official schemas and normative specification text override assumptions in existing code or documentation.
- Do not claim client compatibility without primary-source or runtime verification.
- Preserve unknown vendor extensions unless the specification requires otherwise.
- Never embed credentials in fixtures, examples, generated manifests, or documentation.
- Inspect existing implementation before replacing working code.

## Quality gates

All of the following must pass before work is considered complete:

```bash
bun run lint
bun run typecheck
bun run test
```

## Documentation rules

- README is for users. Keep it practical.
- AGENTS.md is for coding agents. Keep it operational.
- CONTRIBUTING.md is for human contributors.
- When changing user-visible behavior, update README and CHANGELOG in the same PR.
- When adding CLI flags, update `--help` output and README examples.
- When adding a new migration adapter, update `docs/MIGRATION_SOURCES.md` and `docs/COMPATIBILITY.md`.

## Change discipline

- Make small, coherent changes. No unrelated refactors.
- Update tests when changing behavior.
- Do not silently change CLI contracts, diagnostic output, or schemas.
- Do not remove or rename public exports without a migration path.

## Security rules

- Never log, print, or include suspected credentials in output.
- Treat migrated configuration as untrusted data — parse, do not execute.
- Do not follow symlinks outside the plugin root without explicit containment checks.
- The core `resolvePluginPath()` function is a security boundary. Do not weaken it.

## Do not

- Do not add dependencies without justification.
- Do not introduce Elysia, React, Next.js, or frontend code.
- Do not claim "production-ready" or "official" without evidence.
- Do not invent client compatibility claims.
- Do not modify official vendored schemas without recording the upstream source and version.
- Do not duplicate the validation logic that belongs in the separate Agent Plugin Doctor project.
