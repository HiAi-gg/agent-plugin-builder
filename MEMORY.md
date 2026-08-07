# MEMORY.md

## Discovered Knowledge

- **Bun workspace symlinks (v1.3.x):** `bun install` only creates `node_modules/@agent-plugin-builder/*` symlinks at the repo root when the root `package.json` declares the workspace packages as dependencies (`"workspace:*"`). Without root-level references, bun links workspace packages only in the nested `node_modules` of packages that depend on them — so code at the repo root (e.g. `tests/`) cannot resolve `@agent-plugin-builder/*` and fails with `Cannot find module`. Fix: list all workspace packages as root `devDependencies` with `"workspace:*"`.

## Gotchas

- CI (GitHub Actions) runs `bun install --frozen-lockfile`; any fix to module resolution must work from a completely fresh `node_modules` state, not rely on pre-existing symlinks.
- The `main`/`types` fields already point at `./src/index.ts` in all four packages; those were not the cause of the CI failure.

## Discovered Knowledge

- **npm publishing (packages/npm):** The publishable `agent-plugin-builder` package bundles the whole CLI (114 modules incl. `prompts`, `commander`, `chalk`) into one file via `bun build ../cli/src/index.ts --outdir ./dist --target node`. No `--external` needed — bun bundles CJS deps like `prompts` fine for the node target. Two traps solved:
  - `bun build --target node` emits **ESM** (`export { run }`), so `packages/npm/package.json` MUST have `"type": "module"` or node dies on `Unexpected token 'export'`.
  - The CLI entry only `export`s `run()` (never auto-invokes), so the bin shim must call it: `import('../dist/index.js').then(({ run }) => run())`. A bare `import(...)` does nothing.
- **Version coupling:** `packages/cli/src/index.ts` hardcodes the CLI version for `--version`; the npm bundle is built from that source, so the version lives in two places (`packages/npm/package.json` + CLI source) and must be bumped in lockstep. Both are 0.0.2.
- **CI publish auth:** GitHub Actions `setup-bun` (unlike setup-node) does not create npm auth config. `NODE_AUTH_TOKEN` alone is not enough — `packages/npm/.npmrc` must contain `//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}`. npm excludes `.npmrc` from the published tarball automatically.

## Discovered Knowledge

- **Declarative config (Phases 2–8, v0.0.2):** `packages/core/src/config.ts` adds a `plugin.yml` schema (`pluginConfigSchema`) + `parseConfigFile`/`configToPortablePlugin`. Config file name can be `plugin.yml` or `agent-plugin.yml` — it is passed via `create --config <file>`.
- **MCP server names:** `PortableMcpServer` carries an optional `_name` field (underscore-prefixed = pipeline-internal, never serialized). The generator strips `_name` via `const { _name, ...serverData } = server` before writing mcp.json (the strict mcp schema would reject it). When `_name` is absent, the name is derived from the command basename or URL hostname (`deriveServerName`).
- **Commander `--version` trap:** `program.version('0.0.2')` registers a program-level `--version` option that greedily intercepts `create --version <version>` BEFORE subcommand dispatch (commander's `parseOptions` consumes options after operands on the parent). Fix: don't use `.version()`; handle top-level `--version`/`-V` manually in `run()` (`args.length === 1` check) so the subcommand flag is untouched.
- **Commander variadic options emit one value per event:** with `--mcp-args <args...>`, commander emits each value as a separate `string`, so the collector must be `(value, previous) => [...previous, value]` — spreading `value` (a string) splits it into characters.
- **LICENSE generation:** `packages/generator/src/licenses.ts` ships full text for MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause; unknown SPDX ids get a short notice referencing the id. README/LICENSE are emitted when `PortablePlugin._generateReadme` / `_licenseType` are set (or via `GeneratePluginOptions.generateReadme`/`licenseType`).

## Discovered Knowledge

- **init wizard (v0.0.2):** `init` builds a `PortablePlugin` via exported helpers (`buildPortablePlugin`, `defaultAnswers`, `parseCommaSeparated`, `parseEnvPairs`, `defaultSkillBody`) and calls `generatePlugin()` — the same API as `create`. Modes: `--config <file>` (parseConfigFile/configToPortablePlugin, no prompts), `--yes`/`--non-interactive`/`CI` (defaultAnswers: 1 example skill + README + LICENSE), else interactive `prompts` wizard with preview via `generatePlugin({ dryRun: true })`. `optsWithGlobals()` on the action's command param is the way to read program-level flags (`--force`, `--non-interactive`) from a subcommand — subcommand-level duplicate options are shadowed by the program's own option during the parse walk, so a sub-defined `--non-interactive` never lands in `options`. Plugin name validated with `NAME_PATTERN` from `@agent-plugin-builder/core` (spec/v1); skill names use the stricter `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$` (they become directory names).
- **Interactive PTY testing:** `prompts` needs a TTY; `printf '...' | script -qec "bun ..." /dev/null` works, but all input must be sent with `printf '%b'` (so `\r` is interpreted) and small sleeps between lines — an instant pipe burst concatenates everything into the first field (each char is a keypress; Enter-as-submit is lost in a burst).
