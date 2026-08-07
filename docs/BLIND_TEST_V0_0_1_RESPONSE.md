# Blind Test v0.0.1 — Response & Resolution

This document addresses every finding from the v0.0.1 blind test where 10 real-world plugins were built with Agent Plugin Builder.

**Original result:** Builder-only: 0/10, Minor manual intervention: 0/10, Major manual intervention: 10/10.

**v0.0.2 result:** Builder-only: 10/10, Minor manual intervention: 0/10, Major manual intervention: 0/10.

## Findings Resolution

| Finding | Status | Resolution |
|---|---|---|
| B-001 | FIXED | Published `agent-plugin-builder` to npm. `bunx agent-plugin-builder --help` and `npx agent-plugin-builder --help` both work. |
| B-002 | FIXED | Complete MCP authoring: `--mcp-name`, `--mcp-args`, `--mcp-env`, `--mcp-cwd` flags plus declarative `plugin.yml` with named server map. |
| B-003 | FIXED | Full manifest metadata exposed: `--version`, `--author-name`, `--author-email`, `--author-url`, `--homepage`, `--repository`, `--license`, `--keywords`. All plugin.json fields accessible. |
| B-004 | FIXED | Real skill authoring with body files (`--skill-body-file`), multiple skills (`--skill` repeatable), and proper descriptions. No more "This is a skill." filler. |
| B-005 | FIXED | Proper YAML serialization using the `yaml` library. Frontmatter is valid YAML with correct quoting, multiline support, and deterministic output. |
| B-006 | FIXED | Removed skills-only XOR mcp-only split. Combined plugins (skills + MCP) are the default. Declarative config naturally expresses both. |
| B-007 | FIXED | `package` command now produces real archives: `--format zip` (default), `--format tar.gz`, or `--format dir`. Uses `archiver` library. |
| B-008 | FIXED | Skills now accept body content from files (`--skill-body-file`) or inline (`--skill-description` + template). Declarative config supports `body` and `body-file` fields. |
| B-009 | FIXED | MCP server names preserved through the entire pipeline: config → PortablePlugin → generator → mcp.json. No more `server-1`, `server-2` defaults. |
| B-010 | FIXED | Interactive `init` is now a full wizard: name, description, version, author, license, skills loop, MCP loop, README/LICENSE generation, preview, confirmation. |
| B-011 | FIXED | MCP args, env, and cwd fully supported via CLI flags and declarative config. `${PLUGIN_ROOT}` and `${PLUGIN_DATA}` placeholders preserved as literals. |

## Additional Improvements in v0.0.2

- Declarative config file (`plugin.yml`) — the primary authoring interface
- README.md scaffold generation (`readme: true` in config)
- LICENSE file generation (`license-file: MIT` in config)
- Migration adapters now preserve MCP server names from source configs
- Proper YAML frontmatter for SKILL.md (not JSON-in-YAML)
- All 10 blind-test plugins rebuildable with zero manual editing

## Dogfood Result

All 10 plugins rebuilt from declarative configs:

| Plugin | Skills | MCP | Files | Builder-only |
|---|---|---|---|---|
| postgresql | 1 | 1 | 5 | ✅ |
| sqlite | 1 | 1 | 5 | ✅ |
| redis | 1 | 1 | 5 | ✅ |
| docker | 3 | 0 | 6 | ✅ |
| kubernetes | 3 | 0 | 6 | ✅ |
| ssh | 1 | 1 | 5 | ✅ |
| filesystem | 1 | 1 | 5 | ✅ |
| git | 2 | 1 | 6 | ✅ |
| rest-api | 1 | 1 | 5 | ✅ |
| openapi | 1 | 1 | 5 | ✅ |

Total: 53 files generated, 0 errors, all 10 pass validation.
