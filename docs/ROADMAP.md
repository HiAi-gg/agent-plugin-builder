# Roadmap

## Now

- Stabilize the v0.1.x CLI interface and migration adapters.
- Improve error messages with diagnostic codes and suggested fixes.
- Add conformance testing against official Agent Plugins JSON Schemas.

## Next

- Add a `doctor` subcommand for basic plugin health checks (not a replacement for the separate Agent Plugin Doctor project).
- Support additional migration sources as formats stabilize.
- Add `--watch` mode for iterative plugin development.
- Publish to npm with a proper build pipeline.

## Later

- Support future Agent Plugins specification versions (v2+) when released.
- Add AI-assisted skill description generation (optional, not required).
- Build a visual plugin inspector for terminal or web.

## Not planned

- Marketplace or registry (out of scope for Builder).
- Full validation and security auditing (use [Agent Plugin Doctor](https://github.com/HiAi-gg/agent-plugin-doctor) when available).
- Frontend or GUI application.

Items on this roadmap are intentions, not commitments. Priorities may change based on ecosystem evolution and user feedback.
