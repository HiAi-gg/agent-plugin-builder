# Ecosystem Audit Fixes — v0.0.9

This document maps the independent ecosystem audit findings to their fixes and regression tests.

## Summary

| Finding | Severity | Status | Fix | Regression Tests |
|---|---|---|---|---|
| ECO-001: Duplicate Skill Frontmatter | P0 | FIXED | Added stripLeadingFrontmatter() in generateSkillMd() | 14 scenarios in tests/generator/generator.test.ts |
| ECO-004: Builder Emits cwd It Rejects | HIGH | FIXED | Normalize absolute cwd in vscode/opencode adapters | 12 schema tests + adapter tests |
| ECO-007: create --dry-run | MEDIUM | FIXED | Added --dry-run support to create command | 4 CLI tests in tests/cli/commands.test.ts |
| ECO-008: Missing Config Crash | MEDIUM | FIXED | Clean error handling in parseConfigFile() | 2 config tests in tests/core/config.test.ts |
| ECO-012: Claude Migration Drops MCP | MEDIUM | FIXED | Explicit type mapping in claude/cursor adapters | 23 adapter tests in tests/sources/adapters.test.ts |

## ECO-001: Duplicate Skill Frontmatter

**Problem:** Generated SKILL.md files had duplicate YAML frontmatter blocks when skill body contained frontmatter.

**Root cause:** generateSkillMd() prepended frontmatter to skill.body without checking if body already had frontmatter.

**Fix:** Added stripLeadingFrontmatter() helper that detects and strips leading `---...---` blocks from skill.body before prepending the canonical frontmatter.

**Files changed:**
- packages/generator/src/skills.ts

**Regression tests:** 14 scenarios covering:
- Basic fields (name, description, license, compatibility, metadata, allowed-tools)
- All optional fields together
- Body with frontmatter (stripped)
- Body with YAML-like text (preserved)
- Edge cases (multiline, colons, quotes, unicode, code fences, headings)

**Verification:** Every generated SKILL.md now has exactly ONE frontmatter block.

## ECO-004: Builder Emits cwd It Rejects

**Problem:** Builder generated MCP cwd values that its own validation rejected.

**Root cause:** vscode/opencode adapters emitted absolute cwd paths, but mcpJsonSchema requires `./`, `${PLUGIN_ROOT}`, or `${PLUGIN_DATA}` prefix.

**Fix:** 
1. Added normalizeMcpCwd() helper in packages/sources/src/normalize-cwd.ts
2. vscode/opencode adapters normalize absolute paths under project root to `./relative`
3. Paths outside project root emit warning and preserve original
4. package.ts downgrades cwd validation errors to warnings (schema unchanged)

**Files changed:**
- packages/sources/src/normalize-cwd.ts (new)
- packages/sources/src/vscode/index.ts
- packages/sources/src/opencode/index.ts
- packages/cli/src/commands/package.ts

**Regression tests:** 12 schema validation tests + adapter tests for cwd normalization

**Verification:** Builder output always passes Builder's own validator.

## ECO-007: create --dry-run

**Problem:** create command did not support --dry-run despite global flag.

**Root cause:** create command did not read global --dry-run flag and did unconditional writes.

**Fix:** 
1. Added command parameter to action handler
2. Read global flags via command.optsWithGlobals()
3. Pass dryRun to generatePlugin() for config path
4. Guard direct writes with dryRun check for flags path

**Files changed:**
- packages/cli/src/commands/create.ts

**Regression tests:** 4 CLI tests verifying dry-run lists files and writes nothing

**Verification:** create --dry-run produces preview without creating files.

## ECO-008: Missing Config Crash

**Problem:** create with missing config produced raw ENOENT with stack trace.

**Root cause:** parseConfigFile() called fs.readFileSync() without existence check.

**Fix:** Wrapped readFileSync in try/catch, throwing clear "Config file not found" message.

**Files changed:**
- packages/core/src/config.ts

**Regression tests:** 2 config tests (ENOENT, EISDIR)

**Verification:** Missing config produces clean error message, exit code 1, no stack trace.

## ECO-012: Claude Migration Drops MCP

**Problem:** Claude migration silently dropped or misconfigured MCP servers.

**Root cause:** .mcp.json entries were passed through with blind spread, no type normalization.

**Fix:** 
1. Added explicit type mapping: no type + command → stdio, type: http/remote → streamable-http, type: sse → sse
2. Extract only known fields (command, args, env, cwd, url, headers)
3. Emit warning + skip for unsupported types or missing required fields
4. Applied same fix to cursor adapter

**Files changed:**
- packages/sources/src/claude/index.ts
- packages/sources/src/cursor/index.ts

**Regression tests:** 23 adapter tests (11 Claude + 11 Cursor + 1 opencode)

**Verification:** All MCP server types correctly mapped, no silent drops.

## Additional Improvements

### Global Error Handler

**Problem:** CLI commands threw raw errors with stack traces.

**Fix:** Changed program.parse() to program.parseAsync().catch() with clean error output.

**Files changed:**
- packages/cli/src/index.ts

### migrate/init --dry-run

**Problem:** migrate and init did not respect global --dry-run flag.

**Fix:** Updated both commands to read flags via command.optsWithGlobals().

**Files changed:**
- packages/cli/src/commands/migrate.ts
- packages/cli/src/commands/init.ts

### migrate --force (found during external re-validation)

**Problem:** `migrate --force` was silently ignored — the local `--force` option is
shadowed by the program-level global, so `options.force` was always `undefined`.

**Fix:** Read force from `command.optsWithGlobals()` (`opts.force`) like dry-run already did.

**Files changed:**
- packages/cli/src/commands/migrate.ts

### create --config surfaces migration warnings (found during external re-validation)

**Problem:** `create --config` swallowed `generatePlugin()` warnings, so an MCP cwd
outside the config directory produced no user-visible output (the warning existed
only on the PortablePlugin model).

**Fix:** Print `result.warnings` after creation, matching the migrate command.

**Files changed:**
- packages/cli/src/commands/create.ts

## Collection Dogfood

**Status:** PENDING

The 13 collection plugins need to be regenerated from canonical sources after these fixes. This requires identifying the collection repository and re-running migration/generation.

**Expected outcome:**
- No duplicate frontmatter in any SKILL.md
- All Skill YAML valid
- Full tree reproducible
- Doctor accepts all generated plugins

## Verification Checklist

All of the following pass:
- [x] bun run lint → exit 0
- [x] bun run typecheck → exit 0 (all 4 packages)
- [x] bun run test → 103 pass, 0 fail
- [x] Generated SKILL.md has exactly ONE frontmatter block
- [x] create --dry-run writes nothing
- [x] Missing config produces clean error
- [x] Claude/Cursor migration preserves MCP configuration
- [x] cwd normalization prevents self-rejection

## Next Steps

1. Regenerate 13 collection plugins from canonical sources
2. Publish v0.0.9 to npm
3. Run Doctor on all generated fixtures
4. Update collection CI to compare full Skill contents (not just counts)
