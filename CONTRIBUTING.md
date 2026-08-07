# Contributing to Agent Plugin Builder

Thank you for considering contributing. This document explains how to get started.

## Getting started locally

```bash
git clone https://github.com/HiAi-gg/agent-plugin-builder.git
cd agent-plugin-builder
bun install
```

Run the quality gates before submitting anything:

```bash
bun run lint
bun run typecheck
bun run test
```

## How to contribute

### Reporting bugs

Open an issue at [github.com/HiAi-gg/agent-plugin-builder/issues](https://github.com/HiAi-gg/agent-plugin-builder/issues) and include:

- Agent Plugin Builder version (run `agent-plugin --version`)
- Operating system and Bun version
- Minimal reproduction steps or fixture
- Command used and redacted output

### Requesting features

Open an issue describing the use case. For new migration sources, include a link to the source format documentation.

### Submitting changes

1. Fork the repository.
2. Create a branch from `main`.
3. Make small, coherent changes. No unrelated refactors.
4. Add or update tests for changed behavior.
5. Update documentation when public behavior changes:
   - New CLI flag → README + `--help`
   - New migration adapter → `docs/MIGRATION_SOURCES.md` + `docs/COMPATIBILITY.md`
   - New spec version → `docs/AGENT_PLUGINS_SPEC_SUPPORT.md`
   - Breaking change → `CHANGELOG.md`
6. Run `bun run lint`, `bun run typecheck`, and `bun run test`. All must pass.
7. Open a pull request and describe what changed, why, and how it was tested.

## Adding a migration adapter

New source adapters go in `packages/sources/src/<source-name>/index.ts`.

Each adapter must export:
- `detect<Source>Project(rootPath: string): boolean`
- `migrate<Source>Project(rootPath: string): Promise<<Source>AdapterResult>`

Test your adapter against real fixture data in `packages/sources/tests/fixtures/<source-name>/`.

## Code style

- TypeScript strict mode.
- 2-space indentation, LF line endings.
- No `any` in new code unless unavoidable.
- Prefer `bun:test` over external test frameworks.

## Standards changes

If your change depends on Agent Plugins specification behavior, cite the primary source:

- [Agent Plugins specification](https://agent-plugins.org/)
- [Agent Plugins JSON schemas](https://agent-plugins.org/schemas/1.0.0/)
- [Agent Skills specification](https://agentskills.io/specification)

Do not implement behavior based on third-party blog posts or assumptions.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
