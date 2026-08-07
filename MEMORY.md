# MEMORY.md

## Discovered Knowledge

- **Bun workspace symlinks (v1.3.x):** `bun install` only creates `node_modules/@agent-plugin-builder/*` symlinks at the repo root when the root `package.json` declares the workspace packages as dependencies (`"workspace:*"`). Without root-level references, bun links workspace packages only in the nested `node_modules` of packages that depend on them — so code at the repo root (e.g. `tests/`) cannot resolve `@agent-plugin-builder/*` and fails with `Cannot find module`. Fix: list all workspace packages as root `devDependencies` with `"workspace:*"`.

## Gotchas

- CI (GitHub Actions) runs `bun install --frozen-lockfile`; any fix to module resolution must work from a completely fresh `node_modules` state, not rely on pre-existing symlinks.
- The `main`/`types` fields already point at `./src/index.ts` in all four packages; those were not the cause of the CI failure.
